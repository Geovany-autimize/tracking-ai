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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Code2, Bold, Italic } from 'lucide-react';
import { MessageTemplate, TEMPLATE_VARIABLES, TRIGGER_OPTIONS, NotificationTrigger } from '@/types/templates';
import { WhatsAppPreview } from './WhatsAppPreview';

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
  const [trigger, setTrigger] = useState<NotificationTrigger | ''>('');
  const [message, setMessage] = useState('');
  const [showVariables, setShowVariables] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setIsActive(template.is_active);
      setTrigger(template.notification_type);
      setMessage(template.message_content);
    } else {
      setName('');
      setIsActive(true);
      setTrigger('');
      setMessage('');
    }
  }, [template, open]);

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
    setShowVariables(false);

    setTimeout(() => {
      textarea.focus();
      const newPosition = start + variable.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const insertFormatting = (format: 'bold' | 'italic') => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = message;
    const selectedText = text.substring(start, end);
    
    const formatChar = format === 'bold' ? '*' : '_';
    const formattedText = selectedText 
      ? `${formatChar}${selectedText}${formatChar}`
      : `${formatChar}${formatChar}`;
    
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = before + formattedText + after;
    
    setMessage(newText);

    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start + 1, start + 1 + selectedText.length);
      } else {
        const newPosition = start + 1;
        textarea.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  const validateMessage = (msg: string): boolean => {
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const matches = msg.match(variablePattern);
    
    if (!matches) return true;

    const validVariables = TEMPLATE_VARIABLES.map(v => v.variable);
    return matches.every(match => validVariables.includes(match));
  };

  const canSave = name.trim() !== '' && trigger !== '' && message.trim() !== '' && validateMessage(message);

  const handleSave = () => {
    if (!canSave) return;

    const data = {
      name: name.trim(),
      is_active: isActive,
      notification_type: trigger as NotificationTrigger,
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

            {/* Gatilho */}
            <div className="space-y-2">
              <Label htmlFor="trigger">Gatilho de Envio</Label>
              <Select value={trigger} onValueChange={(value) => setTrigger(value as NotificationTrigger)}>
                <SelectTrigger id="trigger">
                  <SelectValue placeholder="Selecione um gatilho" />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Popover open={showVariables} onOpenChange={setShowVariables}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <Code2 className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 p-0 z-50" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar variável..." className="h-9" />
                        <CommandList className="max-h-[300px] overflow-y-auto">
                          <CommandEmpty>Nenhuma variável encontrada.</CommandEmpty>
                          <CommandGroup>
                            {TEMPLATE_VARIABLES.map((variable) => (
                              <CommandItem
                                key={variable.variable}
                                onSelect={() => insertVariable(variable.variable)}
                                className="cursor-pointer py-2"
                              >
                                <div className="flex flex-col gap-0.5">
                                  <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded w-fit">
                                    {variable.variable}
                                  </code>
                                  <span className="text-xs text-muted-foreground">
                                    {variable.description}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8"
                    onClick={() => insertFormatting('bold')}
                    type="button"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8"
                    onClick={() => insertFormatting('italic')}
                    type="button"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {message.length}/1024 caracteres
                </p>
              </div>
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
