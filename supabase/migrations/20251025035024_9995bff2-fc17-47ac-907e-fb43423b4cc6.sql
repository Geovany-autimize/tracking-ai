-- Step 1: Identify and rename duplicate templates (keep oldest, rename others)
WITH duplicates AS (
  SELECT 
    id,
    name,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) as rn
  FROM public.message_templates
)
UPDATE public.message_templates
SET name = message_templates.name || '_' || duplicates.rn
FROM duplicates
WHERE message_templates.id = duplicates.id
  AND duplicates.rn > 1;

-- Step 2: Add unique constraint to template names
ALTER TABLE public.message_templates
ADD CONSTRAINT message_templates_name_unique UNIQUE (name);

-- Step 3: Add comment explaining the constraint
COMMENT ON CONSTRAINT message_templates_name_unique ON public.message_templates 
IS 'Ensures template names are unique as they serve as identifiers';