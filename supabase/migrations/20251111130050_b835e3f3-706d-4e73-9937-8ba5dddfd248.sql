-- Add volume tracking fields to shipments table
ALTER TABLE shipments
ADD COLUMN IF NOT EXISTS bling_order_id TEXT,
ADD COLUMN IF NOT EXISTS bling_volume_id TEXT,
ADD COLUMN IF NOT EXISTS volume_numero INTEGER,
ADD COLUMN IF NOT EXISTS total_volumes INTEGER;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_shipments_bling_order ON shipments(bling_order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_bling_volume ON shipments(bling_volume_id);
CREATE INDEX IF NOT EXISTS idx_shipments_bling_composite ON shipments(customer_id, bling_order_id, bling_volume_id);

-- Add comment for documentation
COMMENT ON COLUMN shipments.bling_order_id IS 'ID do pedido original no Bling';
COMMENT ON COLUMN shipments.bling_volume_id IS 'ID do volume/etiqueta no Bling';
COMMENT ON COLUMN shipments.volume_numero IS 'Número do volume (1, 2, 3...)';
COMMENT ON COLUMN shipments.total_volumes IS 'Total de volumes do pedido';