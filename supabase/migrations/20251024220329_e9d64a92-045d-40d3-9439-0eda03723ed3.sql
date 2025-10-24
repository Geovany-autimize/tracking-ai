-- Adicionar campos para dados da API de rastreio externa
ALTER TABLE public.shipments 
ADD COLUMN tracker_id TEXT,
ADD COLUMN tracking_events JSONB DEFAULT '[]'::jsonb,
ADD COLUMN shipment_data JSONB;

-- Criar índice para melhor performance em consultas por tracker_id
CREATE INDEX IF NOT EXISTS idx_shipments_tracker_id ON public.shipments(tracker_id);

-- Comentários para documentação
COMMENT ON COLUMN public.shipments.tracker_id IS 'ID do rastreador na API externa (trackerId)';
COMMENT ON COLUMN public.shipments.tracking_events IS 'Array de eventos de rastreio da API externa';
COMMENT ON COLUMN public.shipments.shipment_data IS 'Dados completos do shipment da API externa';
