import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrackingEvent {
  eventId: string;
  trackingNumber?: string | null;
  eventTrackingNumber?: string | null;
  status: string;
  occurrenceDatetime: string;
  datetime?: string | null;
  hasNoTime?: boolean | null;
  utcOffset?: string | null;
  location?: string | null;
  sourceCode?: string | null;
  courierCode?: string | null;
  courierName?: string | null;
  statusCode?: string | null;
  statusCategory?: string | null;
  statusMilestone: string;
  order?: number | null;
}

function mergeTrackingEvents(existingEvents: TrackingEvent[], newEvents: TrackingEvent[]): TrackingEvent[] {
  const eventMap = new Map<string, TrackingEvent>();
  
  for (const event of existingEvents) {
    if (event.eventId) {
      eventMap.set(event.eventId, event);
    }
  }
  
  for (const event of newEvents) {
    if (event.eventId) {
      eventMap.set(event.eventId, event);
    }
  }
  
  return Array.from(eventMap.values()).sort((a, b) => {
    const dateA = new Date(a.datetime || a.occurrenceDatetime).getTime();
    const dateB = new Date(b.datetime || b.occurrenceDatetime).getTime();
    return dateB - dateA;
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ship24ApiKey = Deno.env.get('SHIP24_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[REFRESH-TRACKINGS] Starting automatic tracking refresh');

    // Buscar shipments ativos (não entregues) com auto_tracking habilitado
    // e que não foram atualizados nas últimas 6 horas
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    
    const { data: activeShipments, error: shipmentsError } = await supabase
      .from('shipments')
      .select('id, tracking_code, tracker_id, status, last_update, tracking_events, customer_id')
      .eq('auto_tracking', true)
      .not('status', 'in', '(delivered,cancelled)')
      .or(`last_update.is.null,last_update.lt.${sixHoursAgo}`)
      .limit(50); // Processar no máximo 50 por vez

    if (shipmentsError) {
      console.error('[REFRESH-TRACKINGS] Error fetching shipments:', shipmentsError);
      throw shipmentsError;
    }

    if (!activeShipments || activeShipments.length === 0) {
      console.log('[REFRESH-TRACKINGS] No active shipments to refresh');
      return new Response(
        JSON.stringify({ message: 'No active shipments to refresh', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[REFRESH-TRACKINGS] Found ${activeShipments.length} shipments to refresh`);

    let updatedCount = 0;
    let errorCount = 0;

    // Processar cada shipment
    for (const shipment of activeShipments) {
      try {
        console.log(`[REFRESH-TRACKINGS] Updating tracking ${shipment.tracking_code}`);

        let ship24Url: string;
        let ship24Method: string;

        if (shipment.tracker_id) {
          // Se já tem tracker_id, fazer atualização
          ship24Url = `https://api.ship24.com/public/v1/trackers/${shipment.tracker_id}`;
          ship24Method = 'GET';
        } else {
          // Se não tem tracker_id, criar novo tracker
          ship24Url = 'https://api.ship24.com/public/v1/trackers/track';
          ship24Method = 'POST';
        }

        // Chamar API Ship24
        const ship24Response = await fetch(ship24Url, {
          method: ship24Method,
          headers: {
            'Authorization': `Bearer ${ship24ApiKey}`,
            'Content-Type': 'application/json',
          },
          ...(ship24Method === 'POST' ? { body: JSON.stringify({ trackingNumber: shipment.tracking_code }) } : {}),
        });

        if (!ship24Response.ok) {
          const errorText = await ship24Response.text();
          console.error(`[REFRESH-TRACKINGS] Ship24 API error for ${shipment.tracking_code}:`, errorText);
          errorCount++;
          continue;
        }

        const trackingResponse = await ship24Response.json();
        console.log(`[REFRESH-TRACKINGS] Ship24 response for ${shipment.tracking_code}:`, JSON.stringify(trackingResponse).substring(0, 200));

        // Extrair dados do tracking
        const data = trackingResponse.data || trackingResponse;
        const tracker = data.tracker || {};
        const shipmentInfo = data.shipment || {};
        const events = data.events || [];
        const statistics = data.statistics || {};

        // Determinar novo status
        let newStatus = shipment.status;
        const statusMilestone = shipmentInfo.statusMilestone;

        if (statusMilestone) {
          // Mapear statusMilestone para nosso status interno
          const statusMap: Record<string, string> = {
            'info_received': 'pending',
            'in_transit': 'in_transit',
            'out_for_delivery': 'out_for_delivery',
            'delivered': 'delivered',
            'failed_attempt': 'exception',
            'exception': 'exception',
            'expired': 'expired',
            'available_for_pickup': 'available_for_pickup',
          };
          newStatus = statusMap[statusMilestone] || shipment.status;
        }

        // Mesclar eventos existentes com novos
        const existingEvents = (shipment.tracking_events as TrackingEvent[]) || [];
        const mergedEvents = mergeTrackingEvents(existingEvents, events);

        // Preparar dados de atualização
        const updateData: any = {
          last_update: new Date().toISOString(),
          status: newStatus,
          tracking_events: mergedEvents,
          shipment_data: {
            tracker,
            shipment: shipmentInfo,
            statistics,
          },
        };

        // Salvar tracker_id se não tinha
        if (!shipment.tracker_id && tracker.trackerId) {
          updateData.tracker_id = tracker.trackerId;
        }

        // Atualizar shipment no banco
        const { error: updateError } = await supabase
          .from('shipments')
          .update(updateData)
          .eq('id', shipment.id);

        if (updateError) {
          console.error(`[REFRESH-TRACKINGS] Error updating shipment ${shipment.tracking_code}:`, updateError);
          errorCount++;
          continue;
        }

        // Se o status mudou para delivered, criar notificação
        if (newStatus === 'delivered' && shipment.status !== 'delivered') {
          console.log(`[REFRESH-TRACKINGS] Creating delivery notification for ${shipment.tracking_code}`);
          
          const courierName = events[0]?.courierName || 'Transportadora';
          
          await supabase.from('notifications').insert({
            customer_id: shipment.customer_id,
            shipment_id: shipment.id,
            tracking_code: shipment.tracking_code,
            notification_type: 'delivered',
            title: '✅ Pedido entregue',
            message: `Seu pedido foi entregue! Rastreio #${shipment.tracking_code} com ${courierName}`,
            status_milestone: 'delivered',
            courier_name: courierName,
          });
        }

        updatedCount++;
        console.log(`[REFRESH-TRACKINGS] Successfully updated ${shipment.tracking_code}`);

        // Pequeno delay entre requisições para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`[REFRESH-TRACKINGS] Error processing shipment ${shipment.tracking_code}:`, error);
        errorCount++;
      }
    }

    console.log(`[REFRESH-TRACKINGS] Completed: ${updatedCount} updated, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        message: 'Tracking refresh completed',
        total: activeShipments.length,
        updated: updatedCount,
        errors: errorCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[REFRESH-TRACKINGS] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
