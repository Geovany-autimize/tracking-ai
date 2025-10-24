import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  const { data: shipments, isLoading } = useQuery({
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
          Total de {shipments.length} rastreio{shipments.length !== 1 ? 's' : ''} cadastrado{shipments.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Auto-tracking</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((s) => {
                const status = statusConfig[s.status as keyof typeof statusConfig] || statusConfig.pending;
                const customerName = s.shipment_customer 
                  ? `${s.shipment_customer.first_name} ${s.shipment_customer.last_name}`
                  : '—';

                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-medium">
                      {s.tracking_code}
                    </TableCell>
                    <TableCell>{customerName}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.auto_tracking ? (
                        <Badge variant="outline">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Desativado</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(s.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
