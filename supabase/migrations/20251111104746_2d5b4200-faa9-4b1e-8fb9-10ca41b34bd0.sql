-- Backup atual do plano Premium antes da alteração
COMMENT ON TABLE plans IS 'Plano Premium alterado de 1.500 para 150 créditos em 2025-01-11';

-- Atualizar monthly_credits do plano Premium de 1500 para 150
UPDATE plans
SET monthly_credits = 150
WHERE id = 'premium';

-- Verificar a alteração
SELECT id, name, monthly_credits, price_cents 
FROM plans 
WHERE id = 'premium';