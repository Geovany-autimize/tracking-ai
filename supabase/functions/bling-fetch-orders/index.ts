import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

// Rate limiting helper - wait between API calls
const DELAY_BETWEEN_REQUESTS = 0;
const MAX_RETRIES = 3;

const normalize = (value?: string) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const ALLOWED_STATUSES = new Set(['em aberto', 'em andamento', 'em producao']);
const ALLOWED_STATUS_IDS = [6, 9, 12];
const MAX_PAGES = 25;
const MAX_CONCURRENT_REQUESTS = 6;
const BLING_BASE_ENDPOINT = 'https://api.bling.com.br/Api/v3/pedidos/vendas?pagina=';
const BLING_QUERY_SUFFIX = '&limite=100&idsSituacoes%5B%5D=6&idsSituacoes%5B%5D=9&idsSituacoes%5B%5D=12';

interface BlingStatusPayload {
  id?: number;
  valor?: number;
  nome?: string;
  descricao?: string;
  descricaoSituacao?: string;
  situacao?: string;
}

interface BlingContactPayload {
  nome?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  endereco?: {
    geral?: Record<string, unknown>;
  };
  [key: string]: unknown;
}

interface ProcessedVolume {
  id: string;
  orderId: string;
  volumeId: string;
  volumeNumero: number;
  totalVolumes: number;
  numero: string;
  data: string;
  valor: number;
  situacao: {
    nome?: string;
    [key: string]: unknown;
  };
  contato: {
    nome?: string | null;
    email?: string | null;
    telefone?: string | null;
    celular?: string | null;
    [key: string]: unknown;
  };
  transporte?: Record<string, unknown>;
  itens: unknown[];
  endereco: unknown;
  notaFiscal: unknown;
  codigoRastreamento: string;
  isTracked: boolean;
  fullData: unknown;
}

interface BlingInvoicePayload {
  numero?: string;
  chaveAcesso?: string;
  dataEmissao?: string;
  [key: string]: unknown;
}

