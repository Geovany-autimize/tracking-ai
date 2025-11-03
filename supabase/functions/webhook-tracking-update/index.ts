import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { 
  getNotificationTypeFromStatus,
  STATUS_TITLES,
  STATUS_TRANSLATIONS,
  isValidStatusMilestone,
  type NotificationType,
  type StatusMilestone
} from '../_shared/status-mappings.ts';

/**
 * Mescla eventos de rastreamento de forma consistente
 * Remove duplicatas e mantém ordem cronológica
 */
function mergeTrackingEvents(existingEvents: TrackingEvent[], newEvents: TrackingEvent[]): TrackingEvent[] {
  const eventMap = new Map<string, TrackingEvent>();
  
  // Adicionar eventos existentes
  for (const event of existingEvents) {
    if (event.eventId) {
      eventMap.set(event.eventId, event);
    }
  }
  
  // Adicionar/atualizar com novos eventos
  for (const event of newEvents) {
    if (event.eventId) {
      eventMap.set(event.eventId, event);
    }
  }
  
  // Ordenar por datetime (mais recente primeiro)
  return Array.from(eventMap.values()).sort((a, b) => {
    const dateA = new Date(a.datetime || a.occurrenceDatetime).getTime();
    const dateB = new Date(b.datetime || b.occurrenceDatetime).getTime();
    return dateB - dateA;
  });
}

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

interface TrackingData {
  metadata?: {
    generatedAt?: string | null;
    messageId?: string | null;
  };
  tracker: {
    trackerId: string;
    trackingNumber: string;
    shipmentReference?: string | null;
    clientTrackerId?: string | null;
    isSubscribed?: boolean;
    createdAt?: string | null;
  };
  shipment: {
    shipmentId?: string | null;
    statusCode?: string | null;
    statusCategory?: string | null;
    statusMilestone: string;
    originCountryCode?: string | null;
    destinationCountryCode?: string | null;
    delivery?: {
      estimatedDeliveryDate?: string | null;
      service?: string | null;
      signedBy?: string | null;
    };
    trackingNumbers?: Array<{ tn?: string | null }>;
    recipient?: {
      name?: string | null;
      address?: string | null;
      postCode?: string | null;
      city?: string | null;
      subdivision?: string | null;
    };
  };
  events: TrackingEvent[];
  statistics?: {
    timestamps?: {
      infoReceivedDatetime?: string | null;
      inTransitDatetime?: string | null;
      outForDeliveryDatetime?: string | null;
      failedAttemptDatetime?: string | null;
      availableForPickupDatetime?: string | null;
      exceptionDatetime?: string | null;
      deliveredDatetime?: string | null;
    };
  };
}

interface WebhookPayload {
  body: {
    trackings: TrackingData[];
  };
}

const trackingEventSchema = z.object({
  eventId: z.string(),
  trackingNumber: z.string().max(150).nullable().optional(),
  eventTrackingNumber: z.string().max(150).nullable().optional(),
  status: z.string(),
  occurrenceDatetime: z.string(),
  datetime: z.string().nullable().optional(),
  hasNoTime: z.boolean().nullable().optional(),
  utcOffset: z.string().nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  sourceCode: z.string().max(200).nullable().optional(),
  courierCode: z.string().max(200).nullable().optional(),
  statusCode: z.string().nullable().optional(),
  statusCategory: z.string().nullable().optional(),
  statusMilestone: z.string().max(50),
  order: z.number().int().nullable().optional(),
}).passthrough();

