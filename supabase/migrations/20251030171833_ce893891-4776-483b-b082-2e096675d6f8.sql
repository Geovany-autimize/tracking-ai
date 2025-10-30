-- Update get_customer_id_from_request() to check customer status
CREATE OR REPLACE FUNCTION public.get_customer_id_from_request()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Join with customers table to verify status is 'active'
  SELECT s.customer_id
  INTO session_customer_id
  FROM public.sessions s
  JOIN public.customers c ON c.id = s.customer_id
  WHERE s.token_jti = _token
    AND s.expires_at > now()
    AND c.status = 'active'
  LIMIT 1;

  RETURN session_customer_id;
END;
$function$;

-- Create rate_limits table for authentication rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  identifier TEXT PRIMARY KEY,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_locked ON public.rate_limits(locked_until) WHERE locked_until IS NOT NULL;

-- Enable RLS on rate_limits (system-managed table)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system can manage rate limits
CREATE POLICY "Rate limits are system managed only" 
ON public.rate_limits 
FOR ALL 
USING (false);