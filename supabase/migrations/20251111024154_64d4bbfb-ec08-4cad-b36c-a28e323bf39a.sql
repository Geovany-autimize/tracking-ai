-- Create table to store enriched Bling order details
CREATE TABLE bling_order_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bling_order_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  order_date TIMESTAMPTZ,
  total_value DECIMAL(10,2),
  status TEXT,
  
  -- Contact info
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  
  -- Delivery address (stored as JSONB for flexibility)
  delivery_address JSONB,
  
  -- Carrier info
  carrier_name TEXT,
  tracking_code TEXT,
  freight_value DECIMAL(10,2),
  
  -- NFe info
  nfe_number TEXT,
  nfe_key TEXT,
  nfe_issue_date TIMESTAMPTZ,
  
  -- Items and full data (JSONB)
  items JSONB,
  full_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(customer_id, bling_order_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_bling_order_details_customer ON bling_order_details(customer_id);
CREATE INDEX idx_bling_order_details_tracking ON bling_order_details(tracking_code);
CREATE INDEX idx_bling_order_details_order_date ON bling_order_details(order_date);

-- Enable RLS
ALTER TABLE bling_order_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own Bling order details"
  ON bling_order_details
  FOR SELECT
  USING (customer_id = get_customer_id_from_request());

CREATE POLICY "Users can insert their own Bling order details"
  ON bling_order_details
  FOR INSERT
  WITH CHECK (customer_id = get_customer_id_from_request());

CREATE POLICY "Users can update their own Bling order details"
  ON bling_order_details
  FOR UPDATE
  USING (customer_id = get_customer_id_from_request());

CREATE POLICY "Users can delete their own Bling order details"
  ON bling_order_details
  FOR DELETE
  USING (customer_id = get_customer_id_from_request());

-- Trigger to update updated_at
CREATE TRIGGER update_bling_order_details_updated_at
  BEFORE UPDATE ON bling_order_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();