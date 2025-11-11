import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

// Rate limiting helper - wait between API calls
const DELAY_BETWEEN_REQUESTS = 400; // 400ms between requests to respect rate limits
const MAX_RETRIES = 3;

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
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '25'), 25); // Reduced default to 25, max 25

    // Fetch orders from Bling
    console.log(`[BLING-FETCH-ORDERS] Fetching page ${page} with limit ${limit}`);
    const ordersResponse = await fetchWithRetry(
      `https://api.bling.com.br/Api/v3/pedidos/vendas?pagina=${page}&limite=${limit}`,
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
    console.log(`[BLING-FETCH-ORDERS] Fetched ${ordersData.data?.length || 0} orders`);
    
    // Process each order and extract volumes
    const allVolumes: any[] = [];
    
    for (const order of (ordersData.data || [])) {
      try {
        // Rate limiting: wait before each order processing
        await sleep(DELAY_BETWEEN_REQUESTS);
        
        // Fetch full order details
        console.log(`[BLING-FETCH-ORDERS] Fetching details for order ${order.id}`);
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

        // Fetch NFe if available
        let nfeData = null;
        try {
          await sleep(DELAY_BETWEEN_REQUESTS); // Rate limiting
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
            const nfeJson = await nfeResponse.json();
            nfeData = nfeJson.data?.[0] || null;
          }
        } catch (e) {
          console.log(`[BLING-FETCH-ORDERS] NFe not available for order ${order.id}`);
        }

        // Process volumes
        const volumes = fullDetails.transporte?.volumes || [];
        
        if (volumes.length === 0) {
          console.log(`[BLING-FETCH-ORDERS] Order ${fullDetails.numero} has no volumes, skipping`);
          continue;
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
              await sleep(DELAY_BETWEEN_REQUESTS); // Rate limiting
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
          
          console.log(`[BLING-FETCH-ORDERS] Volume ${volume.id} tracking: ${trackingCode || 'NOT FOUND'}`);
          console.log(`[BLING-FETCH-ORDERS] Volume data:`, JSON.stringify(volume, null, 2));

          // Only add volume if it has a tracking code
          if (trackingCode) {
            allVolumes.push({
              id: `${fullDetails.id}-${volume.id}`, // Composite ID
              orderId: fullDetails.id.toString(),
              volumeId: volume.id.toString(),
              volumeNumero: i + 1,
              totalVolumes: volumes.length,
              numero: fullDetails.numero,
              data: fullDetails.data,
              valor: fullDetails.valor,
              situacao: fullDetails.situacao,
              contato: fullDetails.contato,
              transporte: fullDetails.transporte,
              itens: fullDetails.itens || [],
              endereco: fullDetails.contato?.endereco || null,
              notaFiscal: nfeData,
              codigoRastreamento: trackingCode,
              isTracked: false, // Will be checked below
              fullData: fullDetails,
            });
          } else {
            console.log(`[BLING-FETCH-ORDERS] ⚠️ Volume ${volume.id} has NO tracking code`);
          }
        }

      } catch (error) {
        console.error(`[BLING-FETCH-ORDERS] Error processing order ${order.id}:`, error);
      }
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
    allVolumes.forEach((volume: any) => {
      const volumeKey = `${volume.orderId}-${volume.volumeId}`;
      volume.isTracked = trackedVolumeIds.has(volumeKey);
    });

    console.log(`[BLING-FETCH-ORDERS] Successfully processed ${allVolumes.length} volumes from ${ordersData.data?.length || 0} orders`);
    console.log(`[BLING-FETCH-ORDERS] Tracked: ${allVolumes.filter(v => v.isTracked).length}, Available: ${allVolumes.filter(v => !v.isTracked).length}`);

    return new Response(
      JSON.stringify({
        success: true,
        orders: allVolumes, // Now returning volumes, not orders
        total: allVolumes.length,
        page,
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
