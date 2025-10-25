-- Tabela de produtos Stripe (planos recorrentes)
CREATE TABLE IF NOT EXISTS public.stripe_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de preços (prices)
CREATE TABLE IF NOT EXISTS public.stripe_prices (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES public.stripe_products(id),
  unit_amount INTEGER, -- em centavos
  currency TEXT DEFAULT 'brl',
  recurring_interval TEXT, -- 'month', 'year'
  type TEXT NOT NULL, -- 'recurring' ou 'one_time'
  metadata JSONB,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Adicionar colunas Stripe à tabela customers
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT;

-- Histórico de transações
CREATE TABLE IF NOT EXISTS public.billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'brl',
  status TEXT NOT NULL, -- 'pending', 'succeeded', 'failed'
  type TEXT NOT NULL, -- 'subscription', 'credit_purchase', 'auto_topup'
  description TEXT,
  credits_added INTEGER, -- quantidade de créditos adicionados
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pacotes de créditos avulsos
CREATE TABLE IF NOT EXISTS public.credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- "Pacote 100", "Pacote 500"
  credits INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  stripe_price_id TEXT UNIQUE,
  discount_percentage DECIMAL(5,2), -- desconto sobre o preço unitário
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Configurações de Auto Top-Up
CREATE TABLE IF NOT EXISTS public.auto_topup_settings (
  customer_id UUID PRIMARY KEY REFERENCES public.customers(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT FALSE,
  trigger_threshold INTEGER NOT NULL, -- quando créditos < threshold
  package_id UUID REFERENCES public.credit_packages(id),
  max_purchases_per_month INTEGER DEFAULT 3, -- limite de segurança
  purchases_this_month INTEGER DEFAULT 0,
  last_purchase_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Atualização da tabela subscriptions
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_billing_transactions_customer ON public.billing_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_created ON public.billing_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_status ON public.billing_transactions(status);
CREATE INDEX IF NOT EXISTS idx_auto_topup_enabled ON public.auto_topup_settings(enabled) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_credit_packages_active ON public.credit_packages(is_active, display_order) WHERE is_active = TRUE;

-- Enable RLS em todas as novas tabelas
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_topup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies para billing_transactions
CREATE POLICY "Users can view own transactions"
  ON public.billing_transactions FOR SELECT
  USING (customer_id = get_customer_id_from_request());

CREATE POLICY "System can insert transactions"
  ON public.billing_transactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update transactions"
  ON public.billing_transactions FOR UPDATE
  USING (true);

-- RLS Policies para credit_packages (todos podem ler pacotes ativos)
CREATE POLICY "Anyone can view active packages"
  ON public.credit_packages FOR SELECT
  USING (is_active = true);

-- RLS Policies para auto_topup_settings
CREATE POLICY "Users can view own auto-topup settings"
  ON public.auto_topup_settings FOR SELECT
  USING (customer_id = get_customer_id_from_request());

CREATE POLICY "Users can insert own auto-topup settings"
  ON public.auto_topup_settings FOR INSERT
  WITH CHECK (customer_id = get_customer_id_from_request());

CREATE POLICY "Users can update own auto-topup settings"
  ON public.auto_topup_settings FOR UPDATE
  USING (customer_id = get_customer_id_from_request());

CREATE POLICY "Users can delete own auto-topup settings"
  ON public.auto_topup_settings FOR DELETE
  USING (customer_id = get_customer_id_from_request());

-- RLS Policies para stripe_products e stripe_prices (todos podem ler)
CREATE POLICY "Anyone can view products"
  ON public.stripe_products FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view prices"
  ON public.stripe_prices FOR SELECT
  USING (true);

-- Trigger para updated_at em billing_transactions
CREATE TRIGGER update_billing_transactions_updated_at
  BEFORE UPDATE ON public.billing_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at em auto_topup_settings
CREATE TRIGGER update_auto_topup_settings_updated_at
  BEFORE UPDATE ON public.auto_topup_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Popular pacotes de créditos iniciais
INSERT INTO public.credit_packages (name, credits, price_cents, discount_percentage, display_order, is_active) VALUES
  ('Pacote 100', 100, 4900, 0, 1, true),
  ('Pacote 500', 500, 19900, 18.37, 2, true),
  ('Pacote 1.500', 1500, 49900, 32.04, 3, true),
  ('Pacote 5.000', 5000, 149900, 38.78, 4, true)
ON CONFLICT DO NOTHING;