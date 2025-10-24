-- Recriar a função com correção (usando CREATE OR REPLACE para evitar dependências)
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