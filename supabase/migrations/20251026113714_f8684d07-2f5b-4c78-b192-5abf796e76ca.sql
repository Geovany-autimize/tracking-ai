-- Remove a coluna stripe_price_id da tabela plans
-- Esta coluna mantinha referências históricas ao Stripe que não são mais necessárias

ALTER TABLE public.plans 
DROP COLUMN IF EXISTS stripe_price_id;