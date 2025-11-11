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
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Fetch orders from Bling
    console.log(`[BLING-FETCH-ORDERS] Fetching page ${page} with limit ${limit}`);
    const ordersResponse = await fetch(
      `https://www.bling.com.br/Api/v3/pedidos/vendas?pagina=${page}&limite=${limit}`,
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
    
    // Enrich each order with full details
    const enrichedOrders = await Promise.all(
      (ordersData.data || []).map(async (order: any) => {
        try {
          // Fetch full order details
          console.log(`[BLING-FETCH-ORDERS] Fetching details for order ${order.id}`);
          const detailsResponse = await fetch(
            `https://www.bling.com.br/Api/v3/pedidos/vendas/${order.id}`,
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
            const nfeResponse = await fetch(
              `https://www.bling.com.br/Api/v3/pedidos/vendas/${order.id}/notas-fiscais`,
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

          return {
            id: fullDetails.id,
            numero: fullDetails.numero,
            data: fullDetails.data,
            valor: fullDetails.valor,
            situacao: fullDetails.situacao,
            contato: fullDetails.contato,
            transporte: fullDetails.transporte,
            itens: fullDetails.itens || [],
            endereco: fullDetails.contato?.endereco || null,
            notaFiscal: nfeData,
            codigoRastreamento: fullDetails.transporte?.codigoRastreamento,
            isTracked: fullDetails.transporte?.codigoRastreamento 
              ? false // Will be checked below
              : false,
            fullData: fullDetails,
          };
        } catch (error) {
          console.error(`[BLING-FETCH-ORDERS] Error enriching order ${order.id}:`, error);
          // Return basic order data on error
          return {
            id: order.id,
            numero: order.numero,
            data: order.data,
            valor: order.valor,
            situacao: order.situacao,
            contato: order.contato,
            transporte: order.transporte,
            codigoRastreamento: order.transporte?.codigoRastreamento,
            isTracked: false,
            fullData: order,
          };
        }
      })
    );

    // Get existing shipments to mark which orders are already tracked
    const { data: existingShipments } = await supabase
      .from('shipments')
      .select('tracking_code')
      .eq('customer_id', customerId);

    const trackedCodes = new Set(existingShipments?.map(s => s.tracking_code) || []);

    // Mark which orders are tracked
    enrichedOrders.forEach((order: any) => {
      order.isTracked = order.codigoRastreamento 
        ? trackedCodes.has(order.codigoRastreamento)
        : false;
    });

    console.log(`[BLING-FETCH-ORDERS] Successfully enriched ${enrichedOrders.length} orders`);

    return new Response(
      JSON.stringify({
        success: true,
        orders: enrichedOrders,
        total: enrichedOrders.length,
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