// Map Bling status IDs to readable names
function mapBlingStatus(situacao: BlingStatusPayload | null | undefined): string {
  const statusMap: Record<number, string> = {
    6: 'Em aberto',
    9: 'Em andamento',
    12: 'Em produção',
    15: 'Atendido', // Entregue
    18: 'Cancelado',
    24: 'Verificado',
  };

  const statusIdValue = situacao?.id ?? situacao?.valor;
  const statusId = typeof statusIdValue === 'number' ? statusIdValue : undefined;
  const mapped = statusId !== undefined ? statusMap[statusId] : undefined;

  if (mapped) return mapped;

  const fallback =
    situacao?.nome ||
    situacao?.descricao ||
    situacao?.descricaoSituacao ||
    situacao?.situacao;

  return typeof fallback === 'string' && fallback.trim().length > 0
    ? fallback.trim()
    : 'Desconhecido';
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      
      // If rate limited, wait and retry with exponential backoff
      if (response.status === 429) {
        const waitTime = Math.min(1000 * Math.pow(2, i), 10000); // Max 10s
        console.log(`[BLING-FETCH-ORDERS] Rate limited (429), waiting ${waitTime}ms before retry ${i + 1}/${retries}`);
        await sleep(waitTime);
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(1000 * (i + 1));
    }
  }
  throw new Error('Max retries exceeded');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[BLING-FETCH-ORDERS] Starting fetch');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get customer_id from session
    const token = req.headers.get('x-session-token') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: session } = await supabase
      .from('sessions')
      .select('customer_id')
      .eq('token_jti', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Sessão inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerId = session.customer_id;

    // Get active Bling integration
    const { data: integration, error: integrationError } = await supabase
      .from('bling_integrations')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .single();

    if (integrationError || !integration) {
      console.error('[BLING-FETCH-ORDERS] No active integration found');
      return new Response(
        JSON.stringify({ error: 'Integração não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token needs refresh
    const needsRefresh = new Date(integration.token_expires_at).getTime() - new Date().getTime() < 30 * 60 * 1000;
    if (needsRefresh) {
      console.log('[BLING-FETCH-ORDERS] Token expiring soon, refreshing...');
      await supabase.functions.invoke('bling-refresh-token', {
        headers: { 'x-customer-id': customerId },
      });

      // Get updated integration
      const { data: updated } = await supabase
        .from('bling_integrations')
        .select('access_token')
        .eq('id', integration.id)
        .single();
      
      if (updated) integration.access_token = updated.access_token;
    }

    // Get pagination parameters from query
    const url = new URL(req.url);
    const initialPageParam = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = 100;
    let currentPage = Number.isNaN(initialPageParam) ? 1 : Math.max(1, initialPageParam);
    const allVolumes: ProcessedVolume[] = [];
    let totalOrdersProcessed = 0;
    let pagesProcessed = 0;

    const processOrdersInBatches = async (orders: any[]) => {
      for (let i = 0; i < orders.length; i += MAX_CONCURRENT_REQUESTS) {
        const batch = orders.slice(i, i + MAX_CONCURRENT_REQUESTS);
        await Promise.all(
          batch.map(order => processOrder(order))
        );
        if (DELAY_BETWEEN_REQUESTS > 0) {
          await sleep(DELAY_BETWEEN_REQUESTS);
        }
      }
    };

    const processOrder = async (order: any) => {
      try {
        const initialStatus = mapBlingStatus(order.situacao);
        const normalizedInitialStatus = normalize(initialStatus);

        if (!ALLOWED_STATUSES.has(normalizedInitialStatus)) {
          console.log(`[BLING-FETCH-ORDERS] Pedido ${order.numero} ignorado (status ${initialStatus})`);
          return;
        }

        // Fetch full order details
        const detailsResponse = await fetchWithRetry(
          `https://api.bling.com.br/Api/v3/pedidos/vendas/${order.id}`,
          {
            headers: {
              'Authorization': `Bearer ${integration.access_token}`,
              'Accept': 'application/json',
            },
          }
        );

        let fullDetails = order;
        if (detailsResponse.ok) {
          const detailsData = await detailsResponse.json();
          fullDetails = detailsData.data || order;
        }

        const mappedStatus = mapBlingStatus(fullDetails.situacao);
        const normalizedMappedStatus = normalize(mappedStatus);

        if (!ALLOWED_STATUSES.has(normalizedMappedStatus)) {
          console.log(`[BLING-FETCH-ORDERS] Pedido ${fullDetails.numero} pulado após detalhes (status ${mappedStatus})`);
          return;
        }

        fullDetails.situacao = {
          ...fullDetails.situacao,
          nome: mappedStatus,
        };

        // Fetch contact email if contact exists
        let contactName = fullDetails.contato?.nome || null;
        let contactEmail = fullDetails.contato?.email || null;
        let contactPhone = fullDetails.contato?.celular || fullDetails.contato?.telefone || null;

        if (fullDetails.contato?.id) {
          try {
            const contactResponse = await fetchWithRetry(
              `https://api.bling.com.br/Api/v3/contatos/${fullDetails.contato.id}`,
              {
                headers: {
                  'Authorization': `Bearer ${integration.access_token}`,
                  'Accept': 'application/json',
                },
              }
            );
            
            if (contactResponse.ok) {
              const contactData = await contactResponse.json() as { data?: BlingContactPayload };
              const contact = contactData.data;

              if (contact) {
                contactName = contact.nome || contactName;
                contactEmail = contact.email || contactEmail;
                contactPhone = contact.celular || contact.telefone || contactPhone;

                fullDetails.contato = {
                  ...fullDetails.contato,
                  nome: contactName || fullDetails.contato?.nome,
                  email: contactEmail || fullDetails.contato?.email,
                  telefone: contact.telefone || fullDetails.contato?.telefone,
                  celular: contact.celular || fullDetails.contato?.celular,
                  endereco: contact.endereco?.geral || fullDetails.contato?.endereco,
                };

                console.log(`[BLING-FETCH-ORDERS] Contact loaded: ${contact.nome || 'UNKNOWN'}`);
              }
            }
          } catch (e) {
            console.log(`[BLING-FETCH-ORDERS] Could not fetch contact email`);
          }
        }

        // Fetch NFe if available
        let nfeData: BlingInvoicePayload | null = null;
        try {
          const nfeResponse = await fetchWithRetry(
            `https://api.bling.com.br/Api/v3/pedidos/vendas/${order.id}/notas-fiscais`,
            {
              headers: {
                'Authorization': `Bearer ${integration.access_token}`,
                'Accept': 'application/json',
              },
            }
          );
          if (nfeResponse.ok) {
            const nfeJson = await nfeResponse.json() as { data?: BlingInvoicePayload[] };
            nfeData = nfeJson.data?.[0] || null;
          }
        } catch (e) {
          console.log(`[BLING-FETCH-ORDERS] NFe not available for order ${order.id}`);
        }

        // Process volumes
        const volumes = fullDetails.transporte?.volumes || [];
        
        if (volumes.length === 0) {
          console.log(`[BLING-FETCH-ORDERS] Order ${fullDetails.numero} has no volumes, skipping`);
          return;
        }

        console.log(`[BLING-FETCH-ORDERS] Order ${fullDetails.numero} has ${volumes.length} volume(s)`);

        // Process each volume
        for (let i = 0; i < volumes.length; i++) {
          const volume = volumes[i];
          
          // Try to get tracking code from volume directly first
          let trackingCode = volume.codigoRastreamento || null;
          
          // If not found, try fetching from logistics API
          if (!trackingCode && volume.id) {
            try {
              const logisticsResponse = await fetchWithRetry(
                `https://api.bling.com.br/Api/v3/logisticas/objetos/${volume.id}`,
                {
                  headers: {
                    'Authorization': `Bearer ${integration.access_token}`,
                    'Accept': 'application/json',
                  },
                }
              );

              if (logisticsResponse.ok) {
                const logisticsData = await logisticsResponse.json();
                trackingCode = logisticsData.data?.rastreamento?.codigo || null;
              }
            } catch (e) {
              console.log(`[BLING-FETCH-ORDERS] Could not fetch logistics for volume ${volume.id}`);
            }
          }
          
          if (trackingCode) {
            allVolumes.push({
              id: `${fullDetails.id}-${volume.id}`,
              orderId: fullDetails.id.toString(),
              volumeId: volume.id.toString(),
              volumeNumero: i + 1,
              totalVolumes: volumes.length,
              numero: fullDetails.numero,
              data: fullDetails.data,
              valor: fullDetails.valor,
              situacao: {
                ...fullDetails.situacao,
                nome: mappedStatus
              },
              contato: {
                ...fullDetails.contato,
                nome: fullDetails.contato?.nome || contactName,
                email: contactEmail || fullDetails.contato?.email,
                telefone: fullDetails.contato?.telefone || contactPhone,
                celular: fullDetails.contato?.celular || contactPhone,
              },
              transporte: fullDetails.transporte,
              itens: fullDetails.itens || [],
              endereco: fullDetails.contato?.endereco || null,
              notaFiscal: nfeData,
              codigoRastreamento: trackingCode,
              isTracked: false,
              fullData: fullDetails,
            });
          } else {
            console.log(`[BLING-FETCH-ORDERS] ⚠️ Volume ${volume.id} has NO tracking code`);
          }
        }
      } catch (error) {
        console.error(`[BLING-FETCH-ORDERS] Error processing order ${order.id}:`, error);
      }
    };
    while (currentPage <= MAX_PAGES) {
      console.log(`[BLING-FETCH-ORDERS] Fetching page ${currentPage} with limit ${limit}`);
      const ordersResponse = await fetchWithRetry(
        `${BLING_BASE_ENDPOINT}${currentPage}${BLING_QUERY_SUFFIX}`,
        {
          headers: {
            'Authorization': `Bearer ${integration.access_token}`,
            'Accept': 'application/json',
          },
        }
      );

      if (ordersResponse.status === 401) {
        console.error('[BLING-FETCH-ORDERS] Token invalid');
        await supabase
          .from('bling_integrations')
          .update({ status: 'error' })
          .eq('id', integration.id);

        return new Response(
          JSON.stringify({ 
            error: 'Token revogado. Reconexão necessária.',
            needsReconnect: true 
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!ordersResponse.ok) {
        throw new Error(`Bling API error: ${ordersResponse.status}`);
      }

      const ordersData = await ordersResponse.json();
      const orders = ordersData.data || [];
      console.log(`[BLING-FETCH-ORDERS] Page ${currentPage} fetched ${orders.length} orders`);

      if (orders.length === 0) {
        break;
      }

      await processOrdersInBatches(orders);
      totalOrdersProcessed += orders.length;
      pagesProcessed += 1;

      if (orders.length < limit) {
        break;
      }

      currentPage += 1;
    }

    // Get existing shipments to mark which volumes are already tracked
    const trackingCodes = allVolumes.map(v => v.codigoRastreamento);
    const { data: existingShipments } = await supabase
      .from('shipments')
      .select('tracking_code, bling_order_id, bling_volume_id')
      .eq('customer_id', customerId)
      .in('tracking_code', trackingCodes);

    // Create a set of tracked volume IDs
    const trackedVolumeIds = new Set(
      existingShipments?.map(s => `${s.bling_order_id}-${s.bling_volume_id}`) || []
    );

    // Mark which volumes are tracked
    allVolumes.forEach((volume) => {
      const volumeKey = `${volume.orderId}-${volume.volumeId}`;
      volume.isTracked = trackedVolumeIds.has(volumeKey);
    });

    console.log(`[BLING-FETCH-ORDERS] Successfully processed ${allVolumes.length} volumes from ${totalOrdersProcessed} orders across ${pagesProcessed} page(s)`);
    console.log(`[BLING-FETCH-ORDERS] Tracked: ${allVolumes.filter(v => v.isTracked).length}, Available: ${allVolumes.filter(v => !v.isTracked).length}`);

    return new Response(
      JSON.stringify({
        success: true,
        orders: allVolumes, // Now returning volumes, not orders
        total: allVolumes.length,
        pagesProcessed,
        totalOrdersProcessed,
        limit,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[BLING-FETCH-ORDERS] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao buscar pedidos' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
