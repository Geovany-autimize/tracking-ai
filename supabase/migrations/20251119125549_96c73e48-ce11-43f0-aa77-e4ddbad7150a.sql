-- Adicionar novo tipo de notificação para pedidos Bling
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_bling_orders';

-- Criar tabela de fila para sincronização Bling
CREATE TABLE IF NOT EXISTS bling_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  new_orders_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_bling_sync_queue_status ON bling_sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_bling_sync_queue_customer ON bling_sync_queue(customer_id);
CREATE INDEX IF NOT EXISTS idx_bling_sync_queue_priority ON bling_sync_queue(priority DESC, created_at ASC);

-- RLS Policies
ALTER TABLE bling_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own queue entries"
  ON bling_sync_queue FOR SELECT
  USING (customer_id = get_customer_id_from_request());

COMMENT ON TABLE bling_sync_queue IS 'Fila de processamento para sincronização automática de pedidos Bling em segundo plano';
COMMENT ON COLUMN bling_sync_queue.priority IS 'Maior prioridade = processado primeiro (0 = normal)';
COMMENT ON COLUMN bling_sync_queue.new_orders_count IS 'Quantidade de novos pedidos detectados na última verificação';