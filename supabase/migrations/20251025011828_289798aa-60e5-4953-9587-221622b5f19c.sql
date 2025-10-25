-- Create couriers table to store courier/carrier information
CREATE TABLE public.couriers (
  courier_code TEXT PRIMARY KEY,
  courier_name TEXT NOT NULL,
  website TEXT,
  is_post BOOLEAN NOT NULL DEFAULT false,
  country_code TEXT,
  required_fields JSONB,
  is_deprecated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read couriers (public data)
CREATE POLICY "Couriers are viewable by everyone"
ON public.couriers
FOR SELECT
USING (true);

-- Only authenticated users can manage couriers (via edge function)
CREATE POLICY "Authenticated users can insert couriers"
ON public.couriers
FOR INSERT
WITH CHECK (get_customer_id_from_request() IS NOT NULL);

CREATE POLICY "Authenticated users can update couriers"
ON public.couriers
FOR UPDATE
USING (get_customer_id_from_request() IS NOT NULL);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_couriers_updated_at
BEFORE UPDATE ON public.couriers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_couriers_name ON public.couriers(courier_name);
CREATE INDEX idx_couriers_deprecated ON public.couriers(is_deprecated) WHERE is_deprecated = false;