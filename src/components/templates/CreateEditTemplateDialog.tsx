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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Code2, Bold, Italic, Pencil } from 'lucide-react';
import { MessageTemplate, TEMPLATE_VARIABLES, TRIGGER_OPTIONS, NotificationTrigger } from '@/types/templates';
import { WhatsAppPreview } from './WhatsAppPreview';

interface CreateEditTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: MessageTemplate | null;
  existingTemplates?: MessageTemplate[];
  onSave: (data: Omit<MessageTemplate, 'id' | 'customer_id' | 'created_at' | 'updated_at'>) => void;
  onUpdate: (data: Partial<MessageTemplate> & { id: string }) => void;
  isSaving?: boolean;
  viewOnly?: boolean;
}

export function CreateEditTemplateDialog({
  open,
  onOpenChange,
  template,
  existingTemplates = [],
  onSave,
  onUpdate,
  isSaving = false,
  viewOnly = false,
}: CreateEditTemplateDialogProps) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [showVariables, setShowVariables] = useState(false);
  const [isEditing, setIsEditing] = useState(!viewOnly);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Validação de formato slug
  const isValidSlugFormat = (value: string): boolean => {
    const slugPattern = /^[a-z0-9_-]*$/;
    return slugPattern.test(value);
  };

  // Verificação de nome duplicado
  const isDuplicateName = (value: string): boolean => {
    if (!value.trim()) return false;
    return existingTemplates.some(
      t => t.name.toLowerCase() === value.toLowerCase() && t.id !== template?.id
    );
  };

  const nameError = (() => {
    if (!name.trim()) return '';
    if (!isValidSlugFormat(name)) {
      return 'Use apenas letras minúsculas, números, hífens e underscores';
    }
    if (isDuplicateName(name)) {
      return 'Já existe um template com este nome';
    }
    return '';
  })();

  useEffect(() => {
    if (template) {
      setName(template.name);
      setMessage(template.message_content);
      setIsEditing(!viewOnly);
    } else {
      setName('');
      setMessage('');
      setIsEditing(true);
    }
  }, [template, open, viewOnly]);

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

    const wrapper = format === 'bold' ? '**' : '__';
    const before = text.substring(0, start);
    const after = text.substring(end);

    const newSegment = selectedText
      ? `${wrapper}${selectedText}${wrapper}`
      : `${wrapper}${wrapper}`;

    const newText = before + newSegment + after;
    setMessage(newText);

    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start + wrapper.length, start + wrapper.length + selectedText.length);
      } else {
        const newPosition = start + wrapper.length;
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

  const canSave = name.trim() !== '' && 
    message.trim() !== '' && 
    validateMessage(message) &&
    !nameError;

  const handleSave = () => {
    if (!canSave) return;

    const data = {
      name: name.trim(),
      message_content: message.trim(),
      notification_type: [] as any,
      is_active: false,
    };

    if (template) {
      onUpdate({ 
        name: data.name,
        message_content: data.message_content,
        id: template.id 
      });
    } else {
      onSave(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {viewOnly && !isEditing ? 'Visualizar Template' : template ? 'Editar Template' : 'Novo Template'}
          </DialogTitle>
          <DialogDescription>
            {viewOnly && !isEditing 
              ? 'Detalhes do template de mensagem'
              : 'Configure as informações e mensagem do template'}
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
                placeholder="ex: pedido_saiu_para_entrega"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={viewOnly && !isEditing}
                className={nameError ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {nameError ? (
                <p className="text-xs text-destructive font-medium">
                  {nameError}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Use apenas letras minúsculas, números, hífens (-) e underscores (_)
                </p>
              )}
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
                disabled={viewOnly && !isEditing}
              />
              <div className="flex items-center justify-between">
                {(!viewOnly || isEditing) && (
                  <div className="flex items-center gap-2">
                    <Popover open={showVariables} onOpenChange={setShowVariables}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
                          <Code2 className="h-3.5 w-3.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent sideOffset={8} className="w-[560px] p-0 z-50 bg-popover border shadow-md pointer-events-auto" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar variável..." className="h-9" />
            <CommandList 
              className="max-h-[420px] overflow-y-auto overscroll-contain touch-pan-y pr-1"
              onWheelCapture={(e) => e.stopPropagation()}
            >
                            <CommandEmpty>Nenhuma variável encontrada.</CommandEmpty>
                            
                            <CommandGroup heading="👤 Informações do Cliente">
                              {TEMPLATE_VARIABLES.filter(v => v.category === 'cliente').map((variable) => (
                                <CommandItem
                                  key={variable.variable}
                                  onSelect={() => insertVariable(variable.variable)}
                                  className="flex flex-col items-start gap-1 cursor-pointer py-3"
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="font-mono text-xs">
                                      {variable.variable}
                                    </Badge>
                                    <span className="font-medium">{variable.label}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {variable.description} · Ex: {variable.example}
                                  </p>
                                </CommandItem>
                              ))}
                            </CommandGroup>

                            <CommandGroup heading="📦 Rastreamento">
                              {TEMPLATE_VARIABLES.filter(v => v.category === 'rastreamento').map((variable) => (
                                <CommandItem
                                  key={variable.variable}
                                  onSelect={() => insertVariable(variable.variable)}
                                  className="flex flex-col items-start gap-1 cursor-pointer py-3"
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="font-mono text-xs">
                                      {variable.variable}
                                    </Badge>
                                    <span className="font-medium">{variable.label}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {variable.description} · Ex: {variable.example}
                                  </p>
                                </CommandItem>
                              ))}
                            </CommandGroup>

                            <CommandGroup heading="📍 Evento Atual">
                              {TEMPLATE_VARIABLES.filter(v => v.category === 'evento').map((variable) => (
                                <CommandItem
                                  key={variable.variable}
                                  onSelect={() => insertVariable(variable.variable)}
                                  className="flex flex-col items-start gap-1 cursor-pointer py-3"
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="font-mono text-xs">
                                      {variable.variable}
                                    </Badge>
                                    <span className="font-medium">{variable.label}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {variable.description} · Ex: {variable.example}
                                  </p>
                                </CommandItem>
                              ))}
                            </CommandGroup>

                            <CommandGroup heading="🚚 Entrega">
                              {TEMPLATE_VARIABLES.filter(v => v.category === 'entrega').map((variable) => (
                                <CommandItem
                                  key={variable.variable}
                                  onSelect={() => insertVariable(variable.variable)}
                                  className="flex flex-col items-start gap-1 cursor-pointer py-3"
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="font-mono text-xs">
                                      {variable.variable}
                                    </Badge>
                                    <span className="font-medium">{variable.label}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {variable.description} · Ex: {variable.example}
                                  </p>
                                </CommandItem>
                              ))}
                            </CommandGroup>

                            <CommandGroup heading="ℹ️ Informações Adicionais">
                              {TEMPLATE_VARIABLES.filter(v => v.category === 'adicional').map((variable) => (
                                <CommandItem
                                  key={variable.variable}
                                  onSelect={() => insertVariable(variable.variable)}
                                  className="flex flex-col items-start gap-1 cursor-pointer py-3"
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="font-mono text-xs">
                                      {variable.variable}
                                    </Badge>
                                    <span className="font-medium">{variable.label}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {variable.description} · Ex: {variable.example}
                                  </p>
                                </CommandItem>
                              ))}
                            </CommandGroup>

                            <CommandGroup heading="📅 Datas do Processo">
                              {TEMPLATE_VARIABLES.filter(v => v.category === 'datas').map((variable) => (
                                <CommandItem
                                  key={variable.variable}
                                  onSelect={() => insertVariable(variable.variable)}
                                  className="flex flex-col items-start gap-1 cursor-pointer py-3"
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="font-mono text-xs">
                                      {variable.variable}
                                    </Badge>
                                    <span className="font-medium">{variable.label}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {variable.description} · Ex: {variable.example}
                                  </p>
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
                )}
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
          {viewOnly && !isEditing ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => {
                if (viewOnly) {
                  setIsEditing(false);
                } else {
                  onOpenChange(false);
                }
              }}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={!canSave || isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {template ? 'Salvar Alterações' : 'Criar Template'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
