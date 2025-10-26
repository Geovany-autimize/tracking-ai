-- Criar tabela de configurações de recarga automática
CREATE TABLE public.auto_recharge_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  min_credits_threshold INTEGER NOT NULL DEFAULT 100,
  recharge_amount INTEGER NOT NULL DEFAULT 500,
  stripe_payment_method_id TEXT,
  last_payment_method_details JSONB, -- Armazena últimos 4 dígitos, bandeira, etc
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id)
);

-- Índice para performance
CREATE INDEX idx_auto_recharge_enabled ON public.auto_recharge_settings(customer_id, enabled);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_auto_recharge_settings_updated_at
  BEFORE UPDATE ON public.auto_recharge_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.auto_recharge_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own auto-recharge settings"
  ON public.auto_recharge_settings FOR SELECT
  USING (customer_id = get_customer_id_from_request());

CREATE POLICY "Users can update their own auto-recharge settings"
  ON public.auto_recharge_settings FOR UPDATE
  USING (customer_id = get_customer_id_from_request());

CREATE POLICY "Users can insert their own auto-recharge settings"
  ON public.auto_recharge_settings FOR INSERT
  WITH CHECK (customer_id = get_customer_id_from_request());

-- Adicionar coluna na tabela credit_purchases para marcar recargas automáticas
ALTER TABLE public.credit_purchases 
ADD COLUMN is_auto_recharge BOOLEAN DEFAULT false;