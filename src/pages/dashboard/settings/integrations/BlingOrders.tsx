import { useState } from 'react';
import PageHeader from '@/components/app/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useBlingOrders } from '@/hooks/use-bling-orders';
import { Package, CheckCircle2, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';

export default function BlingOrders() {
  const navigate = useNavigate();
  const { orders, isLoading, refetch, importOrders, isImporting } = useBlingOrders();
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  const handleSelectAll = () => {
    if (selectedOrders.size === availableOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(availableOrders.map(o => o.id)));
    }
  };

  const handleToggleOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleImport = () => {
    if (selectedOrders.size === 0) return;
    importOrders(Array.from(selectedOrders));
    setSelectedOrders(new Set());
  };

  // Only show orders with tracking codes that aren't already tracked
  const availableOrders = orders.filter(o => o.codigoRastreamento && !o.isTracked);
  const trackedOrders = orders.filter(o => o.isTracked);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Pedidos do Bling" 
        description="Selecione os pedidos que deseja rastrear"
      />

      {/* Actions Bar */}
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
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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

      {/* Available Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pedidos Disponíveis</CardTitle>
              <CardDescription>
                Pedidos com código de rastreamento que ainda não estão sendo rastreados
              </CardDescription>
            </div>
            {availableOrders.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedOrders.size === availableOrders.length ? 'Desmarcar Todos' : 'Marcar Todos'}
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
          ) : availableOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum pedido disponível para rastreamento</p>
              <p className="text-sm mt-1">
                Apenas pedidos com código de rastreamento aparecem aqui
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleToggleOrder(order.id)}
                >
                  <Checkbox
                    checked={selectedOrders.has(order.id)}
                    onCheckedChange={() => handleToggleOrder(order.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">Pedido #{order.numero}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.contato?.nome}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {order.situacao?.nome}
                      </Badge>
                    </div>
                    
                    <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                      <span>📦 {order.codigoRastreamento}</span>
                      <span>💰 {formatCurrency(order.valor)}</span>
                      <span>📅 {new Date(order.data).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Already Tracked Orders */}
      {trackedOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Pedidos Já Rastreados
            </CardTitle>
            <CardDescription>
              Estes pedidos já estão sendo monitorados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trackedOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-start gap-3 p-4 border rounded-lg bg-muted/50"
                >
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">Pedido #{order.numero}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.contato?.nome}
                        </p>
                      </div>
                      <Badge variant="outline">
                        Rastreado
                      </Badge>
                    </div>
                    
                    <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                      <span>📦 {order.codigoRastreamento}</span>
                      <span>💰 {formatCurrency(order.valor)}</span>
                      <span>📅 {new Date(order.data).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
