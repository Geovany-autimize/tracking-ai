import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageTemplate, TRIGGER_OPTIONS } from '@/types/templates';
import { WhatsAppPreview } from './WhatsAppPreview';

interface ViewTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: MessageTemplate | null;
  onEdit: (template: MessageTemplate) => void;
}

export function ViewTemplateDialog({
  open,
  onOpenChange,
  template,
  onEdit,
}: ViewTemplateDialogProps) {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{template.name}</span>
            <Badge variant={template.is_active ? 'default' : 'secondary'}>
              {template.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Visualize como o template será enviado aos clientes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Criado em
                  </Label>
                  <p className="text-sm">
                    {format(new Date(template.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Última atualização
                  </Label>
                  <p className="text-sm">
                    {format(new Date(template.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

      {/* Gatilho */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Gatilho de Envio</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">
            {TRIGGER_OPTIONS.find((t) => t.value === template.notification_type)?.label}
          </Badge>
        </CardContent>
      </Card>

          {/* Preview WhatsApp */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Preview da Mensagem</CardTitle>
            </CardHeader>
            <CardContent>
              <WhatsAppPreview message={template.message_content} />
            </CardContent>
          </Card>

          {/* Mensagem Original */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Mensagem Original (com variáveis)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-3 rounded-lg whitespace-pre-wrap font-mono">
                {template.message_content}
              </pre>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onEdit(template)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
