-- Tabela para registrar compras de créditos extras
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  credits_amount INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  price_per_credit_cents INTEGER NOT NULL,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  consumed_credits INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT valid_credits_amount CHECK (credits_amount > 0 AND credits_amount <= 5000),
  CONSTRAINT valid_price CHECK (price_cents > 0),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded'))
);

-- Índices para performance
CREATE INDEX idx_credit_purchases_customer ON public.credit_purchases(customer_id);
CREATE INDEX idx_credit_purchases_status ON public.credit_purchases(status);
CREATE INDEX idx_credit_purchases_expires ON public.credit_purchases(expires_at);
CREATE INDEX idx_credit_purchases_stripe_session ON public.credit_purchases(stripe_session_id);

-- Trigger para updated_at
CREATE TRIGGER update_credit_purchases_updated_at 
  BEFORE UPDATE ON public.credit_purchases 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit purchases"
  ON public.credit_purchases
  FOR SELECT
  USING (customer_id = get_customer_id_from_request());

CREATE POLICY "Users can insert their own credit purchases"
  ON public.credit_purchases
  FOR INSERT
  WITH CHECK (customer_id = get_customer_id_from_request());

-- System can update purchases (para edge functions)
CREATE POLICY "System can update credit purchases"
  ON public.credit_purchases
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.credit_purchases IS 'Stores extra credit purchases made by customers';
COMMENT ON COLUMN public.credit_purchases.expires_at IS 'Credits expire at the end of subscription period';
COMMENT ON COLUMN public.credit_purchases.consumed_credits IS 'How many credits from this purchase have been used';
COMMENT ON COLUMN public.credit_purchases.price_per_credit_cents IS 'Price per credit in cents at time of purchase';