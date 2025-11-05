-- Query SQL para executar no Supabase Dashboard
-- Retorna clientes ativos com suas assinaturas

SELECT 
  c.id as cliente_id,
  c.name as nome,
  c.email,
  c.whatsapp_e164 as whatsapp,
  c.created_at as criado_em,
  c.status as status_cliente,
  s.id as assinatura_id,
  s.status as status_assinatura,
  p.name as plano_nome,
  p.monthly_credits as creditos_mensais,
  s.current_period_start as inicio_periodo,
  s.current_period_end as fim_periodo,
  s.cancel_at_period_end as cancelamento_agendado
FROM customers c
LEFT JOIN subscriptions s ON c.id = s.customer_id AND s.status = 'active'
LEFT JOIN plans p ON s.plan_id = p.id
WHERE c.status IS NULL OR c.status = 'active'
ORDER BY c.created_at DESC;

-- Resumo por plano
SELECT 
  p.name as plano,
  COUNT(s.id) as total_assinaturas_ativas,
  SUM(p.monthly_credits) as total_creditos_mensais
FROM subscriptions s
JOIN plans p ON s.plan_id = p.id
WHERE s.status = 'active'
GROUP BY p.id, p.name
ORDER BY total_assinaturas_ativas DESC;

