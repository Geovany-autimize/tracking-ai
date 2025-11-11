import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

interface BlingVolume {
  id: number;
  servico?: string;
  codigoRastreamento?: string;
}

interface BlingTransport {
  volumes?: BlingVolume[];
}

interface BlingOrder {
  id: number;
  numero?: string;
  data?: string;
  transporte?: BlingTransport;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🔄 Starting legacy shipments association...');

    // Get customer ID from session token
    const sessionToken = req.headers.get('x-session-token');
    if (!sessionToken) {
      throw new Error('Session token not provided');
    }

    const { data: session } = await supabase
      .from('sessions')
      .select('customer_id')
      .eq('token_jti', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!session) {
      throw new Error('Invalid or expired session');
    }

    const customerId = session.customer_id;
    console.log(`📦 Processing shipments for customer: ${customerId}`);

    // Get Bling integration
    const { data: integration } = await supabase
      .from('bling_integrations')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .single();

    if (!integration) {
      throw new Error('No active Bling integration found');
    }

    // Check if token needs refresh
    const tokenExpiresAt = new Date(integration.token_expires_at);
    const now = new Date();
    const hoursUntilExpiry = (tokenExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilExpiry < 1) {
      console.log('🔑 Token expiring soon, refreshing...');
      const { data: refreshResult } = await supabase.functions.invoke('bling-refresh-token', {
        headers: { 'x-session-token': sessionToken }
      });
      
      if (refreshResult?.access_token) {
        integration.access_token = refreshResult.access_token;
      }
    }

    // Get legacy shipments (without bling_order_id)
    const { data: legacyShipments, error: shipmentsError } = await supabase
      .from('shipments')
      .select('id, tracking_code')
      .eq('customer_id', customerId)
      .is('bling_order_id', null)
      .order('created_at', { ascending: false })
      .limit(50); // Process in batches

    if (shipmentsError) throw shipmentsError;

    if (!legacyShipments || legacyShipments.length === 0) {
      console.log('✅ No legacy shipments to process');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No legacy shipments found',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${legacyShipments.length} legacy shipments to process`);

    let processed = 0;
    let associated = 0;
    let notFound = 0;

    // Fetch Bling orders (last 90 days)
    const dataInicial = new Date();
    dataInicial.setDate(dataInicial.getDate() - 90);
    const dataFinal = new Date();

    const blingUrl = `https://www.bling.com.br/Api/v3/pedidos/vendas?dataInicial=${dataInicial.toISOString().split('T')[0]}&dataFinal=${dataFinal.toISOString().split('T')[0]}&limite=100`;
    
    console.log('🔍 Fetching Bling orders...');
    const blingResponse = await fetch(blingUrl, {
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Accept': 'application/json'
      }
    });

    if (!blingResponse.ok) {
      throw new Error(`Bling API error: ${blingResponse.status}`);
    }

    const blingData = await blingResponse.json();
    const orders: BlingOrder[] = blingData.data || [];

    console.log(`📦 Retrieved ${orders.length} orders from Bling`);

    // Process each legacy shipment
    for (const shipment of legacyShipments) {
      processed++;
      console.log(`\n🔎 [${processed}/${legacyShipments.length}] Searching for tracking: ${shipment.tracking_code}`);

      let found = false;

      // Search in orders
      for (const order of orders) {
        if (!order.transporte?.volumes) continue;

        for (let volumeIndex = 0; volumeIndex < order.transporte.volumes.length; volumeIndex++) {
          const volume = order.transporte.volumes[volumeIndex];
          
          // Try to get tracking code from volume directly first
          let trackingCode = volume.codigoRastreamento || null;
          
          // If not found, fetch detailed logistics info
          if (!trackingCode && volume.id) {
            await new Promise(resolve => setTimeout(resolve, 150)); // Rate limiting
            
            const logisticsUrl = `https://www.bling.com.br/Api/v3/logisticas/objetos/${volume.id}`;
            const logisticsResponse = await fetch(logisticsUrl, {
              headers: {
                'Authorization': `Bearer ${integration.access_token}`,
                'Accept': 'application/json'
              }
            });

            if (logisticsResponse.ok) {
              const logisticsData = await logisticsResponse.json();
              trackingCode = logisticsData.data?.rastreamento?.codigo || null;
            }
          }

          if (trackingCode === shipment.tracking_code) {
                console.log(`✅ Found match! Order: ${order.id}, Volume: ${volume.id}`);
                
                // Fetch full order details
                const orderDetailUrl = `https://www.bling.com.br/Api/v3/pedidos/vendas/${order.id}`;
                const orderDetailResponse = await fetch(orderDetailUrl, {
                  headers: {
                    'Authorization': `Bearer ${integration.access_token}`,
                    'Accept': 'application/json'
                  }
                });

                if (orderDetailResponse.ok) {
                  const orderDetailData = await orderDetailResponse.json();
                  const fullOrderDetails = orderDetailData.data;

                  // Update shipment
                  const { error: updateError } = await supabase
                    .from('shipments')
                    .update({
                      bling_order_id: order.id.toString(),
                      bling_volume_id: volume.id.toString(),
                      volume_numero: volumeIndex + 1,
                      total_volumes: order.transporte.volumes.length
                    })
                    .eq('id', shipment.id);

                  if (updateError) {
                    console.error(`❌ Error updating shipment: ${updateError.message}`);
                  } else {
                    console.log(`✅ Updated shipment ${shipment.id}`);
                    associated++;

                    // Upsert to bling_order_details
                    const { error: upsertError } = await supabase
                      .from('bling_order_details')
                      .upsert({
                        customer_id: customerId,
                        bling_order_id: order.id.toString(),
                        order_number: fullOrderDetails.numero || order.numero,
                        order_date: fullOrderDetails.data || order.data,
                        total_value: fullOrderDetails.total,
                        status: fullOrderDetails.situacao?.valor,
                        contact_name: fullOrderDetails.contato?.nome,
                        contact_email: fullOrderDetails.contato?.email,
                        contact_phone: fullOrderDetails.contato?.celular || fullOrderDetails.contato?.telefone,
                        delivery_address: fullOrderDetails.contato?.endereco,
                        carrier_name: fullOrderDetails.transporte?.transportadora?.nome,
                        tracking_code: trackingCode,
                        freight_value: fullOrderDetails.transporte?.frete,
                        items: fullOrderDetails.itens,
                        full_data: fullOrderDetails
                      }, {
                        onConflict: 'customer_id,bling_order_id'
                      });

                    if (upsertError) {
                      console.error(`❌ Error upserting order details: ${upsertError.message}`);
                    }
                  }
                }

            found = true;
            break;
          }
        }

        if (found) break;
      }

      if (!found) {
        console.log(`⚠️ No match found for tracking: ${shipment.tracking_code}`);
        notFound++;
      }
    }

    const summary = {
      success: true,
      processed,
      associated,
      notFound,
      message: `Processed ${processed} shipments: ${associated} associated, ${notFound} not found`
    };

    console.log('\n📊 Summary:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error associating legacy shipments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
