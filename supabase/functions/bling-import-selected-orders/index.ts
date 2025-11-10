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
    console.log('[BLING-IMPORT-SELECTED] Starting import of selected orders');

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

    // Parse request body
    const body = await req.json();
    const { orderIds } = body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhum pedido selecionado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[BLING-IMPORT-SELECTED] Importing ${orderIds.length} orders`);

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

    let ordersImported = 0;
    let ordersFailed = 0;
    const errors: string[] = [];

    // Fetch each order details from Bling and import
    for (const orderId of orderIds) {
      try {
        console.log(`[BLING-IMPORT-SELECTED] Fetching order ${orderId} details`);
        
        const orderResponse = await fetch(
          `https://www.bling.com.br/Api/v3/pedidos/vendas/${orderId}`,
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

        // Check if order has tracking code
        if (!order.transporte?.codigoRastreamento) {
          console.log(`[BLING-IMPORT-SELECTED] Order ${order.numero} has no tracking code, skipping`);
          ordersFailed++;
          errors.push(`Pedido ${order.numero} não tem código de rastreamento`);
          continue;
        }

        const trackingCode = order.transporte.codigoRastreamento;

        // Check if already exists
        const { data: existingShipment } = await supabase
          .from('shipments')
          .select('id')
          .eq('customer_id', customerId)
          .eq('tracking_code', trackingCode)
          .single();

        if (existingShipment) {
          console.log(`[BLING-IMPORT-SELECTED] Order ${order.numero} already tracked`);
          ordersFailed++;
          errors.push(`Pedido ${order.numero} já está sendo rastreado`);
          continue;
        }

        // Create shipment_customer if needed
        let shipmentCustomerId = null;
        if (order.contato) {
          const { data: newCustomer, error: customerError } = await supabase
            .from('shipment_customers')
            .insert({
              customer_id: customerId,
              first_name: order.contato.nome?.split(' ')[0] || '',
              last_name: order.contato.nome?.split(' ').slice(1).join(' ') || '',
              email: order.contato.email || '',
              phone: order.contato.celular || order.contato.telefone || '',
            })
            .select('id')
            .single();

          if (!customerError && newCustomer) {
            shipmentCustomerId = newCustomer.id;
          }
        }

        // Create shipment
        const { error: insertError } = await supabase
          .from('shipments')
          .insert({
            customer_id: customerId,
            tracking_code: trackingCode,
            shipment_customer_id: shipmentCustomerId,
            auto_tracking: true,
            status: 'pending',
            shipment_data: order,
          });

        if (insertError) {
          console.error(`[BLING-IMPORT-SELECTED] Error creating shipment for order ${order.numero}:`, insertError);
          ordersFailed++;
          errors.push(`Erro ao criar rastreamento para pedido ${order.numero}`);
        } else {
          ordersImported++;
          console.log(`[BLING-IMPORT-SELECTED] Successfully imported order ${order.numero}`);
        }

      } catch (orderError) {
        console.error(`[BLING-IMPORT-SELECTED] Error processing order ${orderId}:`, orderError);
        ordersFailed++;
        errors.push(`Erro ao processar pedido ${orderId}`);
      }
    }

    console.log(`[BLING-IMPORT-SELECTED] Import completed: ${ordersImported} imported, ${ordersFailed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        imported: ordersImported,
        failed: ordersFailed,
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
      JSON.stringify({ error: 'Erro ao importar pedidos selecionados' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