const trackingDataSchema = z.object({
  metadata: z.object({
    generatedAt: z.string().optional().nullable(),
    messageId: z.string().optional().nullable(),
  }).optional(),
  tracker: z.object({
    trackerId: z.string().uuid(),
    trackingNumber: z.string().max(150),
    shipmentReference: z.string().optional().nullable(),
    clientTrackerId: z.string().optional().nullable(),
    isSubscribed: z.boolean().optional(),
    createdAt: z.string().optional().nullable(),
  }),
  shipment: z.object({
    shipmentId: z.string().optional().nullable(),
    statusCode: z.string().optional().nullable(),
    statusCategory: z.string().optional().nullable(),
    statusMilestone: z.string().max(50),
    originCountryCode: z.string().optional().nullable(),
    destinationCountryCode: z.string().optional().nullable(),
    delivery: z.object({
      estimatedDeliveryDate: z.string().optional().nullable(),
      service: z.string().optional().nullable(),
      signedBy: z.string().optional().nullable(),
    }).optional(),
    trackingNumbers: z.array(
      z.object({
        tn: z.string().max(150).optional().nullable(),
      }).passthrough()
    ).optional(),
    recipient: z.object({
      name: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      postCode: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      subdivision: z.string().optional().nullable(),
    }).optional(),
  }),
  events: z.array(trackingEventSchema).max(1000),
  statistics: z.object({
    timestamps: z.object({
      infoReceivedDatetime: z.string().optional().nullable(),
      inTransitDatetime: z.string().optional().nullable(),
      outForDeliveryDatetime: z.string().optional().nullable(),
      failedAttemptDatetime: z.string().optional().nullable(),
      availableForPickupDatetime: z.string().optional().nullable(),
      exceptionDatetime: z.string().optional().nullable(),
      deliveredDatetime: z.string().optional().nullable(),
    }).partial().optional(),
  }).optional(),
}).passthrough();

const webhookSchema = z.array(z.object({
  body: z.object({
    trackings: z.array(trackingDataSchema).max(100),
  }),
}).passthrough());

type ShipmentRecord = {
  id: string;
  customer_id: string;
  tracking_code: string;
  tracking_events: TrackingEvent[] | null;
  shipment_customer_id: string | null;
  tracker_id?: string | null;
};

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

// Prioridade de status milestones (maior = mais importante)
const STATUS_PRIORITY: Record<string, number> = {
  'delivered': 100,
  'out_for_delivery': 90,
  'failed_attempt': 80,
  'exception': 80,
  'available_for_pickup': 70,
  'in_transit': 50,
  'info_received': 30,
  'pending': 10,
  'expired': 5,
};

// Encontra o evento mais relevante considerando timestamp E prioridade de status
function getMostRelevantEvent(events: TrackingEvent[]): TrackingEvent | null {
  if (!events || events.length === 0) return null;
  
  // Ordenar por occurrenceDatetime (mais recente primeiro)
  const sortedByDate = [...events].sort((a, b) => {
    const dateA = new Date(a.occurrenceDatetime).getTime();
    const dateB = new Date(b.occurrenceDatetime).getTime();
    return dateB - dateA;
  });
  
  const mostRecent = sortedByDate[0];
  const mostRecentTime = new Date(mostRecent.occurrenceDatetime).getTime();
  
  // Considerar eventos no mesmo minuto (60 segundos de diferença)
  const sameMinuteEvents = sortedByDate.filter(event => {
    const eventTime = new Date(event.occurrenceDatetime).getTime();
    return Math.abs(mostRecentTime - eventTime) <= 60000; // 60 segundos
  });
  
  // Se há múltiplos eventos no mesmo minuto, usar prioridade de status
  if (sameMinuteEvents.length > 1) {
    return sameMinuteEvents.reduce((best, current) => {
      const currentPriority = STATUS_PRIORITY[current.statusMilestone] || 0;
      const bestPriority = STATUS_PRIORITY[best.statusMilestone] || 0;
      return currentPriority > bestPriority ? current : best;
    });
  }
  
  return mostRecent;
}

// Funções removidas - agora usamos o mapeamento centralizado de status-mappings.ts

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

// Processa template substituindo variáveis
function processTemplate(content: string, variables: Record<string, string>): string {
  let result = content;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  });
  return result;
}

// Função removida - agora usamos STATUS_TRANSLATIONS de status-mappings.ts

