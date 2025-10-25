import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, MoreVertical, Eye, Pencil, Copy, Trash2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTemplates } from '@/hooks/use-templates';
import { MessageTemplate, TRIGGER_OPTIONS } from '@/types/templates';
import { CreateEditTemplateDialog } from '@/components/templates/CreateEditTemplateDialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { getTriggerColorClass } from '@/lib/trigger-colors';

export default function TemplatesPage() {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate, toggleActive } = useTemplates();
  const { customer } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && template.is_active) ||
      (statusFilter === 'inactive' && !template.is_active);
    return matchesSearch && matchesStatus;
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

  const handleDuplicate = (template: MessageTemplate) => {
    duplicateTemplate(template.id);
  };

  const handleToggleActive = (template: MessageTemplate, checked: boolean) => {
    toggleActive({ 
      id: template.id, 
      isActive: checked,
      notificationType: template.notification_type 
    });
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

  const getTriggerLabel = (trigger: string) => {
    const option = TRIGGER_OPTIONS.find((t) => t.value === trigger);
    return option?.label || trigger;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold">Templates de Mensagens</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie templates de WhatsApp para seus clientes
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold">Templates de Mensagens</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie templates de WhatsApp para seus clientes
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Table */}
      {filteredTemplates.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center text-center">
            <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {search || statusFilter !== 'all' 
                ? 'Nenhum template encontrado' 
                : 'Nenhum template criado'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {search || statusFilter !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Crie seu primeiro template de mensagem para começar'}
            </p>
            {!search && statusFilter === 'all' && (
              <Button onClick={handleNew}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Template
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Lista de Templates</CardTitle>
            <CardDescription>
              Total de {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} 
              {statusFilter !== 'all' && ` (${statusFilter === 'active' ? 'ativos' : 'inativos'})`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Gatilhos</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium cursor-pointer" onClick={() => handleView(template)}>
                        {template.name}
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => handleView(template)}>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getTriggerColorClass(template.notification_type as any)}`}
                        >
                          {getTriggerLabel(template.notification_type)}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={template.is_active}
                          onCheckedChange={(checked) => handleToggleActive(template, checked)}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground cursor-pointer" onClick={() => handleView(template)}>
                        {format(new Date(template.created_at), "dd/MM/yyyy", { locale: ptBR })}
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
                            <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(template.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
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
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <CreateEditTemplateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        template={selectedTemplate}
        existingTemplates={templates}
        viewOnly={viewOnly}
        onSave={(data) => {
          if (!customer) {
            toast.error('Sua sessão expirou. Faça login novamente.');
            return;
          }
          createTemplate({ ...data, customer_id: customer.id });
          setShowCreateDialog(false);
        }}
        onUpdate={(data) => {
          updateTemplate(data);
          setShowCreateDialog(false);
          setViewOnly(false);
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
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
