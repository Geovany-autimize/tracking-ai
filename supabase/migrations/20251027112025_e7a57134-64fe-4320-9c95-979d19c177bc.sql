-- Atualizar o enum notification_type para incluir todos os status milestones
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'info_received';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'in_transit';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'failed_attempt';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'delivered';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'available_for_pickup';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pending';

-- Nota: Os valores 'status_update', 'delivery' e 'exception' já existem e serão mantidos
-- para compatibilidade com registros existentes