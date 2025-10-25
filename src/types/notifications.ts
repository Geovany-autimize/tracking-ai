export type NotificationType = 
  | 'info_received'
  | 'in_transit'
  | 'out_for_delivery'
  | 'failed_attempt'
  | 'delivered'
  | 'available_for_pickup'
  | 'exception'
  | 'pending'
  | 'expired';

export interface Notification {
  id: string;
  customer_id: string;
  shipment_id: string;
  tracking_code: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  status_milestone: string | null;
  courier_name: string | null;
  location: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}