// Busca dados da instância WhatsApp
async function getWhatsAppInstanceData(customerId: string): Promise<any | null> {
  try {
    const response = await fetch('https://webhook-n8n.autimize.com.br/webhook/cbdf4e87-e7be-4064-b467-97d1275acc2b', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: customerId }),
    });

    if (!response.ok) {
      console.error('Failed to fetch WhatsApp instance data');
      return null;
    }

    const data = await response.json();
    const instanceData = data?.[0]?.data?.[0];
    
    return instanceData || null;
  } catch (error) {
    console.error('Error fetching WhatsApp instance data:', error);
    return null;
  }
}

// Envia dados para N8N webhook
async function sendToN8NWebhook(data: {
  customer: {
    full_name: string;
    phone: string;
  };
  tracking: {
    tracking_code: string;
    tracker_id: string;
    latest_event: any;
  };
  template: {
    name: string;
    content: string;
  };
  whatsapp_instance: any;
}): Promise<void> {
  const webhookUrl = 'https://webhook-n8n.autimize.com.br/webhook/037e0082-799c-4fd9-8521-0e3a60cc1eb8';
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.error('Failed to send data to N8N webhook:', await response.text());
    } else {
      console.log('Successfully sent data to N8N webhook');
    }
  } catch (error) {
    console.error('Error sending to N8N webhook:', error);
  }
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
      courierName: courierName ? String(courierName) : (event.courierCode || null)
    };
  });
}

type FindShipmentOptions = {
  persist: boolean;
  requestId?: string;
  correlationId?: string | null;
};

