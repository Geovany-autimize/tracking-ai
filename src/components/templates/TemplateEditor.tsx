import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Trash2 } from 'lucide-react';
import { MessageTemplate, TEMPLATE_VARIABLES, TRIGGER_OPTIONS, NotificationTrigger } from '@/types/templates';
import { VariableChip } from './VariableChip';
import { TriggerCard } from './TriggerCard';
import { validateTemplate } from '@/lib/template-processor';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TemplateEditorProps {
  template?: MessageTemplate | null;
  onSave: (template: Omit<MessageTemplate, 'id' | 'customer_id' | 'created_at' | 'updated_at'>) => void;
  onUpdate: (template: Partial<MessageTemplate> & { id: string }) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
  onMessageChange?: (message: string) => void;
  isSaving?: boolean;
}

export function TemplateEditor({
  template,
  onSave,
  onUpdate,
  onDelete,
  onCancel,
  onMessageChange,
  isSaving = false,
}: TemplateEditorProps) {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [triggers, setTriggers] = useState<NotificationTrigger[]>([]);
  const [message, setMessage] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setIsActive(template.is_active);
      setTriggers(template.notification_type);
      setMessage(template.message_content);
      onMessageChange?.(template.message_content);
    } else {
      setName('');
      setIsActive(true);
      setTriggers([]);
      setMessage('');
      onMessageChange?.('');
    }
  }, [template, onMessageChange]);

  const handleTriggerChange = (trigger: NotificationTrigger, checked: boolean) => {
    if (checked) {
      setTriggers([...triggers, trigger]);
    } else {
      setTriggers(triggers.filter((t) => t !== trigger));
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newMessage = message.substring(0, start) + variable + message.substring(end);
    
    setMessage(newMessage);
    onMessageChange?.(newMessage);
    
    // Reset cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const handleSave = () => {
    const validation = validateTemplate(message);
    
    if (!validation.isValid) {
      return;
    }

    if (!name.trim()) {
      return;
    }

    if (triggers.length === 0) {
      return;
    }

    const templateData = {
      name,
      is_active: isActive,
      notification_type: triggers,
      message_content: message,
    };

    if (template) {
      onUpdate({ ...templateData, id: template.id });
    } else {
      onSave(templateData);
    }
  };

  const validation = validateTemplate(message);
  const canSave = name.trim() && triggers.length > 0 && validation.isValid;

  if (!template && name === '' && message === '') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">
            Selecione um template ou crie um novo
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Template</Label>
              <Input
                id="name"
                placeholder="Ex: Pedido Saiu para Entrega"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="active">Template Ativo</Label>
            </div>
          </CardContent>
        </Card>

        {/* Triggers */}
        <Card>
          <CardHeader>
            <CardTitle>Quando Enviar?</CardTitle>
            <CardDescription>
              Selecione os status que acionarão este template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TRIGGER_OPTIONS.map((trigger) => (
                <TriggerCard
                  key={trigger.value}
                  trigger={trigger}
                  checked={triggers.includes(trigger.value)}
                  onCheckedChange={(checked) => handleTriggerChange(trigger.value, checked)}
                />
              ))}
            </div>
            {triggers.length === 0 && (
              <p className="text-sm text-destructive mt-2">
                Selecione pelo menos um gatilho
              </p>
            )}
          </CardContent>
        </Card>

        {/* Message Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Mensagem</CardTitle>
            <CardDescription>
              Use as variáveis abaixo para personalizar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Variables Bar */}
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <Label className="text-xs">Variáveis Disponíveis:</Label>
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

            {/* Textarea */}
            <div className="space-y-2">
              <Textarea
                ref={textareaRef}
                placeholder="Digite sua mensagem aqui..."
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  onMessageChange?.(e.target.value);
                }}
                rows={8}
                className="font-mono"
                maxLength={1024}
              />
              <div className="flex justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Máximo: 1024 caracteres
                  </p>
                  {!validation.isValid && (
                    <div className="space-y-1">
                      {validation.errors.map((error, index) => (
                        <p key={index} className="text-xs text-destructive">
                          {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <p
                  className={cn(
                    'text-xs',
                    message.length > 1024 ? 'text-destructive' : 'text-muted-foreground'
                  )}
                >
                  {message.length}/1024
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between gap-3">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={!template}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </Button>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!canSave || isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Template
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (template) {
                  onDelete(template.id);
                  setShowDeleteDialog(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
