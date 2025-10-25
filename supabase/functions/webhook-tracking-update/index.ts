import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { 
  getNotificationTypeFromStatus,
  STATUS_TITLES,
  STATUS_TRANSLATIONS,
  isValidStatusMilestone,
  type NotificationType,
  type StatusMilestone
} from '../_shared/status-mappings.ts';

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

        // Buscar shipment pelo tracker_id (incluir tracking_events para merge)
        const { data: shipment, error: fetchError } = await supabase
          .from('shipments')
          .select('id, customer_id, tracking_code, tracking_events, shipment_customer_id')
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

        // Buscar eventos existentes
        const existingEvents = (shipment as any).tracking_events || [];
        
        // Combinar eventos existentes com novos (evitar duplicatas por eventId)
        const eventMap = new Map();
        
        // Adicionar eventos existentes ao map
        for (const event of existingEvents) {
          if (event.eventId) {
            eventMap.set(event.eventId, event);
          }
        }
        
        // Adicionar/atualizar com novos eventos
        for (const event of enrichedEvents) {
          if (event.eventId) {
            eventMap.set(event.eventId, event);
          }
        }
        
        // Converter map para array e ordenar por datetime (mais recente primeiro)
        const combinedEvents = Array.from(eventMap.values()).sort((a, b) => {
          const dateA = new Date(a.datetime || a.occurrenceDatetime).getTime();
          const dateB = new Date(b.datetime || b.occurrenceDatetime).getTime();
          return dateB - dateA; // Ordem decrescente (mais recente primeiro)
        });

        // Atualizar shipment
        const { error: updateError } = await supabase
          .from('shipments')
          .update({
            tracking_events: combinedEvents,
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
        const latestEvent = combinedEvents[0]; // Evento mais recente
        const statusMilestone = tracking.shipment.statusMilestone as StatusMilestone;
        
        // Validação e logging
        if (!isValidStatusMilestone(statusMilestone)) {
          console.warn(`⚠️ Status milestone desconhecido: ${statusMilestone}`);
        }
        
        const notificationType = getNotificationTypeFromStatus(statusMilestone);
        const notificationTitle = STATUS_TITLES[statusMilestone] || '📦 Atualização de rastreamento';
        console.log(`📍 Milestone: ${statusMilestone} → Notification: ${notificationType}`);
        
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
              const formatDate = (dateStr: string | null) => {
                if (!dateStr) return '';
                return new Date(dateStr).toLocaleDateString('pt-BR');
              };
              
              const formatDateTime = (dateStr: string | null) => {
                if (!dateStr) return '';
                return new Date(dateStr).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              };
              
              const formatTime = (dateStr: string | null) => {
                if (!dateStr) return '';
                return new Date(dateStr).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
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
                  status_milestone: tracking.shipment.statusMilestone,
                  transportadora: latestEvent?.courierName || 'Transportadora',
                  localizacao: latestEvent?.location || 'Em trânsito',
                  data_atualizacao: formatDateTime(latestEvent?.datetime || new Date().toISOString()),
                  
                  // Evento Atual
                  evento_descricao: latestEvent?.status || '',
                  evento_data: formatDate(latestEvent?.datetime),
                  evento_hora: formatTime(latestEvent?.datetime),
                  evento_localizacao: latestEvent?.location || '',
                  
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
                
                // Enviar dados completos para N8N webhook
                await sendToN8NWebhook({
                  customer: {
                    full_name: `${shipmentCustomer.first_name} ${shipmentCustomer.last_name}`,
                    phone: shipmentCustomer.phone,
                  },
                  tracking: {
                    tracking_code: tracking.tracker.trackingNumber,
                    tracker_id: trackerId,
                    latest_event: latestEvent,
                  },
                  template: {
                    name: template.name,
                    content: processedMessage,
                  },
                  whatsapp_instance: whatsappInstance,
                });

                console.log(`Sent data to N8N webhook for template: ${template.name}`);
              }
            } else {
              console.log('No phone number found for shipment customer');
            }
          }
        } catch (templateError) {
          console.error('Error processing templates:', templateError);
          // Não falha o processo se templates falharem
        }

        results.push({
          trackerId,
          shipmentId: shipment.id,
          trackingCode: shipment.tracking_code,
          status: mapApiStatusToInternal(tracking.shipment.statusMilestone),
          eventsCount: combinedEvents.length,
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
