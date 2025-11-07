-- Tabela para armazenar credenciais OAuth do Bling por cliente
CREATE TABLE IF NOT EXISTS public.bling_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  bling_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índice para buscar rapidamente por customer_id
CREATE INDEX idx_bling_integrations_customer_id ON public.bling_integrations(customer_id);

-- Tabela para log de sincronizações
CREATE TABLE IF NOT EXISTS public.bling_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  integration_id UUID NOT NULL REFERENCES public.bling_integrations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('manual', 'auto')),
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'error')),
  orders_imported INTEGER DEFAULT 0,
  orders_updated INTEGER DEFAULT 0,
  orders_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índice para buscar logs por cliente
CREATE INDEX idx_bling_sync_logs_customer_id ON public.bling_sync_logs(customer_id);
CREATE INDEX idx_bling_sync_logs_integration_id ON public.bling_sync_logs(integration_id);

-- RLS Policies para bling_integrations
ALTER TABLE public.bling_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own Bling integrations"
  ON public.bling_integrations
  FOR SELECT
  USING (customer_id = get_customer_id_from_request());

CREATE POLICY "Users can insert their own Bling integrations"
  ON public.bling_integrations
  FOR INSERT
  WITH CHECK (customer_id = get_customer_id_from_request());

CREATE POLICY "Users can update their own Bling integrations"
  ON public.bling_integrations
  FOR UPDATE
  USING (customer_id = get_customer_id_from_request());

CREATE POLICY "Users can delete their own Bling integrations"
  ON public.bling_integrations
  FOR DELETE
  USING (customer_id = get_customer_id_from_request());

-- RLS Policies para bling_sync_logs
ALTER TABLE public.bling_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own Bling sync logs"
  ON public.bling_sync_logs
  FOR SELECT
  USING (customer_id = get_customer_id_from_request());

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_bling_integrations_updated_at
  BEFORE UPDATE ON public.bling_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();