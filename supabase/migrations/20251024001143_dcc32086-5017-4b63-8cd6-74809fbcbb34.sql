-- Remover políticas que dependem da função
DROP POLICY IF EXISTS "Users can view their own shipment customers" ON public.shipment_customers;
DROP POLICY IF EXISTS "Users can insert their own shipment customers" ON public.shipment_customers;
DROP POLICY IF EXISTS "Users can update their own shipment customers" ON public.shipment_customers;
DROP POLICY IF EXISTS "Users can delete their own shipment customers" ON public.shipment_customers;

DROP POLICY IF EXISTS "Users can view their own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can insert their own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can update their own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can delete their own shipments" ON public.shipments;

-- Remover a função com problema
DROP FUNCTION IF EXISTS public.get_customer_id_from_request();

-- Recriar a função corrigida
CREATE OR REPLACE FUNCTION public.get_customer_id_from_request()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token_jti text;
  session_customer_id uuid;
BEGIN
  -- Extrair o token do header authorization
  _token_jti := current_setting('request.headers', true)::json->>'authorization';
  
  -- Remover "Bearer " do início
  IF _token_jti IS NOT NULL THEN
    _token_jti := replace(_token_jti, 'Bearer ', '');
    
    -- Buscar o customer_id da sessão pelo token
    SELECT customer_id INTO session_customer_id
    FROM public.sessions
    WHERE sessions.token_jti = _token_jti
      AND expires_at > now();
    
    RETURN session_customer_id;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Recriar as políticas para shipment_customers
CREATE POLICY "Users can view their own shipment customers"
  ON public.shipment_customers
  FOR SELECT
  USING (customer_id = public.get_customer_id_from_request());

CREATE POLICY "Users can insert their own shipment customers"
  ON public.shipment_customers
  FOR INSERT
  WITH CHECK (customer_id = public.get_customer_id_from_request());

CREATE POLICY "Users can update their own shipment customers"
  ON public.shipment_customers
  FOR UPDATE
  USING (customer_id = public.get_customer_id_from_request());

CREATE POLICY "Users can delete their own shipment customers"
  ON public.shipment_customers
  FOR DELETE
  USING (customer_id = public.get_customer_id_from_request());

-- Recriar as políticas para shipments
CREATE POLICY "Users can view their own shipments"
  ON public.shipments
  FOR SELECT
  USING (customer_id = public.get_customer_id_from_request());

CREATE POLICY "Users can insert their own shipments"
  ON public.shipments
  FOR INSERT
  WITH CHECK (customer_id = public.get_customer_id_from_request());

CREATE POLICY "Users can update their own shipments"
  ON public.shipments
  FOR UPDATE
  USING (customer_id = public.get_customer_id_from_request());

CREATE POLICY "Users can delete their own shipments"
  ON public.shipments
  FOR DELETE
  USING (customer_id = public.get_customer_id_from_request());