import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTableSorting } from '@/hooks/use-table-sorting';
import { useTableSelection } from '@/hooks/use-table-selection';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { BulkActionsBar } from '@/components/ui/bulk-actions-bar';
import { BulkEditShipmentDialog } from '@/components/dialogs/BulkEditDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

interface ShipmentListProps {
  refreshTrigger?: number;
}

const statusConfig = {
  pending: { label: 'Pendente', variant: 'secondary' as const },
  in_transit: { label: 'Em Trânsito', variant: 'default' as const },
  delivered: { label: 'Entregue', variant: 'default' as const },
  failed: { label: 'Falha', variant: 'destructive' as const },
};

export default function ShipmentList({ refreshTrigger }: ShipmentListProps) {
  const { customer } = useAuth();
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: shipments, isLoading, refetch } = useQuery({
    queryKey: ['shipments', customer?.id, refreshTrigger],
    queryFn: async () => {
      if (!customer?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          shipment_customer:shipment_customers(
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  const { sortColumn, sortDirection, toggleSort, sortedData } = useTableSorting(shipments, 'created_at');
  const allIds = sortedData?.map(s => s.id) || [];
  const { selectedIds, toggleSelect, toggleSelectAll, clearSelection, isAllSelected, isIndeterminate, selectedCount } = useTableSelection(allIds);

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: { status?: string; auto_tracking?: boolean }) => {
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from('shipments').update(updates).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Rastreios atualizados com sucesso' });
      clearSelection();
      refetch();
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from('shipments').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Rastreios excluídos com sucesso' });
      clearSelection();
      refetch();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lista de Rastreios</CardTitle>
          <CardDescription>
            Tabela com filtros por status, busca por código/PLP e timeline lateral nos detalhes
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

  if (!shipments || shipments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lista de Rastreios</CardTitle>
          <CardDescription>
            Tabela com filtros por status, busca por código/PLP e timeline lateral nos detalhes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            <p>Nenhum rastreio cadastrado. Clique em "Novo Rastreio" para começar.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Rastreios</CardTitle>
        <CardDescription>
          Total de {sortedData.length} rastreio{sortedData.length !== 1 ? 's' : ''} cadastrado{sortedData.length !== 1 ? 's' : ''}
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
                <SortableTableHead column="tracking_code" label="Código" currentColumn={sortColumn} currentDirection={sortDirection} onSort={toggleSort} />
                <SortableTableHead column="shipment_customer.first_name" label="Cliente" currentColumn={sortColumn} currentDirection={sortDirection} onSort={toggleSort} />
                <SortableTableHead column="status" label="Status" currentColumn={sortColumn} currentDirection={sortDirection} onSort={toggleSort} />
                <SortableTableHead column="auto_tracking" label="Auto-tracking" currentColumn={sortColumn} currentDirection={sortDirection} onSort={toggleSort} />
                <SortableTableHead column="created_at" label="Criado em" currentColumn={sortColumn} currentDirection={sortDirection} onSort={toggleSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((s) => {
                const status = statusConfig[s.status as keyof typeof statusConfig] || statusConfig.pending;
                const customerName = s.shipment_customer 
                  ? `${s.shipment_customer.first_name} ${s.shipment_customer.last_name}`
                  : '—';

                return (
                  <TableRow key={s.id} className="hover:bg-muted/50">
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selectedIds.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} />
                    </TableCell>
                    <TableCell className="font-mono font-medium cursor-pointer" onClick={() => navigate(`/dashboard/shipments/${s.id}`)}>
                      {s.tracking_code}
                    </TableCell>
                    <TableCell className="cursor-pointer" onClick={() => navigate(`/dashboard/shipments/${s.id}`)}>
                      {customerName}
                    </TableCell>
                    <TableCell className="cursor-pointer" onClick={() => navigate(`/dashboard/shipments/${s.id}`)}>
                      <Badge variant={status.variant}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="cursor-pointer" onClick={() => navigate(`/dashboard/shipments/${s.id}`)}>
                      {s.auto_tracking ? (
                        <Badge variant="outline">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Desativado</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground cursor-pointer" onClick={() => navigate(`/dashboard/shipments/${s.id}`)}>
                      {format(new Date(s.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      
      <BulkEditShipmentDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} selectedCount={selectedCount} onConfirm={bulkUpdateMutation.mutateAsync} />
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedCount} rastreio{selectedCount !== 1 ? 's' : ''}? Esta ação não pode ser desfeita.
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
