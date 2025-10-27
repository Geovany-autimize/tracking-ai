-- Fix courier table RLS policies - remove INSERT and UPDATE for regular users
DROP POLICY IF EXISTS "Authenticated users can insert couriers" ON public.couriers;
DROP POLICY IF EXISTS "Authenticated users can update couriers" ON public.couriers;

-- Courier data should only be modified by system edge functions using service role key
-- Keep the SELECT policy for public read access

-- Fix credit_purchases table - remove unrestricted UPDATE policy
DROP POLICY IF EXISTS "System can update credit purchases" ON public.credit_purchases;

-- Edge functions using service role keys bypass RLS and don't need this policy
-- All credit purchase updates should be done through edge functions with service role