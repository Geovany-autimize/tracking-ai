import { useEffect, useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { MessageTemplate, TEMPLATE_VARIABLES, TRIGGER_OPTIONS, NotificationTrigger } from '@/types/templates';
import { TriggerCard } from './TriggerCard';
import { VariableChip } from './VariableChip';
import { WhatsAppPreview } from './WhatsAppPreview';
import { processTemplate } from '@/lib/template-processor';

interface CreateEditTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: MessageTemplate | null;
  onSave: (data: Omit<MessageTemplate, 'id' | 'customer_id' | 'created_at' | 'updated_at'>) => void;
  onUpdate: (data: Partial<MessageTemplate> & { id: string }) => void;
  isSaving?: boolean;
}

export function CreateEditTemplateDialog({
  open,
  onOpenChange,
  template,
  onSave,
  onUpdate,
  isSaving = false,
}: CreateEditTemplateDialogProps) {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [triggers, setTriggers] = useState<NotificationTrigger[]>([]);
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setIsActive(template.is_active);
      setTriggers(template.notification_type);
      setMessage(template.message_content);
    } else {
      setName('');
      setIsActive(true);
      setTriggers([]);
      setMessage('');
    }
  }, [template, open]);

  const handleTriggerChange = (trigger: NotificationTrigger, checked: boolean) => {
    setTriggers((prev) =>
      checked ? [...prev, trigger] : prev.filter((t) => t !== trigger)
    );
  };

  const insertVariable = (variable: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = message;
    const before = text.substring(0, start);
    const after = text.substring(end);

    const newText = before + variable + after;
    setMessage(newText);

    setTimeout(() => {
      textarea.focus();
      const newPosition = start + variable.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const validateMessage = (msg: string): boolean => {
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const matches = msg.match(variablePattern);
    
    if (!matches) return true;

    const validVariables = TEMPLATE_VARIABLES.map(v => v.variable);
    return matches.every(match => validVariables.includes(match));
  };

  const canSave = name.trim() !== '' && triggers.length > 0 && message.trim() !== '' && validateMessage(message);

  const handleSave = () => {
    if (!canSave) return;

    const data = {
      name: name.trim(),
      is_active: isActive,
      notification_type: triggers,
      message_content: message.trim(),
    };

    if (template) {
      onUpdate({ ...data, id: template.id });
    } else {
      onSave(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Editar Template' : 'Novo Template'}
          </DialogTitle>
          <DialogDescription>
            Configure as informações e mensagem do template
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Form */}
          <div className="space-y-4">
            {/* Nome do Template */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Template</Label>
              <Input
                id="name"
                placeholder="Ex: Pedido Saiu para Entrega"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Template Ativo */}
            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="active">Template Ativo</Label>
            </div>

            {/* Gatilhos */}
            <div className="space-y-2">
              <Label>Gatilhos de Envio</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TRIGGER_OPTIONS.map((trigger) => (
                  <TriggerCard
                    key={trigger.value}
                    trigger={trigger}
                    checked={triggers.includes(trigger.value)}
                    onCheckedChange={(checked) =>
                      handleTriggerChange(trigger.value, checked)
                    }
                  />
                ))}
              </div>
            </div>

            {/* Variáveis */}
            <div className="space-y-2">
              <Label>Variáveis Disponíveis</Label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_VARIABLES.map((variable) => (
                  <VariableChip
                    key={variable.variable}
                    variable={variable}
                    onClick={insertVariable}
                  />
                ))}
              </div>
            </div>

            {/* Mensagem */}
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                ref={textareaRef}
                id="message"
                placeholder="Digite sua mensagem aqui..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {message.length}/1024 caracteres
              </p>
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className="space-y-2">
            <Label>Preview no WhatsApp</Label>
            <div className="sticky top-6">
              <WhatsAppPreview message={message} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!canSave || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {template ? 'Salvar Alterações' : 'Criar Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
