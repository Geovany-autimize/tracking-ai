import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = Deno.env.get('APP_URL') || 'https://pvnwcxfnazwqpfasuztv.supabase.co';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log('[QUEUE-PROCESSOR] Starting queue processing...');

    // Buscar até 5 itens pendentes da fila (ordenados por prioridade e data)
    const { data: queueItems, error: fetchError } = await supabase
      .from('bling_sync_queue')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(5);

    if (fetchError) {
      console.error('[QUEUE-PROCESSOR] Error fetching queue:', fetchError);
      throw fetchError;
    }

    if (!queueItems || queueItems.length === 0) {
      console.log('[QUEUE-PROCESSOR] No pending items in queue');
      return new Response(
        JSON.stringify({ message: 'No pending items', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[QUEUE-PROCESSOR] Processing ${queueItems.length} queue items`);

    const results = [];

    for (const item of queueItems) {
      try {
        console.log(`[QUEUE-PROCESSOR] Processing customer ${item.customer_id}`);

        // Atualizar status para "processing"
        await supabase
          .from('bling_sync_queue')
          .update({ 
            status: 'processing', 
            started_at: new Date().toISOString() 
          })
          .eq('id', item.id);

        // Verificar se o cliente tem integração Bling ativa
        const { data: integration } = await supabase
          .from('bling_integrations')
          .select('*')
          .eq('customer_id', item.customer_id)
          .eq('status', 'active')
          .single();

        if (!integration) {
          console.log(`[QUEUE-PROCESSOR] No active Bling integration for customer ${item.customer_id}`);
          await supabase
            .from('bling_sync_queue')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString(),
              new_orders_count: 0
            })
            .eq('id', item.id);
          continue;
        }

        // Buscar novos pedidos via webhook do n8n
        console.log(`[QUEUE-PROCESSOR] Fetching Bling orders for customer ${item.customer_id}`);
        
        // Fazer requisição ao webhook do n8n
        const webhookUrl = `${APP_URL}/api/bling-webhook`;
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: item.customer_id,
            access_token: integration.access_token
          })
        });

        if (!webhookResponse.ok) {
          throw new Error(`Webhook error: ${webhookResponse.status}`);
        }

        const webhookData = await webhookResponse.json();
        const blingOrders = Array.isArray(webhookData) ? webhookData : [];

        console.log(`[QUEUE-PROCESSOR] Fetched ${blingOrders.length} orders from Bling`);

        // Buscar shipments existentes para comparar
        const { data: existingShipments } = await supabase
          .from('shipments')
          .select('bling_order_id, bling_volume_id')
          .eq('customer_id', item.customer_id)
          .not('bling_order_id', 'is', null);

        const existingSet = new Set(
          (existingShipments || []).map(s => `${s.bling_order_id}-${s.bling_volume_id}`)
        );

        // Detectar novos pedidos/volumes
        let newOrdersCount = 0;
        for (const order of blingOrders) {
          const orderId = order.id || order.orderId;
          const volumeId = order.volumeId || order.bling_volume_id;
          
          if (orderId && volumeId) {
            const key = `${orderId}-${volumeId}`;
            if (!existingSet.has(key)) {
              newOrdersCount++;
            }
          }
        }

        console.log(`[QUEUE-PROCESSOR] Found ${newOrdersCount} new orders for customer ${item.customer_id}`);

        // Se houver novos pedidos, criar notificação
        if (newOrdersCount > 0) {
          await supabase
            .from('notifications')
            .insert({
              customer_id: item.customer_id,
              shipment_id: '00000000-0000-0000-0000-000000000000', // Placeholder
              notification_type: 'new_bling_orders',
              title: 'Novos pedidos disponíveis',
              message: `Você tem ${newOrdersCount} novo${newOrdersCount > 1 ? 's' : ''} pedido${newOrdersCount > 1 ? 's' : ''} do Bling que pode${newOrdersCount > 1 ? 'm' : ''} ser importado${newOrdersCount > 1 ? 's' : ''}.`,
              tracking_code: 'BLING_SYNC',
              is_read: false
            });

          console.log(`[QUEUE-PROCESSOR] Created notification for ${newOrdersCount} new orders`);
        }

        // Marcar como completo
        await supabase
          .from('bling_sync_queue')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            new_orders_count: newOrdersCount,
            retry_count: 0
          })
          .eq('id', item.id);

        results.push({ customer_id: item.customer_id, success: true, new_orders: newOrdersCount });

        // Rate limiting: aguardar 2 segundos entre cada processamento
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`[QUEUE-PROCESSOR] Error processing customer ${item.customer_id}:`, error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const retryCount = item.retry_count + 1;
        const shouldRetry = retryCount < item.max_retries;

        await supabase
          .from('bling_sync_queue')
          .update({ 
            status: shouldRetry ? 'pending' : 'failed',
            retry_count: retryCount,
            last_error: errorMessage,
            completed_at: shouldRetry ? null : new Date().toISOString()
          })
          .eq('id', item.id);

        results.push({ customer_id: item.customer_id, success: false, error: errorMessage });
      }
    }

    console.log(`[QUEUE-PROCESSOR] Finished processing ${results.length} items`);

    return new Response(
      JSON.stringify({ 
        message: 'Queue processing completed',
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[QUEUE-PROCESSOR] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});