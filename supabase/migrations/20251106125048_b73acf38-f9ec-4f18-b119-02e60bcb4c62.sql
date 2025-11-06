-- Fix RLS policy on credit_usage table to use custom authentication
-- Replace auth.uid() with get_customer_id_from_request()

DROP POLICY IF EXISTS "Users can view own credit usage" ON credit_usage;

CREATE POLICY "Users can view own credit usage" 
ON credit_usage 
FOR SELECT 
USING (customer_id = get_customer_id_from_request());