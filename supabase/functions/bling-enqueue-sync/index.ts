import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log('[ENQUEUE-SYNC] Starting enqueue process...');

    // Buscar todos os clientes com integração Bling ativa
    const { data: integrations, error: fetchError } = await supabase
      .from('bling_integrations')
      .select('customer_id, status')
      .eq('status', 'active');

    if (fetchError) {
      console.error('[ENQUEUE-SYNC] Error fetching integrations:', fetchError);
      throw fetchError;
    }

    if (!integrations || integrations.length === 0) {
      console.log('[ENQUEUE-SYNC] No active Bling integrations found');
      return new Response(
        JSON.stringify({ message: 'No active integrations', enqueued: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ENQUEUE-SYNC] Found ${integrations.length} active integrations`);

    // Verificar quais clientes já estão na fila com status pending ou processing
    const { data: existingQueue } = await supabase
      .from('bling_sync_queue')
      .select('customer_id')
      .in('status', ['pending', 'processing']);

    const existingCustomerIds = new Set(
      (existingQueue || []).map(q => q.customer_id)
    );

    // Filtrar clientes que não estão na fila
    const customersToEnqueue = integrations.filter(
      integration => !existingCustomerIds.has(integration.customer_id)
    );

    if (customersToEnqueue.length === 0) {
      console.log('[ENQUEUE-SYNC] All customers already in queue');
      return new Response(
        JSON.stringify({ message: 'All customers already queued', enqueued: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Adicionar clientes à fila
    const queueEntries = customersToEnqueue.map(integration => ({
      customer_id: integration.customer_id,
      status: 'pending',
      priority: 0
    }));

    const { error: insertError } = await supabase
      .from('bling_sync_queue')
      .insert(queueEntries);

    if (insertError) {
      console.error('[ENQUEUE-SYNC] Error inserting queue entries:', insertError);
      throw insertError;
    }

    console.log(`[ENQUEUE-SYNC] Successfully enqueued ${queueEntries.length} customers`);

    return new Response(
      JSON.stringify({ 
        message: 'Customers enqueued successfully',
        enqueued: queueEntries.length,
        total_active: integrations.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ENQUEUE-SYNC] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});