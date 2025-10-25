-- Adicionar coluna para rastrear origem do template
ALTER TABLE message_templates 
ADD COLUMN creation_method TEXT DEFAULT 'manual' 
CHECK (creation_method IN ('manual', 'ai_generated'));

-- Criar índice para queries de analytics
CREATE INDEX idx_message_templates_creation_method 
ON message_templates(creation_method);

-- Adicionar comentário explicativo
COMMENT ON COLUMN message_templates.creation_method IS 
'Indica como o template foi criado: manual (usuário digitou) ou ai_generated (gerado pela IA)';