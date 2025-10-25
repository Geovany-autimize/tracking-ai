import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrackingEvent {
  eventId: string;
  trackingNumber: string;
  eventTrackingNumber: string;
  status: string;
  occurrenceDatetime: string;
  datetime: string;
  hasNoTime: boolean;
  utcOffset: string | null;
  location: string;
  sourceCode: string;
  courierCode: string;
  courierName?: string;
  statusCode: string | null;
  statusCategory: string | null;
  statusMilestone: string;
  order?: number | null;
}

interface TrackingData {
  metadata?: {
    generatedAt: string;
    messageId: string;
  };
  tracker: {
    trackerId: string;
    trackingNumber: string;
    shipmentReference: string | null;
    clientTrackerId: string | null;
    isSubscribed: boolean;
    createdAt: string;
  };
  shipment: {
    shipmentId: string;
    statusCode: string;
    statusCategory: string;
    statusMilestone: string;
    originCountryCode: string | null;
    destinationCountryCode: string | null;
    delivery: {
      estimatedDeliveryDate: string | null;
      service: string | null;
      signedBy: string | null;
    };
    trackingNumbers: Array<{ tn: string }>;
    recipient: {
      name: string | null;
      address: string | null;
      postCode: string | null;
      city: string | null;
      subdivision: string | null;
    };
  };
  events: TrackingEvent[];
  statistics: {
    timestamps: {
      infoReceivedDatetime: string | null;
      inTransitDatetime: string | null;
      outForDeliveryDatetime: string | null;
      failedAttemptDatetime: string | null;
      availableForPickupDatetime: string | null;
      exceptionDatetime: string | null;
      deliveredDatetime: string | null;
    };
  };
}

interface WebhookPayload {
  body: {
    trackings: TrackingData[];
  };
}

// Mapeia status da API para status interno
function mapApiStatusToInternal(statusMilestone: string): string {
  const statusMap: Record<string, string> = {
    'in_transit': 'in_transit',
    'out_for_delivery': 'out_for_delivery',
    'delivered': 'delivered',
    'exception': 'exception',
    'pending': 'pending',
    'failed_attempt': 'exception',
  };
  return statusMap[statusMilestone] || 'pending';
}

// Determina o tipo de notificação baseado no status milestone
function determineNotificationType(statusMilestone: string): string {
  if (statusMilestone === 'delivered') return 'delivery';
  if (statusMilestone === 'out_for_delivery') return 'out_for_delivery';
  if (statusMilestone === 'failed_attempt' || statusMilestone === 'exception') return 'exception';
  return 'status_update';
}

// Gera título de notificação
function generateNotificationTitle(statusMilestone: string): string {
  const titles: Record<string, string> = {
    'delivered': '✅ Pedido entregue',
    'out_for_delivery': '🚚 Pedido saiu para entrega',
    'in_transit': '📦 Pedido em trânsito',
    'failed_attempt': '⚠️ Tentativa de entrega falhou',
    'exception': '❌ Problema na entrega',
    'available_for_pickup': '📍 Pedido disponível para retirada',
    'info_received': '📋 Informação recebida',
  };
  return titles[statusMilestone] || '📦 Atualização de rastreamento';
}

// Gera mensagem de notificação
function generateNotificationMessage(
  trackingCode: string,
  courierName: string | null,
  location: string | null,
  statusMilestone: string
): string {
  let message = `Rastreio #${trackingCode}`;
  
  if (courierName) {
    message += ` com ${courierName}`;
  }
  
  if (location) {
    message += ` - ${location}`;
  }

  // Adiciona contexto baseado no status
  if (statusMilestone === 'delivered') {
    message = `Seu pedido foi entregue com sucesso! ${message}`;
  } else if (statusMilestone === 'out_for_delivery') {
    message = `Seu pedido está a caminho! ${message}`;
  } else if (statusMilestone === 'failed_attempt' || statusMilestone === 'exception') {
    message = `Houve um problema com a entrega. ${message}`;
  }
  
  return message;
}

