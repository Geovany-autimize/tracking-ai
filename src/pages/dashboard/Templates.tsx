import { useState } from 'react';
import { useTemplates } from '@/hooks/use-templates';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Eye, MoreVertical, Copy, Trash, Pencil, Plus, FileText } from 'lucide-react';
import { CreateEditTemplateDialog } from '@/components/templates/CreateEditTemplateDialog';
import { TriggerAssignmentSection } from '@/components/templates/TriggerAssignmentSection';
import { MessageTemplate, NotificationTrigger } from '@/types/templates';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PageHeader from '@/components/app/PageHeader';
import { toast } from 'sonner';

const TemplatesPage = () => {
  const { templates, isLoading, getActiveTemplateForTrigger, assignTemplate, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate } = useTemplates();
  const { customer } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const filteredTemplates = templates.filter((template) => {
    return template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.message_content.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleView = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setViewOnly(true);
    setShowCreateDialog(true);
  };

  const handleEdit = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setViewOnly(false);
    setShowCreateDialog(true);
  };

  const handleNew = () => {
    setSelectedTemplate(null);
    setViewOnly(false);
    setShowCreateDialog(true);
  };

  const handleDuplicate = (id: string) => {
    duplicateTemplate(id);
  };

  const handleAssignTemplate = (trigger: NotificationTrigger, templateId: string | null) => {
    assignTemplate({ trigger, templateId });
  };

  const handleDelete = (id: string) => {
    setTemplateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteTemplate(templateToDelete);
      setTemplateToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Templates de Mensagens"
        description="Gerencie templates de mensagens para notificações automáticas"
      />

      {/* Seção de Atribuição de Gatilhos */}
      <TriggerAssignmentSection
        templates={templates}
        onAssign={handleAssignTemplate}
        getActiveTemplate={getActiveTemplateForTrigger}
        isLoading={isLoading}
      />

      {/* Seção de Lista de Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Lista de Templates</CardTitle>
          </div>
          <CardDescription>
            Crie, edite e gerencie todos os seus templates de mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <Input
              placeholder="Buscar templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            
            <Button onClick={handleNew} className="gap-2 whitespace-nowrap">
              <Plus className="h-4 w-4" />
              Novo Template
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? 'Nenhum template encontrado com os filtros aplicados.'
                  : 'Nenhum template criado ainda. Crie seu primeiro template!'}
              </p>
              {!searchTerm && (
                <Button onClick={handleNew} variant="outline">
                  Criar Primeiro Template
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell 
                        className="font-medium cursor-pointer"
                        onClick={() => handleView(template)}
                      >
                        {template.name}
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => handleView(template)}>
                        {format(new Date(template.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(template)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(template)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(template.id)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(template.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateEditTemplateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        template={selectedTemplate}
        existingTemplates={templates}
        viewOnly={viewOnly}
        onSave={(data) => {
          if (!customer?.id) {
            toast.error('Sessão expirada. Faça login novamente.');
            return;
          }
          createTemplate({ ...data, customer_id: customer.id });
          setShowCreateDialog(false);
        }}
        onUpdate={(data) => {
          updateTemplate(data);
          setShowCreateDialog(false);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TemplatesPage;
