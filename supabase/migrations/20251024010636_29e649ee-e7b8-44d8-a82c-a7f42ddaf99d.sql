-- Remove constraints e índices existentes se houver
ALTER TABLE shipments DROP CONSTRAINT IF EXISTS unique_tracking_per_customer;
DROP INDEX IF EXISTS unique_phone_per_customer;
ALTER TABLE shipment_customers DROP CONSTRAINT IF EXISTS unique_email_per_customer;
DROP INDEX IF EXISTS idx_shipment_customers_phone;
DROP INDEX IF EXISTS idx_shipment_customers_email;
DROP INDEX IF EXISTS idx_shipments_tracking;

-- 1. Normaliza dados ANTES de remover duplicatas
UPDATE shipment_customers 
SET phone = NULL 
WHERE phone = '' OR TRIM(phone) = '';

UPDATE shipment_customers 
SET email = LOWER(TRIM(email));

-- 2. Remove duplicatas de tracking_code usando CTE
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY customer_id, tracking_code 
    ORDER BY created_at DESC, id DESC
  ) as rn
  FROM shipments
)
DELETE FROM shipments 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- 3. Remove duplicatas de email usando CTE
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY customer_id, email 
    ORDER BY created_at DESC, id DESC
  ) as rn
  FROM shipment_customers
  WHERE email IS NOT NULL
)
DELETE FROM shipment_customers 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- 4. Remove duplicatas de telefone usando CTE
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY customer_id, phone 
    ORDER BY created_at DESC, id DESC
  ) as rn
  FROM shipment_customers
  WHERE phone IS NOT NULL
)
DELETE FROM shipment_customers 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- 5. Adiciona constraints únicos
ALTER TABLE shipments 
ADD CONSTRAINT unique_tracking_per_customer 
UNIQUE (customer_id, tracking_code);

CREATE UNIQUE INDEX unique_phone_per_customer 
ON shipment_customers (customer_id, phone) 
WHERE phone IS NOT NULL;

ALTER TABLE shipment_customers 
ADD CONSTRAINT unique_email_per_customer 
UNIQUE (customer_id, email);

-- 6. Adiciona índices para performance
CREATE INDEX idx_shipment_customers_phone ON shipment_customers(customer_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_shipment_customers_email ON shipment_customers(customer_id, email);
CREATE INDEX idx_shipments_tracking ON shipments(customer_id, tracking_code);