// Enriquece eventos com nomes das transportadoras
async function enrichEventsWithCourierNames(
  supabase: any,
  events: TrackingEvent[]
): Promise<TrackingEvent[]> {
  if (!events || events.length === 0) return events;

  // Obter todos os courierCodes únicos
  const uniqueCourierCodes = [...new Set(events.map(e => e.courierCode).filter(Boolean))];
  
  if (uniqueCourierCodes.length === 0) return events;

  // Buscar nomes das transportadoras no banco
  const { data: couriers, error } = await supabase
    .from('couriers')
    .select('courier_code, courier_name')
    .in('courier_code', uniqueCourierCodes);

  if (error) {
    console.error('Error fetching courier names:', error);
    return events;
  }

  // Criar mapa de courierCode -> courierName
  const courierNameMap = new Map(
    (couriers || []).map((c: any) => [c.courier_code, c.courier_name])
  );

  // Enriquecer eventos com os nomes
  return events.map(event => {
    const courierName = courierNameMap.get(event.courierCode);
    return {
      ...event,
      courierName: courierName ? String(courierName) : event.courierCode
    };
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Webhook received - Processing tracking updates...');

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook payload
    const payload: WebhookPayload[] = await req.json();
    
    if (!Array.isArray(payload) || payload.length === 0) {
      console.error('Invalid payload format');
      return new Response(
        JSON.stringify({ error: 'Invalid payload format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookData = payload[0];
    
    if (!webhookData.body?.trackings || !Array.isArray(webhookData.body.trackings)) {
      console.error('No trackings found in payload');
      return new Response(
        JSON.stringify({ error: 'No trackings found in payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${webhookData.body.trackings.length} tracking update(s)...`);

    const results = [];
    const errors = [];

    for (const tracking of webhookData.body.trackings) {
      const trackerId = tracking.tracker.trackerId;
      
      try {
        console.log(`Processing trackerId: ${trackerId}`);

        // Buscar shipment pelo tracker_id
        const { data: shipment, error: fetchError } = await supabase
          .from('shipments')
          .select('id, customer_id, tracking_code')
          .eq('tracker_id', trackerId)
          .maybeSingle();

        if (fetchError) {
          console.error(`Error fetching shipment for trackerId ${trackerId}:`, fetchError);
          errors.push({ trackerId, error: fetchError.message });
          continue;
        }

        if (!shipment) {
          console.warn(`No shipment found for trackerId: ${trackerId}`);
          errors.push({ trackerId, error: 'Shipment not found' });
          continue;
        }

        console.log(`Found shipment ${shipment.id} for trackerId ${trackerId}`);

        // Enriquecer eventos com nomes das transportadoras
        const enrichedEvents = await enrichEventsWithCourierNames(supabase, tracking.events);

        // Atualizar shipment
        const { error: updateError } = await supabase
          .from('shipments')
          .update({
            tracking_events: enrichedEvents,
            shipment_data: tracking.shipment,
            status: mapApiStatusToInternal(tracking.shipment.statusMilestone),
            last_update: new Date().toISOString(),
          })
          .eq('id', shipment.id);

        if (updateError) {
          console.error(`Error updating shipment ${shipment.id}:`, updateError);
          errors.push({ trackerId, shipmentId: shipment.id, error: updateError.message });
          continue;
        }

        console.log(`Successfully updated shipment ${shipment.id}`);

        // Criar notificação para o cliente
        const latestEvent = enrichedEvents[0]; // Evento mais recente
        const notificationType = determineNotificationType(tracking.shipment.statusMilestone);
        const notificationTitle = generateNotificationTitle(tracking.shipment.statusMilestone);
        const notificationMessage = generateNotificationMessage(
          tracking.tracker.trackingNumber,
          latestEvent?.courierName || null,
          latestEvent?.location || null,
          tracking.shipment.statusMilestone
        );

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            customer_id: shipment.customer_id,
            shipment_id: shipment.id,
            tracking_code: tracking.tracker.trackingNumber,
            notification_type: notificationType,
            title: notificationTitle,
            message: notificationMessage,
            status_milestone: tracking.shipment.statusMilestone,
            courier_name: latestEvent?.courierName || null,
            location: latestEvent?.location || null,
            is_read: false,
          });

        if (notificationError) {
          console.error(`Failed to create notification for shipment ${shipment.id}:`, notificationError);
          // Não falha a atualização completa se a notificação falhar
        } else {
          console.log(`Created notification for shipment ${shipment.id}`);
        }

        results.push({
          trackerId,
          shipmentId: shipment.id,
          trackingCode: shipment.tracking_code,
          status: mapApiStatusToInternal(tracking.shipment.statusMilestone),
          eventsCount: enrichedEvents.length,
        });

      } catch (error) {
        console.error(`Error processing trackerId ${trackerId}:`, error);
        errors.push({
          trackerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const response = {
      success: errors.length === 0,
      message: `Processed ${results.length} shipment(s) successfully${errors.length > 0 ? `, ${errors.length} error(s)` : ''}`,
      updated: results,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('Webhook processing completed:', response);

    return new Response(
      JSON.stringify(response),
      { 
        status: errors.length === 0 ? 200 : 207,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
