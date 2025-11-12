import { useMemo, useState } from 'react';
import PageHeader from '@/components/app/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useBlingOrders, BlingOrderSummary } from '@/hooks/use-bling-orders';
import { Package, CheckCircle2, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';

const STATUS_LABELS: Record<number, string> = {
  6: 'Em aberto',
  9: 'Em andamento',
  12: 'Em produção',
};

const STATUS_ORDER = [6, 9, 12];

const getStatusLabel = (statusId: number) => STATUS_LABELS[statusId] ?? `Status ${statusId}`;

const getStatusVariant = (statusId: number): 'default' | 'secondary' | 'outline' => {
  if (statusId === 6) return 'outline';
  if (statusId === 9) return 'secondary';
  if (statusId === 12) return 'default';
  return 'outline';
};

const formatDate = (value?: string) => {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
};

export default function BlingOrders() {
  const navigate = useNavigate();
  const { orders, isLoading, isFetching, refetch, importOrders, isImporting } = useBlingOrders();
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<number | 'todos'>('todos');

  const { availableOrders, trackedOrders, statusCounts } = useMemo(() => {
    const mapped = orders.reduce(
      (acc, order) => {
        if (order.isTracked) {
          acc.tracked.push(order);
        } else {
          acc.available.push(order);
        }

        acc.counts[order.situacaoId] = (acc.counts[order.situacaoId] || 0) + 1;
        return acc;
      },
      {
        available: [] as BlingOrderSummary[],
        tracked: [] as BlingOrderSummary[],
        counts: {} as Record<number, number>,
      }
    );

    return {
      availableOrders: mapped.available,
      trackedOrders: mapped.tracked,
      statusCounts: mapped.counts,
    };
  }, [orders]);

  const normalizedStatusFilter = statusFilter;

  const filteredAvailable = normalizedStatusFilter === 'todos'
    ? availableOrders
    : availableOrders.filter(order => order.situacaoId === normalizedStatusFilter);

  const filteredTracked = normalizedStatusFilter === 'todos'
    ? trackedOrders
    : trackedOrders.filter(order => order.situacaoId === normalizedStatusFilter);

  const handleSelectAll = () => {
    if (selectedOrders.size === filteredAvailable.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredAvailable.map(order => order.orderId)));
    }
  };

  const handleToggleOrder = (orderId: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const handleImport = () => {
    if (selectedOrders.size === 0) return;
    importOrders(Array.from(selectedOrders));
    setSelectedOrders(new Set());
  };

  const isBusy = isLoading || isFetching;
  const showStatusFilter = orders.length > 0;

  const statusButtons = [
    ...STATUS_ORDER.filter(id => statusCounts[id]),
    ...Object.keys(statusCounts)
      .map(Number)
      .filter(id => !STATUS_ORDER.includes(id)),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos do Bling"
        description="Selecione os pedidos que deseja importar para rastreamento"
      />

      {showStatusFilter && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={statusFilter === 'todos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('todos')}
              >
                Todos ({orders.length})
              </Button>
              {statusButtons.map(statusId => (
                <Button
                  key={statusId}
                  variant={statusFilter === statusId ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(statusId)}
                >
                  {getStatusLabel(statusId)} ({statusCounts[statusId]})
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={() => navigate('/dashboard/settings/integrations/bling')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isBusy}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isBusy ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            onClick={handleImport}
            disabled={selectedOrders.size === 0 || isImporting}
            className="gap-2"
          >
            <Package className="h-4 w-4" />
            Importar {selectedOrders.size > 0 && `(${selectedOrders.size})`}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pedidos disponíveis</CardTitle>
              <CardDescription>
                {filteredAvailable.length} pedido{filteredAvailable.length === 1 ? '' : 's'} disponível(is)
              </CardDescription>
            </div>
            {filteredAvailable.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedOrders.size === filteredAvailable.length ? 'Desmarcar todos' : 'Marcar todos'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredAvailable.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum pedido disponível</p>
              <p className="text-sm mt-1">
                Clique em &quot;Atualizar&quot; para buscar novos pedidos.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAvailable.map(order => (
                <div
                  key={order.orderId}
                  className="border rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedOrders.has(order.orderId)}
                      onCheckedChange={() => handleToggleOrder(order.orderId)}
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Pedido #{order.numero}</span>
                        <Badge variant={getStatusVariant(order.situacaoId)}>
                          {getStatusLabel(order.situacaoId)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Cliente: {order.contatoNome}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Data: {formatDate(order.data)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-between md:justify-end">
                    <span className="font-semibold">{formatCurrency(order.total)}</span>
                    {order.isTracked && (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Já importado
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {filteredTracked.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Pedidos já importados
            </CardTitle>
            <CardDescription>
              {filteredTracked.length} pedido{filteredTracked.length === 1 ? '' : 's'} importado(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredTracked.map(order => (
              <div key={order.orderId} className="border rounded-lg p-4 bg-muted/40 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Pedido #{order.numero}</span>
                    <Badge variant={getStatusVariant(order.situacaoId)}>
                      {getStatusLabel(order.situacaoId)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cliente: {order.contatoNome} • Data: {formatDate(order.data)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatCurrency(order.total)}</span>
                  <Badge variant="outline">Rastreado</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
