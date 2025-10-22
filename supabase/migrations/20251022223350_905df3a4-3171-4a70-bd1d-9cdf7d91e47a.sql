-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  whatsapp_e164 TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create password_credentials table
CREATE TABLE IF NOT EXISTS public.password_credentials (
  customer_id UUID PRIMARY KEY REFERENCES public.customers(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create oauth_accounts table
CREATE TABLE IF NOT EXISTS public.oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'github', 'twitter')),
  provider_account_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider, provider_account_id)
);

-- Create plans table
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER,
  monthly_credits INTEGER,
  features JSONB,
  is_public BOOLEAN DEFAULT true
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.plans(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'past_due', 'canceled')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create monthly_usage table
CREATE TABLE IF NOT EXISTS public.monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  period_ym TEXT NOT NULL,
  used_credits INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, period_ym)
);

-- Insert seed data for plans
INSERT INTO public.plans (id, name, price_cents, monthly_credits, features, is_public)
VALUES
  ('free', 'Free', 0, 5, '{"channels":["whatsapp","email"],"users":1}'::jsonb, true),
  ('premium', 'Premium', 24900, 1500, '{"channels":["whatsapp","email"],"users":3,"webhooks":true,"reports":true}'::jsonb, true),
  ('enterprise', 'Enterprise', NULL, NULL, '{"channels":["whatsapp","email"],"users":null,"sso":true,"sla":true}'::jsonb, true)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for plans (public read)
CREATE POLICY "Plans are viewable by everyone"
  ON public.plans FOR SELECT
  USING (is_public = true);

-- RLS Policies for customers (users can view their own data)
CREATE POLICY "Users can view their own customer data"
  ON public.customers FOR SELECT
  USING (id = (current_setting('app.current_customer_id', true))::uuid);

CREATE POLICY "Users can update their own customer data"
  ON public.customers FOR UPDATE
  USING (id = (current_setting('app.current_customer_id', true))::uuid);

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (customer_id = (current_setting('app.current_customer_id', true))::uuid);

-- RLS Policies for monthly_usage
CREATE POLICY "Users can view their own usage"
  ON public.monthly_usage FOR SELECT
  USING (customer_id = (current_setting('app.current_customer_id', true))::uuid);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_customer ON public.oauth_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON public.oauth_accounts(provider, provider_account_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON public.subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_monthly_usage_customer_period ON public.monthly_usage(customer_id, period_ym);