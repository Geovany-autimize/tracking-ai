-- Add stripe_price_id column to plans table
ALTER TABLE public.plans 
ADD COLUMN stripe_price_id text;

-- Update stripe_price_id for Free plan
UPDATE public.plans 
SET stripe_price_id = 'price_1SMEg1FsSB8n8Az0OVWFuCHo'
WHERE id = 'free';

-- Update stripe_price_id for Premium plan
UPDATE public.plans 
SET stripe_price_id = 'price_1SMEgFFsSB8n8Az0aSBb70E7'
WHERE id = 'premium';