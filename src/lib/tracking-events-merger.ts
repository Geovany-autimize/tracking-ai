/**
 * Utilitário para mesclar eventos de rastreamento de forma consistente
 * Garante que não haja duplicatas e mantém ordem cronológica
 */

export interface TrackingEvent {
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

/**
 * Mescla eventos de rastreamento existentes com novos eventos
 * Remove duplicatas baseado no eventId e ordena por data (mais recente primeiro)
 */
export function mergeTrackingEvents(
  existingEvents: TrackingEvent[],
  newEvents: TrackingEvent[]
): TrackingEvent[] {
  // Criar map para remover duplicatas (eventId é único)
  const eventMap = new Map<string, TrackingEvent>();
  
  // Adicionar eventos existentes ao map
  for (const event of existingEvents) {
    if (event.eventId) {
      eventMap.set(event.eventId, event);
    }
  }
  
  // Adicionar/atualizar com novos eventos (sobrescreve se eventId já existe)
  for (const event of newEvents) {
    if (event.eventId) {
      eventMap.set(event.eventId, event);
    }
  }
  
  // Converter map para array e ordenar por occurrenceDatetime (mais recente primeiro)
  const mergedEvents = Array.from(eventMap.values()).sort((a, b) => {
    const dateA = new Date(a.occurrenceDatetime).getTime();
    const dateB = new Date(b.occurrenceDatetime).getTime();
    return dateB - dateA; // Ordem decrescente (mais recente primeiro)
  });
  
  return mergedEvents;
}
