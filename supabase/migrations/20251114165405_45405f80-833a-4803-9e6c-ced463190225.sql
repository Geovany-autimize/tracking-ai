-- Adicionar campo para armazenar o company_id do Bling
ALTER TABLE bling_integrations
ADD COLUMN IF NOT EXISTS bling_company_id TEXT;

-- Criar índice para buscas rápidas por company_id
CREATE INDEX IF NOT EXISTS idx_bling_integrations_company_id 
ON bling_integrations(bling_company_id);

-- Comentário explicativo
COMMENT ON COLUMN bling_integrations.bling_company_id IS 
'ID da empresa no Bling, usado para correlacionar webhooks';