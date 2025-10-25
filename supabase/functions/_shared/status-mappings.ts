/**
 * Mapeamento centralizado entre Status Milestones da API Ship24 
 * e Notification Types do sistema
 * 
 * Cada status milestone tem seu próprio notification type (mapeamento 1:1)
 */

export type StatusMilestone = 
  | 'info_received'
  | 'in_transit'
  | 'out_for_delivery'
  | 'failed_attempt'
  | 'delivered'
  | 'available_for_pickup'
  | 'exception'
  | 'expired'
  | 'pending';

export type NotificationType = StatusMilestone; // Mapeamento 1:1

/**
 * Mapeamento direto: cada milestone tem seu próprio notification type
 */
export const STATUS_TO_NOTIFICATION_MAP: Record<StatusMilestone, NotificationType> = {
  'info_received': 'info_received',
  'in_transit': 'in_transit',
  'out_for_delivery': 'out_for_delivery',
  'failed_attempt': 'failed_attempt',
  'delivered': 'delivered',
  'available_for_pickup': 'available_for_pickup',
  'exception': 'exception',
  'expired': 'expired',
  'pending': 'pending',
};

/**
 * Obtém o notification type baseado no status milestone (mapeamento 1:1)
 */
export function getNotificationTypeFromStatus(statusMilestone: string): NotificationType {
  const status = statusMilestone as StatusMilestone;
  return STATUS_TO_NOTIFICATION_MAP[status] || status as NotificationType;
}

/**
 * Títulos formatados para cada milestone
 */
export const STATUS_TITLES: Record<StatusMilestone, string> = {
  'info_received': '📋 Informação recebida',
  'in_transit': '📦 Pedido em trânsito',
  'out_for_delivery': '🚚 Pedido saiu para entrega',
  'failed_attempt': '⚠️ Tentativa de entrega falhou',
  'delivered': '✅ Pedido entregue',
  'available_for_pickup': '📍 Pedido disponível para retirada',
  'exception': '❌ Problema na entrega',
  'expired': '⏰ Rastreamento expirado',
  'pending': '⏳ Pedido pendente',
};

/**
 * Traduções de status para português
 */
export const STATUS_TRANSLATIONS: Record<StatusMilestone, string> = {
  'info_received': 'Informação recebida',
  'in_transit': 'Em trânsito',
  'out_for_delivery': 'Saiu para entrega',
  'failed_attempt': 'Tentativa de entrega falhou',
  'delivered': 'Entregue',
  'available_for_pickup': 'Disponível para retirada',
  'exception': 'Problema na entrega',
  'expired': 'Rastreamento expirado',
  'pending': 'Pendente',
};

/**
 * Valida se o status milestone é conhecido
 */
export function isValidStatusMilestone(status: string): status is StatusMilestone {
  return status in STATUS_TO_NOTIFICATION_MAP;
}
