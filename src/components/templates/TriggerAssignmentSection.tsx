import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TriggerAssignmentCard } from './TriggerAssignmentCard';
import { TRIGGER_OPTIONS, NotificationTrigger } from '@/types/templates';
import { MessageTemplate } from '@/types/templates';
import { Bell } from 'lucide-react';

interface TriggerAssignmentSectionProps {
  templates: MessageTemplate[];
  onAssign: (trigger: NotificationTrigger, templateId: string | null) => void;
  getActiveTemplate: (trigger: NotificationTrigger) => MessageTemplate | null;
  isLoading?: boolean;
}

export function TriggerAssignmentSection({ 
  templates, 
  onAssign,
  getActiveTemplate,
  isLoading = false 
}: TriggerAssignmentSectionProps) {
  // Filtrar templates disponíveis para cada gatilho (excluir templates já atribuídos a outros gatilhos)
  const getAvailableTemplates = (currentTrigger: NotificationTrigger) => {
    const activeTemplate = getActiveTemplate(currentTrigger);
    
    return templates.filter(template => {
      // Se for o template já ativo neste gatilho, incluir
      if (template.id === activeTemplate?.id) return true;
      
      // Se não está ativo ou não tem notification_type, incluir
      if (!template.is_active || !template.notification_type || template.notification_type.length === 0) {
        return true;
      }
      
      // Se está ativo mas não contém este gatilho, excluir (está sendo usado em outro gatilho)
      return false;
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle>Disparo de Mensagens</CardTitle>
        </div>
        <CardDescription>
          Configure qual template será enviado automaticamente para cada evento de rastreamento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TRIGGER_OPTIONS.map((trigger) => (
            <TriggerAssignmentCard
              key={trigger.value}
              trigger={trigger}
              activeTemplate={getActiveTemplate(trigger.value)}
              availableTemplates={getAvailableTemplates(trigger.value)}
              onAssign={(templateId) => onAssign(trigger.value, templateId)}
              isLoading={isLoading}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
