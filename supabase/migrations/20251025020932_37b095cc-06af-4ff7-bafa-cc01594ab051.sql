-- Create enum for notification types
CREATE TYPE public.notification_type AS ENUM ('status_update', 'delivery', 'exception', 'out_for_delivery');

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  tracking_code TEXT NOT NULL,
  notification_type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status_milestone TEXT,
  courier_name TEXT,
  location TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (customer_id = get_customer_id_from_request());

CREATE POLICY "Users can update is_read on their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (customer_id = get_customer_id_from_request())
  WITH CHECK (customer_id = get_customer_id_from_request());

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (customer_id = get_customer_id_from_request());

-- Create indexes for performance
CREATE INDEX idx_notifications_customer_is_read ON public.notifications(customer_id, is_read);
CREATE INDEX idx_notifications_customer_created ON public.notifications(customer_id, created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;