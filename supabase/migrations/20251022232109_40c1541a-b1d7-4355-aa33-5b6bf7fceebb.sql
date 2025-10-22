-- Create sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  token_jti TEXT PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_customer ON public.sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON public.sessions(expires_at);

-- Enable Row Level Security
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own sessions
CREATE POLICY "Users can view their own sessions" 
ON public.sessions 
FOR SELECT 
USING (customer_id = (current_setting('app.current_customer_id', true))::uuid);

-- Create policy for users to delete their own sessions (logout)
CREATE POLICY "Users can delete their own sessions" 
ON public.sessions 
FOR DELETE 
USING (customer_id = (current_setting('app.current_customer_id', true))::uuid);