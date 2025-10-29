import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTableSorting } from '@/hooks/use-table-sorting';
import { useTableSelection } from '@/hooks/use-table-selection';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { BulkActionsBar } from '@/components/ui/bulk-actions-bar';
import { BulkEditCustomerDialog } from '@/components/dialogs/BulkEditCustomerDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useHighlights } from '@/contexts/HighlightsContext';

interface CustomerListProps {
  refreshTrigger?: number;
}

export default function CustomerList({ refreshTrigger }: CustomerListProps) {
  const { customer } = useAuth();
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { isNew, dismiss } = useHighlights();

  const { data: customers, isLoading, refetch } = useQuery({
    queryKey: ['shipment_customers', customer?.id, refreshTrigger],
    queryFn: async () => {
      if (!customer?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('shipment_customers')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  const { sortColumn, sortDirection, toggleSort, sortedData } = useTableSorting(customers, 'created_at');
  const allIds = sortedData?.map(c => c.id) || [];
  const { selectedIds, toggleSelect, toggleSelectAll, clearSelection, isAllSelected, selectedCount } = useTableSelection(allIds);

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: { phone?: string; notes?: string }) => {
      const ids = Array.from(selectedIds);
      const updateData: any = {};
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      
      const { error } = await supabase
        .from('shipment_customers')
        .update(updateData)
        .in('id', ids);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Clientes atualizados com sucesso' });
      clearSelection();
      refetch();
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from('shipment_customers').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Clientes excluídos com sucesso' });
      clearSelection();
      refetch();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            Gerencie contatos e preferências de notificação dos seus clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sortedData || sortedData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            Gerencie contatos e preferências de notificação dos seus clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            <p>Nenhum cliente cadastrado ainda.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Clientes</CardTitle>
        <CardDescription>
          Total de {sortedData.length} cliente{sortedData.length !== 1 ? 's' : ''} cadastrado{sortedData.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BulkActionsBar
          selectedCount={selectedCount}
          onEdit={() => setEditDialogOpen(true)}
          onDelete={() => setDeleteDialogOpen(true)}
          onClear={clearSelection}
        />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox 
                    checked={isAllSelected} 
                    onCheckedChange={() => toggleSelectAll(allIds)} 
                  />
                </TableHead>
                <SortableTableHead column="first_name" label="Nome" currentColumn={sortColumn} currentDirection={sortDirection} onSort={toggleSort} />
                <SortableTableHead column="email" label="Email" currentColumn={sortColumn} currentDirection={sortDirection} onSort={toggleSort} />
                <SortableTableHead column="phone" label="Telefone" currentColumn={sortColumn} currentDirection={sortDirection} onSort={toggleSort} />
                <SortableTableHead column="created_at" label="Data de Cadastro" currentColumn={sortColumn} currentDirection={sortDirection} onSort={toggleSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/50">
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
                  </TableCell>
                  <TableCell className="font-medium cursor-pointer" onClick={() => { dismiss('customer', c.id); navigate(`/dashboard/customers/${c.id}`); }}>
                    <span>{c.first_name} {c.last_name}</span>
                    {isNew('customer', c.id) && (
                      <Badge variant="secondary" className="ml-2">Novo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="cursor-pointer" onClick={() => navigate(`/dashboard/customers/${c.id}`)}>{c.email}</TableCell>
                  <TableCell className="cursor-pointer" onClick={() => navigate(`/dashboard/customers/${c.id}`)}>{c.phone || '—'}</TableCell>
                  <TableCell className="text-muted-foreground cursor-pointer" onClick={() => navigate(`/dashboard/customers/${c.id}`)}>
                    {format(new Date(c.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      
      <BulkEditCustomerDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        selectedCount={selectedCount}
        onConfirm={async (data) => {
          await bulkUpdateMutation.mutateAsync(data);
          setEditDialogOpen(false);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedCount} cliente{selectedCount !== 1 ? 's' : ''}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => bulkDeleteMutation.mutate()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
