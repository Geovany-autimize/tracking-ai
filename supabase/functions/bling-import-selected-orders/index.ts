import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

const normalize = (value?: string) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const ALLOWED_STATUSES = new Set(['em aberto', 'em andamento', 'em producao']);

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

interface BlingInvoicePayload {
  numero?: string;
  chaveAcesso?: string;
  dataEmissao?: string;
  [key: string]: unknown;
}

function mapBlingStatus(situacao: BlingStatusPayload | null | undefined): string {
  const statusMap: Record<number, string> = {
    6: 'Em aberto',
    9: 'Em andamento',
    12: 'Em produção',
    15: 'Atendido',
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[BLING-IMPORT-SELECTED] Starting import of selected volumes');

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

    // Parse request body - now receiving volumeIds (composite: orderId-volumeId)
    const body = await req.json();
    const { orderIds: volumeIds } = body; // Keep name for backward compatibility

    if (!Array.isArray(volumeIds) || volumeIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhum volume selecionado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[BLING-IMPORT-SELECTED] Importing ${volumeIds.length} volumes`);

    // Get active Bling integration
    const { data: integration } = await supabase
      .from('bling_integrations')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .single();

    if (!integration) {
      return new Response(
        JSON.stringify({ error: 'Integração não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let volumesImported = 0;
    let volumesFailed = 0;
    const errors: string[] = [];

    const ordersToProcess = new Map<string, { allVolumes: boolean; volumeIds: Set<string> }>();

    for (const requestId of volumeIds) {
      if (requestId.includes('-')) {
        const [orderId, volumeId] = requestId.split('-');
        const entry = ordersToProcess.get(orderId) || { allVolumes: false, volumeIds: new Set<string>() };
        if (!entry.allVolumes && volumeId) {
          entry.volumeIds.add(volumeId);
        }
        ordersToProcess.set(orderId, entry);
      } else {
        const orderId = requestId;
        const entry = ordersToProcess.get(orderId) || { allVolumes: false, volumeIds: new Set<string>() };
        entry.allVolumes = true;
        entry.volumeIds.clear();
        ordersToProcess.set(orderId, entry);
      }
    }

    for (const [orderId, selection] of ordersToProcess.entries()) {
      try {
        console.log(`[BLING-IMPORT-SELECTED] Processing order ${orderId}`);

        const orderResponse = await fetch(
          `https://api.bling.com.br/Api/v3/pedidos/vendas/${orderId}`,
          {
            headers: {
              'Authorization': `Bearer ${integration.access_token}`,
              'Accept': 'application/json',
            },
          }
        );

        if (!orderResponse.ok) {
          throw new Error(`Failed to fetch order ${orderId}: ${orderResponse.status}`);
        }

        const orderData = await orderResponse.json();
        const order = orderData.data;

        const mappedStatus = mapBlingStatus(order.situacao);
        const normalizedStatus = normalize(mappedStatus);

        if (!ALLOWED_STATUSES.has(normalizedStatus)) {
          console.log(`[BLING-IMPORT-SELECTED] Pedido ${order.numero} ignorado pelo status ${mappedStatus}`);
          volumesFailed++;
          errors.push(`Pedido ${order.numero} em status não permitido (${mappedStatus})`);
          continue;
        }

        order.situacao = {
          ...order.situacao,
          nome: mappedStatus,
        };

        // Find volumes - handle orders without volumes array
        const volumes = order.transporte?.volumes || [];
        const typedVolumes = (volumes as Array<{ id?: string | number; [key: string]: unknown }>);
        let volumeSelection = selection.allVolumes
          ? typedVolumes
          : typedVolumes.filter(v => selection.volumeIds.has(v.id?.toString() || ''));

        // If no volumes, treat as single shipment order
        if (volumeSelection.length === 0 && selection.allVolumes) {
          console.log(`[BLING-IMPORT-SELECTED] Order ${orderId} has no volumes, treating as single shipment`);
          volumeSelection = [{ id: orderId }]; // Create virtual volume
        }

        if (volumeSelection.length === 0) {
          console.log(`[BLING-IMPORT-SELECTED] No volumes selected for order ${orderId}, skipping`);
          continue;
        }

        // Fetch contact details if contact exists
        let contactName = order.contato?.nome || null;
        let contactPhone = order.contato?.celular || order.contato?.telefone || null;
        let contactEmail = order.contato?.email || null;

        if (order.contato?.id) {
          console.log(`[BLING-IMPORT-SELECTED] Fetching contact details for ${order.contato.id}`);
          try {
            await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
            const contactResponse = await fetch(
              `https://api.bling.com.br/Api/v3/contatos/${order.contato.id}`,
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

                order.contato = {
                  ...order.contato,
                  nome: contactName || order.contato?.nome,
                  email: contactEmail || order.contato?.email,
                  telefone: contact.telefone || order.contato?.telefone,
                  celular: contact.celular || order.contato?.celular,
                  endereco: contact.endereco?.geral || order.contato?.endereco,
                };
                console.log(`[BLING-IMPORT-SELECTED] Contact loaded: ${contact.nome || 'UNKNOWN'}`);
              }
            }
          } catch (e) {
            console.log(`[BLING-IMPORT-SELECTED] Could not fetch contact details:`, e);
          }
        }

        // Fetch NFe if available
        let nfeData: BlingInvoicePayload | null = null;
        try {
          const nfeResponse = await fetch(
            `https://api.bling.com.br/Api/v3/pedidos/vendas/${orderId}/notas-fiscais`,
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
          console.log(`[BLING-IMPORT-SELECTED] NFe not available for order ${orderId}`);
        }

        const fullName = (contactName || order.contato?.nome || 'Cliente Bling').trim();
        const [firstNameRaw, ...restName] = fullName.split(/\s+/);
        const firstName = firstNameRaw || 'Cliente';
        const lastName = restName.length > 0 ? restName.join(' ') : firstName;
        const phone = contactPhone || order.contato?.celular || order.contato?.telefone || '';
        const email = contactEmail || order.contato?.email || '';

        let shipmentCustomerId = null;
        if (email) {
          const { data: existingCustomer } = await supabase
            .from('shipment_customers')
            .select('id')
            .eq('customer_id', customerId)
            .eq('email', email)
            .single();

          if (existingCustomer) {
            shipmentCustomerId = existingCustomer.id;
            console.log(`[BLING-IMPORT-SELECTED] Using existing customer: ${existingCustomer.id}`);
          } else {
            const { data: newCustomer, error: customerError } = await supabase
              .from('shipment_customers')
              .insert({
                customer_id: customerId,
                first_name: firstName,
                last_name: lastName,
                email,
                phone,
              })
              .select('id')
              .single();

            if (!customerError && newCustomer) {
              shipmentCustomerId = newCustomer.id;
              console.log(`[BLING-IMPORT-SELECTED] ✅ Created new customer: ${newCustomer.id}`);
            } else if (customerError) {
              console.error(`[BLING-IMPORT-SELECTED] ❌ Error creating customer:`, customerError);
            }
          }
        } else {
          console.log(`[BLING-IMPORT-SELECTED] ⚠️ Missing email for contact of order ${order.numero}, skipping customer creation`);
        }

        const primaryTrackingCode = volumeSelection[0]?.codigoRastreamento || null;

        const { error: orderDetailsError } = await supabase
          .from('bling_order_details')
          .upsert({
            customer_id: customerId,
            bling_order_id: orderId,
            order_number: order.numero,
            order_date: order.data,
            total_value: order.valor,
            status: order.situacao?.nome || order.situacao,
            contact_name: order.contato?.nome,
            contact_email: order.contato?.email,
            contact_phone: order.contato?.celular || order.contato?.telefone,
            delivery_address: order.contato?.endereco || null,
            carrier_name: order.transporte?.transportadora?.nome,
            tracking_code: primaryTrackingCode,
            freight_value: order.transporte?.frete?.valor,
            nfe_number: nfeData?.numero,
            nfe_key: nfeData?.chaveAcesso,
            nfe_issue_date: nfeData?.dataEmissao,
            items: order.itens || [],
            full_data: { ...order, notaFiscal: nfeData },
          }, {
            onConflict: 'customer_id,bling_order_id'
          });

        if (orderDetailsError) {
          console.error(`[BLING-IMPORT-SELECTED] Error saving order details:`, orderDetailsError);
        }

        for (let index = 0; index < volumeSelection.length; index++) {
          const volume = volumeSelection[index];
          const volumeId = volume.id?.toString();

          if (!volumeId) {
            console.log(`[BLING-IMPORT-SELECTED] Volume without ID in order ${order.numero}, skipping`);
            volumesFailed++;
            errors.push(`Volume sem ID no pedido ${order.numero}`);
            continue;
          }

          // Extract tracking code from multiple possible sources
          let trackingCode = volume.codigoRastreamento || 
                             order.transporte?.codigoRastreamento ||
                             order.transporte?.etiqueta?.codigoRastreamento ||
                             null;
          
          if (!trackingCode) {
            try {
              await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
              const logisticsResponse = await fetch(
                `https://api.bling.com.br/Api/v3/logisticas/objetos/${volumeId}`,
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
                console.log(`[BLING-IMPORT-SELECTED] Fetched tracking from logistics API: ${trackingCode || 'NOT FOUND'}`);
              }
            } catch (e) {
              console.error(`[BLING-IMPORT-SELECTED] Error fetching logistics for volume ${volumeId}:`, e);
            }
          }

          if (!trackingCode) {
            console.log(`[BLING-IMPORT-SELECTED] Volume ${volumeId} has no tracking code, skipping`);
            volumesFailed++;
            errors.push(`Volume ${index + 1} do pedido ${order.numero} não tem código de rastreamento`);
            continue;
          }

          const { data: existingShipment } = await supabase
            .from('shipments')
            .select('id')
            .eq('customer_id', customerId)
            .eq('bling_order_id', orderId)
            .eq('bling_volume_id', volumeId)
            .single();

          if (existingShipment) {
            console.log(`[BLING-IMPORT-SELECTED] Volume ${index + 1} of order ${order.numero} already tracked`);
            volumesFailed++;
            errors.push(`Volume ${index + 1} do pedido ${order.numero} já está sendo rastreado`);
            continue;
          }

          const { data: newShipment, error: insertError } = await supabase
            .from('shipments')
            .insert({
              customer_id: customerId,
              tracking_code: trackingCode,
              shipment_customer_id: shipmentCustomerId,
              auto_tracking: true,
              status: 'pending',
              bling_order_id: orderId,
              bling_volume_id: volumeId,
              volume_numero: index + 1,
              total_volumes: volumeSelection.length,
              shipment_data: order,
            })
            .select('id')
            .single();

          if (insertError) {
            console.error(`[BLING-IMPORT-SELECTED] Error creating shipment:`, insertError);
            volumesFailed++;
            errors.push(`Erro ao criar rastreamento para volume ${index + 1} do pedido ${order.numero}`);
            continue;
          }

          volumesImported++;
          console.log(`[BLING-IMPORT-SELECTED] ✅ Successfully imported volume ${index + 1} of order ${order.numero}`);

          if (newShipment && trackingCode) {
            try {
              const ship24ApiKey = Deno.env.get('SHIP24_API_KEY');
              if (!ship24ApiKey) {
                console.log(`[BLING-IMPORT-SELECTED] ⚠️ SHIP24_API_KEY not configured, skipping tracking fetch`);
              } else {
                const trackingResponse = await fetch('https://api.ship24.com/public/v1/trackers/track', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${ship24ApiKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    trackingNumber: trackingCode,
                  }),
                });

                if (trackingResponse.ok) {
                  const trackingData = await trackingResponse.json();
                  const tracking = trackingData.data?.trackings?.[0];
                  
                  if (tracking) {
                    const statusMap: Record<string, string> = {
                      'delivered': 'delivered',
                      'in_transit': 'in_transit',
                      'out_for_delivery': 'out_for_delivery',
                      'exception': 'exception',
                      'info_received': 'pending',
                    };
                    
                    const mappedStatus = statusMap[tracking.shipment?.statusMilestone] || 'pending';
                    
                    await supabase
                      .from('shipments')
                      .update({
                        tracker_id: tracking.tracker?.trackerId,
                        tracking_events: tracking.events || [],
                        shipment_data: tracking.shipment,
                        status: mappedStatus,
                        last_update: new Date().toISOString()
                      })
                      .eq('id', newShipment.id);
                      
                    console.log(`[BLING-IMPORT-SELECTED] ✅ Tracking history updated for ${trackingCode}`);
                  }
                } else {
                  console.log(`[BLING-IMPORT-SELECTED] ⚠️ Ship24 API returned ${trackingResponse.status} for ${trackingCode}`);
                }
              }
            } catch (trackingError) {
              console.error(`[BLING-IMPORT-SELECTED] ⚠️ Failed to fetch tracking for ${trackingCode}:`, trackingError);
            }
          }

          await new Promise(resolve => setTimeout(resolve, 150));
        }
      } catch (orderError) {
        console.error(`[BLING-IMPORT-SELECTED] Error processing order ${orderId}:`, orderError);
        volumesFailed++;
        errors.push(`Erro ao processar pedido ${orderId}`);
      }
    }

    console.log(`[BLING-IMPORT-SELECTED] Import completed: ${volumesImported} imported, ${volumesFailed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        imported: volumesImported,
        failed: volumesFailed,
        errors,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[BLING-IMPORT-SELECTED] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao importar volumes selecionados' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
