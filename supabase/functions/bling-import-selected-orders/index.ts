import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

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

    // Process each volume
    for (const volumeId of volumeIds) {
      try {
        // Parse composite ID
        const [orderId, blingVolumeId] = volumeId.split('-');
        
        console.log(`[BLING-IMPORT-SELECTED] Processing volume ${blingVolumeId} from order ${orderId}`);
        
        // Fetch order details
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

        // Find the specific volume
        const volumes = order.transporte?.volumes || [];
        const volumeIndex = volumes.findIndex((v: any) => v.id.toString() === blingVolumeId);
        
        if (volumeIndex === -1) {
          throw new Error(`Volume ${blingVolumeId} not found in order ${orderId}`);
        }

        const volume = volumes[volumeIndex];

        // Fetch logistics object for tracking code
        let trackingCode = null;
        try {
          const logisticsResponse = await fetch(
            `https://api.bling.com.br/Api/v3/logisticas/objetos/${blingVolumeId}`,
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
          console.error(`[BLING-IMPORT-SELECTED] Error fetching logistics for volume ${blingVolumeId}:`, e);
        }

        if (!trackingCode) {
          console.log(`[BLING-IMPORT-SELECTED] Volume ${blingVolumeId} has no tracking code, skipping`);
          volumesFailed++;
          errors.push(`Volume ${volumeIndex + 1} do pedido ${order.numero} não tem código de rastreamento`);
          continue;
        }

        // Fetch contact email if contact exists
        let contactEmail = order.contato?.email || null;

        if (!contactEmail && order.contato?.id) {
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
              const contactData = await contactResponse.json();
              contactEmail = contactData.data?.email || null;
              console.log(`[BLING-IMPORT-SELECTED] Found contact email: ${contactEmail || 'NOT FOUND'}`);
            }
          } catch (e) {
            console.log(`[BLING-IMPORT-SELECTED] Could not fetch contact details:`, e);
          }
        }

        // Check if already exists
        const { data: existingShipment } = await supabase
          .from('shipments')
          .select('id')
          .eq('customer_id', customerId)
          .eq('bling_order_id', orderId)
          .eq('bling_volume_id', blingVolumeId)
          .single();

        if (existingShipment) {
          console.log(`[BLING-IMPORT-SELECTED] Volume ${volumeIndex + 1} of order ${order.numero} already tracked`);
          volumesFailed++;
          errors.push(`Volume ${volumeIndex + 1} do pedido ${order.numero} já está sendo rastreado`);
          continue;
        }

        // Fetch NFe if available
        let nfeData = null;
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
            const nfeJson = await nfeResponse.json();
            nfeData = nfeJson.data?.[0] || null;
          }
        } catch (e) {
          console.log(`[BLING-IMPORT-SELECTED] NFe not available for order ${orderId}`);
        }

        // Create shipment_customer if needed
        let shipmentCustomerId = null;
        if (order.contato && contactEmail) {
          console.log(`[BLING-IMPORT-SELECTED] Creating customer: ${contactEmail}`);
          
          // Check if customer already exists by email
          const { data: existingCustomer } = await supabase
            .from('shipment_customers')
            .select('id')
            .eq('customer_id', customerId)
            .eq('email', contactEmail)
            .single();
            
          if (existingCustomer) {
            shipmentCustomerId = existingCustomer.id;
            console.log(`[BLING-IMPORT-SELECTED] Using existing customer: ${existingCustomer.id}`);
          } else {
            const { data: newCustomer, error: customerError } = await supabase
              .from('shipment_customers')
              .insert({
                customer_id: customerId,
                first_name: order.contato.nome?.split(' ')[0] || 'Cliente',
                last_name: order.contato.nome?.split(' ').slice(1).join(' ') || 'Bling',
                email: contactEmail,
                phone: order.contato.celular || order.contato.telefone || '',
              })
              .select('id')
              .single();

            if (customerError) {
              console.error(`[BLING-IMPORT-SELECTED] ❌ Error creating customer:`, customerError);
            } else if (newCustomer) {
              shipmentCustomerId = newCustomer.id;
              console.log(`[BLING-IMPORT-SELECTED] ✅ Created new customer: ${newCustomer.id}`);
            }
          }
        } else {
          console.log(`[BLING-IMPORT-SELECTED] ⚠️ No contact email for order ${order.numero}, skipping customer creation`);
        }

        // Save enriched order details (once per order, not per volume)
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
            tracking_code: trackingCode,
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

        // Create shipment with volume information
        const { data: newShipment, error: insertError } = await supabase
          .from('shipments')
          .insert({
            customer_id: customerId,
            tracking_code: trackingCode,
            shipment_customer_id: shipmentCustomerId,
            auto_tracking: true,
            status: 'pending',
            bling_order_id: orderId,
            bling_volume_id: blingVolumeId,
            volume_numero: volumeIndex + 1,
            total_volumes: volumes.length,
            shipment_data: order,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error(`[BLING-IMPORT-SELECTED] Error creating shipment:`, insertError);
          volumesFailed++;
          errors.push(`Erro ao criar rastreamento para volume ${volumeIndex + 1} do pedido ${order.numero}`);
        } else {
          volumesImported++;
          console.log(`[BLING-IMPORT-SELECTED] ✅ Successfully imported volume ${volumeIndex + 1} of order ${order.numero}`);
          
          // CORREÇÃO 2: Fetch tracking history after creating shipment
          if (newShipment && trackingCode) {
            console.log(`[BLING-IMPORT-SELECTED] Fetching tracking history for ${trackingCode}`);
            
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
                    // Map status milestone
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
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));

      } catch (volumeError) {
        console.error(`[BLING-IMPORT-SELECTED] Error processing volume ${volumeId}:`, volumeError);
        volumesFailed++;
        errors.push(`Erro ao processar volume ${volumeId}`);
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
