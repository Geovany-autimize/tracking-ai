-- Standardize RLS policies to use get_customer_id_from_request()
-- This fixes the inconsistent authentication methods issue

-- Update customers table policies
DROP POLICY IF EXISTS "Users can view their own customer data" ON public.customers;
CREATE POLICY "Users can view their own customer data"
ON public.customers FOR SELECT
USING (id = get_customer_id_from_request());

DROP POLICY IF EXISTS "Users can update their own customer data" ON public.customers;
CREATE POLICY "Users can update their own customer data"
ON public.customers FOR UPDATE
USING (id = get_customer_id_from_request());

-- Update subscriptions table policies
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view their own subscriptions"
ON public.subscriptions FOR SELECT
USING (customer_id = get_customer_id_from_request());

-- Update sessions table policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.sessions;
CREATE POLICY "Users can view their own sessions"
ON public.sessions FOR SELECT
USING (customer_id = get_customer_id_from_request());

DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.sessions;
CREATE POLICY "Users can delete their own sessions"
ON public.sessions FOR DELETE
USING (customer_id = get_customer_id_from_request());

-- Update oauth_accounts table policies
DROP POLICY IF EXISTS "Users can view their own oauth accounts" ON public.oauth_accounts;
CREATE POLICY "Users can view their own oauth accounts"
ON public.oauth_accounts FOR SELECT
USING (customer_id = get_customer_id_from_request());