async function findShipmentForTracking(
  supabase: any,
  tracking: TrackingData,
  options: FindShipmentOptions = { persist: true }
): Promise<{ shipment: ShipmentRecord | null; relinked: boolean; error?: string }> {
  const trackerId = tracking.tracker.trackerId;
  const selectColumns =
    'id, customer_id, tracking_code, tracking_events, shipment_customer_id, tracker_id, created_at';
  const { persist, requestId, correlationId } = options;

  // Buscar por tracker_id primeiro
  const trackerQuery = supabase
    .from('shipments')
    .select(selectColumns)
    .eq('tracker_id', trackerId)
    .order('created_at', { ascending: false })
    .limit(1);

  let { data: shipment, error } = await trackerQuery.maybeSingle();

  if (error) {
    console.error(`Error fetching shipment by tracker_id ${trackerId}:`, error);
    return { shipment: null, relinked: false, error: error.message };
  }

  if (shipment) {
    return { shipment, relinked: false };
  }

  // Fallback: buscar por tracking_code/trackingNumbers conhecidos
  const candidateCodes = new Set<string>();
  if (tracking.tracker.trackingNumber) {
    candidateCodes.add(tracking.tracker.trackingNumber);
  }
  (tracking.shipment?.trackingNumbers || []).forEach((item) => {
    if (item?.tn) {
      candidateCodes.add(item.tn);
    }
  });

  if (candidateCodes.size === 0) {
    return { shipment: null, relinked: false };
  }

  const trackingQuery = supabase
    .from('shipments')
    .select(selectColumns)
    .in('tracking_code', Array.from(candidateCodes))
    .order('created_at', { ascending: false })
    .limit(1);

  const {
    data: fallbackShipment,
    error: fallbackError,
  } = await trackingQuery.maybeSingle();

  if (fallbackError) {
    console.error(
      `Error fetching shipment by tracking_code for trackerId ${trackerId}:`,
      fallbackError
    );
    return { shipment: null, relinked: false, error: fallbackError.message };
  }

  if (!fallbackShipment) {
    return { shipment: null, relinked: false };
  }

  // Atualizar tracker_id se estiver vazio ou diferente
  if (!fallbackShipment.tracker_id || fallbackShipment.tracker_id !== trackerId) {
    if (persist) {
      const { error: updateTrackerError } = await supabase
        .from('shipments')
        .update({ tracker_id: trackerId })
        .eq('id', fallbackShipment.id);

      if (updateTrackerError) {
        console.error(
          `Failed to link trackerId ${trackerId} with shipment ${fallbackShipment.id}:`,
          updateTrackerError
        );
        // Ainda retornamos o shipment sem relinked para não interromper o fluxo,
        // mas registramos o erro.
        return {
          shipment: fallbackShipment,
          relinked: false,
          error: `Failed to persist tracker_id: ${updateTrackerError.message}`,
        };
      }

      fallbackShipment.tracker_id = trackerId;
      return { shipment: fallbackShipment, relinked: true };
    } else {
      console.log(
        `[${requestId ?? 'dry-run'}] [${correlationId ?? trackerId}] Dry-run: skipping tracker_id relink for shipment ${fallbackShipment.id}`
      );
      return { shipment: fallbackShipment, relinked: false };
    }
  }

  return { shipment: fallbackShipment, relinked: false };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestId = crypto.randomUUID();
    const url = new URL(req.url);
    const isDryRun = req.headers.get('x-dry-run') === '1' || url.searchParams.get('dry') === '1';

    console.log(`[${requestId}] Webhook received - processing tracking updates (dryRun=${isDryRun})`);

    // Validate webhook authentication
    const authHeader = req.headers.get('authorization');
    const expectedToken = Deno.env.get('SHIP24_WEBHOOK_SECRET');
    
    if (!expectedToken) {
      console.error(`[${requestId}] SHIP24_WEBHOOK_SECRET not configured`);
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      console.warn(`[${requestId}] Unauthorized webhook attempt`, { 
        hasAuth: !!authHeader,
        ip: req.headers.get('x-forwarded-for') || 'unknown'
      });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse and validate webhook payload
    let rawPayload: unknown;
    try {
      rawPayload = await req.json();
    } catch (e) {
      console.error(`[${requestId}] Invalid JSON payload:`, e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalizar payload para lidar com payloads inválidos enviados como string ou objeto
    const normalizePayload = (input: unknown): WebhookPayload[] | null => {
      if (input == null) return null;

      // Algumas integrações enviam o corpo como string JSON
      if (typeof input === 'string') {
        try {
          return normalizePayload(JSON.parse(input));
        } catch (error) {
          console.error('Failed to parse payload string:', error);
          return null;
        }
      }

      if (Array.isArray(input)) {
        return input.map((item) => {
          if (item && typeof item === 'object' && 'body' in item) {
            const casted = item as Record<string, unknown>;
            const body = casted.body;
            if (typeof body === 'string') {
              try {
                casted.body = JSON.parse(body);
              } catch (error) {
                console.error('Failed to parse item.body string:', error);
                casted.body = {};
              }
            }
            return casted as unknown as WebhookPayload;
          }
          return { body: { trackings: [] } } as WebhookPayload;
        });
      }

      // Caso venha um objeto simples com body
      if (typeof input === 'object' && 'body' in (input as Record<string, unknown>)) {
        return normalizePayload([input]);
      }

      return null;
    };

    const normalizedPayload = normalizePayload(rawPayload);

    if (!normalizedPayload) {
      console.error(`[${requestId}] Could not normalize payload:`, rawPayload);
      return new Response(
        JSON.stringify({ error: 'Invalid payload format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(normalizedPayload) || normalizedPayload.length === 0) {
      console.error(`[${requestId}] Invalid payload format - empty array`, normalizedPayload);
      return new Response(
        JSON.stringify({ error: 'Invalid payload format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate payload structure with Zod
    const validation = webhookSchema.safeParse(normalizedPayload);
    
    if (!validation.success) {
      const flat = validation.error.flatten();
      console.error(`[${requestId}] Invalid payload structure:`, flat);
      return new Response(
        JSON.stringify({ error: 'Invalid payload structure' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const payload = validation.data;

    const totalTrackings = payload.reduce((acc, item) => acc + (item.body?.trackings?.length ?? 0), 0);
    console.log(`[${requestId}] Normalized payload envelopes=${payload.length} trackings=${totalTrackings}`);
    if (isDryRun) {
      console.log(`[${requestId}] Dry-run mode enabled - no database or external side effects will be executed`);
    }

    const webhookData = payload[0];
    
    if (!webhookData.body?.trackings || !Array.isArray(webhookData.body.trackings)) {
      console.error(`[${requestId}] No trackings found in payload`);
      return new Response(
        JSON.stringify({ error: 'No trackings found in payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Processing ${webhookData.body.trackings.length} tracking update(s)...`);

    const results = [];
    const errors = [];
    const shouldPersist = !isDryRun;

    for (const tracking of webhookData.body.trackings) {
      const trackerId = tracking.tracker.trackerId;
      const correlationId = tracking.metadata?.messageId ?? trackerId;
      
      try {
        console.log(`[${requestId}] [${correlationId}] Processing trackerId: ${trackerId}`);

        const {
          shipment,
          relinked,
          error: fetchError,
        } = await findShipmentForTracking(supabase, tracking, {
          persist: shouldPersist,
          requestId,
          correlationId,
        });

        if (fetchError) {
          console.error(`[${requestId}] [${correlationId}] Error fetching shipment: ${fetchError}`);
          errors.push({ trackerId, correlationId, error: fetchError });
          continue;
        }

        if (!shipment) {
          console.warn(`[${requestId}] [${correlationId}] No shipment found for trackerId`);
          errors.push({ trackerId, correlationId, error: 'Shipment not found' });
          continue;
        }

        console.log(`[${requestId}] [${correlationId}] Found shipment ${shipment.id} for trackerId ${trackerId}`);
        if (relinked) {
          console.log(`[${requestId}] [${correlationId}] Linked shipment ${shipment.id} to trackerId ${trackerId} via tracking code`);
        }

        // Enriquecer eventos com nomes das transportadoras
        const enrichedEvents = await enrichEventsWithCourierNames(supabase, tracking.events);

        // Buscar eventos existentes e mesclar com novos
        const existingEvents = (shipment as any).tracking_events || [];
        const combinedEvents = mergeTrackingEvents(existingEvents, enrichedEvents);

        // Usar o evento mais relevante (considerando prioridade de status)
        const mostRelevantEvent = getMostRelevantEvent(combinedEvents);
        if (!mostRelevantEvent) {
          console.error('No relevant event found');
          continue;
        }
        
        const statusMilestone = mostRelevantEvent.statusMilestone as StatusMilestone;
        console.log(`📦 Most relevant event: ${statusMilestone} at ${mostRelevantEvent.occurrenceDatetime} (from ${combinedEvents.length} events)`);

        // Atualizar shipment com status do evento mais relevante
        if (shouldPersist) {
          const { error: updateError } = await supabase
            .from('shipments')
            .update({
              tracking_events: combinedEvents,
              shipment_data: tracking.shipment,
              status: mapApiStatusToInternal(statusMilestone), // Usar status do evento mais recente
              last_update: new Date().toISOString(),
            })
            .eq('id', shipment.id);

          if (updateError) {
            console.error(`[${requestId}] [${correlationId}] Error updating shipment ${shipment.id}:`, updateError);
            errors.push({ trackerId, shipmentId: shipment.id, correlationId, error: updateError.message });
            continue;
          }
        } else {
          console.log(`[${requestId}] [${correlationId}] Dry-run: skipping shipment update for ${shipment.id}`);
        }

        console.log(`[${requestId}] [${correlationId}] Successfully processed shipment ${shipment.id}`);
        
        // Validação e logging
        if (!isValidStatusMilestone(statusMilestone)) {
          console.warn(`[${requestId}] [${correlationId}] ⚠️ Status milestone desconhecido: ${statusMilestone}`);
        }
        
        const notificationType = getNotificationTypeFromStatus(statusMilestone);
        const notificationTitle = STATUS_TITLES[statusMilestone] || '📦 Atualização de rastreamento';
        console.log(`[${requestId}] [${correlationId}] 📍 Milestone: ${statusMilestone} → Notification: ${notificationType}`);
        
        const notificationMessage = generateNotificationMessage(
          tracking.tracker.trackingNumber,
          mostRelevantEvent?.courierName || null,
          mostRelevantEvent?.location || null,
          statusMilestone
        );

        if (shouldPersist) {
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              customer_id: shipment.customer_id,
              shipment_id: shipment.id,
              tracking_code: tracking.tracker.trackingNumber,
              notification_type: notificationType,
              title: notificationTitle,
              message: notificationMessage,
              status_milestone: statusMilestone, // Usar o milestone do evento mais recente
              courier_name: mostRelevantEvent?.courierName || null,
              location: mostRelevantEvent?.location || null,
              is_read: false,
            });

          if (notificationError) {
            console.error(`[${requestId}] [${correlationId}] Failed to create notification for shipment ${shipment.id}:`, notificationError);
            // Não falha a atualização completa se a notificação falhar
          } else {
            console.log(`[${requestId}] [${correlationId}] Created notification for shipment ${shipment.id}`);
          }
        } else {
          console.log(`[${requestId}] [${correlationId}] Dry-run: skipping notification insert for shipment ${shipment.id}`);
        }

        // Processar e enviar templates de WhatsApp
        try {
          // Buscar templates ativos para este tipo de notificação
          const { data: templates, error: templatesError } = await supabase
            .from('message_templates')
            .select('*')
            .eq('customer_id', shipment.customer_id)
            .eq('is_active', true)
            .contains('notification_type', [notificationType]);

          if (templatesError) {
            console.error('Error fetching templates:', templatesError);
          } else if (templates && templates.length > 0) {
            console.log(`Found ${templates.length} active template(s) for notification type: ${notificationType}`);

            // Buscar dados do cliente final
            const { data: shipmentCustomer, error: customerError } = await supabase
              .from('shipment_customers')
              .select('*')
              .eq('id', shipment.shipment_customer_id)
              .maybeSingle();

            if (customerError) {
              console.error('Error fetching shipment customer:', customerError);
            } else if (shipmentCustomer && shipmentCustomer.phone) {
              // Buscar dados da instância WhatsApp
              const whatsappInstance = await getWhatsAppInstanceData(shipment.customer_id);
              
              // Funções auxiliares para formatação
              const formatDate = (dateStr: string | null | undefined) => {
                if (!dateStr) return '';
                const date = new Date(dateStr);
                return date.toLocaleDateString('pt-BR', {
                  timeZone: 'America/Sao_Paulo'
                });
              };
              
              const formatDateTime = (dateStr: string | null | undefined) => {
                if (!dateStr) return '';
                const date = new Date(dateStr);
                return date.toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/Sao_Paulo'
                });
              };
              
              const formatTime = (dateStr: string | null) => {
                if (!dateStr) return '';
                const date = new Date(dateStr);
                return date.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/Sao_Paulo'
                });
              };
              
              const calculateDaysInTransit = () => {
                const inTransitDate = tracking.statistics?.timestamps?.inTransitDatetime;
                if (!inTransitDate) return '';
                const days = Math.floor((Date.now() - new Date(inTransitDate).getTime()) / (1000 * 60 * 60 * 24));
                return days === 1 ? '1 dia' : `${days} dias`;
              };

              // Processar cada template
              for (const template of templates) {
                const templateVars = {
                  // Informações do Cliente
                  cliente_nome: `${shipmentCustomer.first_name} ${shipmentCustomer.last_name}`,
                  cliente_primeiro_nome: shipmentCustomer.first_name || '',
                  cliente_sobrenome: shipmentCustomer.last_name || '',
                  cliente_email: shipmentCustomer.email || '',
                  cliente_telefone: shipmentCustomer.phone || '',
                  
                  // Rastreamento
                  tracking_code: tracking.tracker.trackingNumber,
                  tracker_id: tracking.tracker.trackerId,
                  status: STATUS_TRANSLATIONS[statusMilestone] || 'Em processamento',
                  status_milestone: statusMilestone,
                  transportadora: mostRelevantEvent?.courierName || 'Transportadora',
                  localizacao: mostRelevantEvent?.location || 'Em trânsito',
                  data_atualizacao: formatDateTime(mostRelevantEvent?.occurrenceDatetime || new Date().toISOString()),
                  
                  // Evento Atual
                  evento_descricao: mostRelevantEvent?.status || '',
                  evento_data: formatDate(mostRelevantEvent?.occurrenceDatetime),
                  evento_hora: formatTime(mostRelevantEvent?.occurrenceDatetime),
                  evento_localizacao: mostRelevantEvent?.location || '',
                  
                  // Entrega
                  previsao_entrega: formatDate(tracking.shipment.delivery?.estimatedDeliveryDate),
                  endereco_entrega: tracking.shipment.recipient?.address || '',
                  cidade_entrega: tracking.shipment.recipient?.city || '',
                  estado_entrega: tracking.shipment.recipient?.subdivision || '',
                  cep_entrega: tracking.shipment.recipient?.postCode || '',
                  pais_origem: tracking.shipment.originCountryCode || '',
                  pais_destino: tracking.shipment.destinationCountryCode || '',
                  
                  // Informações Adicionais
                  dias_em_transito: calculateDaysInTransit(),
                  referencia_envio: tracking.tracker.shipmentReference || '',
                  assinado_por: tracking.shipment.delivery?.signedBy || '',
                  
                  // Datas do Processo
                  data_info_recebida: formatDateTime(tracking.statistics?.timestamps?.infoReceivedDatetime),
                  data_em_transito: formatDateTime(tracking.statistics?.timestamps?.inTransitDatetime),
                  data_saiu_entrega: formatDateTime(tracking.statistics?.timestamps?.outForDeliveryDatetime),
                  data_entregue: formatDateTime(tracking.statistics?.timestamps?.deliveredDatetime),
                  data_tentativa_falha: formatDateTime(tracking.statistics?.timestamps?.failedAttemptDatetime),
                  data_excecao: formatDateTime(tracking.statistics?.timestamps?.exceptionDatetime)
                };

                const processedMessage = processTemplate(template.message_content, templateVars);
                
                if (shouldPersist) {
                  await sendToN8NWebhook({
                    customer: {
                      full_name: `${shipmentCustomer.first_name} ${shipmentCustomer.last_name}`,
                      phone: shipmentCustomer.phone,
                    },
                    tracking: {
                      tracking_code: tracking.tracker.trackingNumber,
                      tracker_id: trackerId,
                      latest_event: mostRelevantEvent,
                    },
                    template: {
                      name: template.name,
                      content: processedMessage,
                    },
                    whatsapp_instance: whatsappInstance,
                  });

                  console.log(`[${requestId}] [${correlationId}] Sent data to N8N webhook for template: ${template.name}`);
                } else {
                  console.log(`[${requestId}] [${correlationId}] Dry-run: skipping N8N webhook call for template: ${template.name}`);
                }
              }
            } else {
              console.log(`[${requestId}] [${correlationId}] No phone number found for shipment customer`);
            }
          }
        } catch (templateError) {
          console.error(`[${requestId}] [${correlationId}] Error processing templates:`, templateError);
          // Não falha o processo se templates falharem
        }

        results.push({
          trackerId,
          shipmentId: shipment.id,
          trackingCode: shipment.tracking_code,
          status: mapApiStatusToInternal(tracking.shipment.statusMilestone),
          eventsCount: combinedEvents.length,
          dryRun: isDryRun,
          correlationId,
        });

      } catch (error) {
        console.error(`[${requestId}] [${correlationId}] Error processing trackerId ${trackerId}:`, error);
        errors.push({
          trackerId,
          correlationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const response = {
      success: errors.length === 0,
      dryRun: isDryRun,
      message: isDryRun
        ? `Dry-run: would process ${results.length} shipment(s)${errors.length > 0 ? `, ${errors.length} error(s)` : ''}`
        : `Processed ${results.length} shipment(s) successfully${errors.length > 0 ? `, ${errors.length} error(s)` : ''}`,
      updated: results,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log(`[${requestId}] Webhook processing completed:`, response);

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
