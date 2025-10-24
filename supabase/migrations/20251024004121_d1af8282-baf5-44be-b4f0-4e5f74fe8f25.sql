-- Inserir 3 registros de teste para validação do sistema
-- Usando INSERT com verificação para evitar duplicatas
DO $$
DECLARE
  ts TEXT := extract(epoch from now())::text;
BEGIN
  INSERT INTO public.shipment_customers (customer_id, first_name, last_name, email, phone, notes)
  SELECT '839eaba5-8707-4897-8509-3b4bb0dca0c3', 'Teste', 'Cliente1', 'seed1_' || ts || '@example.com', NULL, 'registro de teste'
  WHERE NOT EXISTS (SELECT 1 FROM public.shipment_customers WHERE first_name = 'Teste' AND last_name = 'Cliente1' AND customer_id = '839eaba5-8707-4897-8509-3b4bb0dca0c3');
  
  INSERT INTO public.shipment_customers (customer_id, first_name, last_name, email, phone, notes)
  SELECT '839eaba5-8707-4897-8509-3b4bb0dca0c3', 'Teste', 'Cliente2', 'seed2_' || ts || '@example.com', NULL, 'registro de teste'
  WHERE NOT EXISTS (SELECT 1 FROM public.shipment_customers WHERE first_name = 'Teste' AND last_name = 'Cliente2' AND customer_id = '839eaba5-8707-4897-8509-3b4bb0dca0c3');
  
  INSERT INTO public.shipment_customers (customer_id, first_name, last_name, email, phone, notes)
  SELECT '839eaba5-8707-4897-8509-3b4bb0dca0c3', 'Teste', 'Cliente3', 'seed3_' || ts || '@example.com', NULL, 'registro de teste'
  WHERE NOT EXISTS (SELECT 1 FROM public.shipment_customers WHERE first_name = 'Teste' AND last_name = 'Cliente3' AND customer_id = '839eaba5-8707-4897-8509-3b4bb0dca0c3');
END $$;