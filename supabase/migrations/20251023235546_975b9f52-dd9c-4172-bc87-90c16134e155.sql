-- Criar tabela de clientes (shipment_customers)
CREATE TABLE IF NOT EXISTS public.shipment_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.shipment_customers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own shipment customers"
  ON public.shipment_customers
  FOR SELECT
  USING (customer_id = (current_setting('app.current_customer_id'::text, true))::uuid);

CREATE POLICY "Users can insert their own shipment customers"
  ON public.shipment_customers
  FOR INSERT
  WITH CHECK (customer_id = (current_setting('app.current_customer_id'::text, true))::uuid);

CREATE POLICY "Users can update their own shipment customers"
  ON public.shipment_customers
  FOR UPDATE
  USING (customer_id = (current_setting('app.current_customer_id'::text, true))::uuid);

CREATE POLICY "Users can delete their own shipment customers"
  ON public.shipment_customers
  FOR DELETE
  USING (customer_id = (current_setting('app.current_customer_id'::text, true))::uuid);

-- Criar tabela de rastreios (shipments)
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  shipment_customer_id UUID REFERENCES public.shipment_customers(id) ON DELETE SET NULL,
  tracking_code TEXT NOT NULL,
  auto_tracking BOOLEAN NOT NULL DEFAULT true,
  status TEXT DEFAULT 'pending',
  last_update TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own shipments"
  ON public.shipments
  FOR SELECT
  USING (customer_id = (current_setting('app.current_customer_id'::text, true))::uuid);

CREATE POLICY "Users can insert their own shipments"
  ON public.shipments
  FOR INSERT
  WITH CHECK (customer_id = (current_setting('app.current_customer_id'::text, true))::uuid);

CREATE POLICY "Users can update their own shipments"
  ON public.shipments
  FOR UPDATE
  USING (customer_id = (current_setting('app.current_customer_id'::text, true))::uuid);

CREATE POLICY "Users can delete their own shipments"
  ON public.shipments
  FOR DELETE
  USING (customer_id = (current_setting('app.current_customer_id'::text, true))::uuid);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_shipment_customers_updated_at
  BEFORE UPDATE ON public.shipment_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índices para melhor performance
CREATE INDEX idx_shipment_customers_customer_id ON public.shipment_customers(customer_id);
CREATE INDEX idx_shipment_customers_email ON public.shipment_customers(email);
CREATE INDEX idx_shipments_customer_id ON public.shipments(customer_id);
CREATE INDEX idx_shipments_tracking_code ON public.shipments(tracking_code);
CREATE INDEX idx_shipments_status ON public.shipments(status);