-- Update get_customer_id_from_request to use custom header and avoid JWT requirement
CREATE OR REPLACE FUNCTION public.get_customer_id_from_request()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hdr jsonb;
  _token text;
  session_customer_id uuid;
BEGIN
  hdr := current_setting('request.headers', true)::jsonb;

  -- Prefer custom header (case-insensitive variants)
  _token := coalesce(hdr->>'x-session-token', hdr->>'x_session_token');

  -- Backward compatibility: allow non-JWT token in Authorization: Bearer <token_jti>
  IF _token IS NULL THEN
    _token := hdr->>'authorization';
    IF _token IS NOT NULL THEN
      _token := replace(_token, 'Bearer ', '');
      -- Ignore if looks like a JWT (contains two dots)
      IF position('.' in _token) > 0 AND length(_token) - length(replace(_token, '.', '')) >= 2 THEN
        _token := NULL;
      END IF;
    END IF;
  END IF;

  IF _token IS NULL OR length(_token) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT s.customer_id
  INTO session_customer_id
  FROM public.sessions s
  WHERE s.token_jti = _token
    AND s.expires_at > now()
  LIMIT 1;

  RETURN session_customer_id;
END;
$$;

-- Optional: speed up lookups
CREATE INDEX IF NOT EXISTS idx_sessions_token_jti ON public.sessions(token_jti);

-- Seed: create 3 test shipment customers for the current user account
-- Note: Using the known customer id observed in recent session logs
INSERT INTO public.shipment_customers (customer_id, first_name, last_name, email, phone, notes)
VALUES
  ('839eaba5-8707-4897-8509-3b4bb0dca0c3','Teste','Cliente1','teste1@example.com',NULL,'registro de teste'),
  ('839eaba5-8707-4897-8509-3b4bb0dca0c3','Teste','Cliente2','teste2@example.com',NULL,'registro de teste'),
  ('839eaba5-8707-4897-8509-3b4bb0dca0c3','Teste','Cliente3','teste3@example.com',NULL,'registro de teste');