import { useState } from 'react';
import PageHeader from '@/components/app/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useBlingOrders } from '@/hooks/use-bling-orders';
import { Package, CheckCircle2, RefreshCw, ArrowLeft, Package2 } from 'lucide-react';
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

  // Separate available and tracked volumes
  const availableOrders = orders.filter(o => !o.isTracked);
  const trackedOrders = orders.filter(o => o.isTracked);

  // Group by order for better visualization
  const groupByOrder = (volumes: typeof orders) => {
    const grouped = new Map<string, typeof orders>();
    volumes.forEach(volume => {
      const existing = grouped.get(volume.orderId) || [];
      grouped.set(volume.orderId, [...existing, volume]);
    });
    return grouped;
  };

  const availableGrouped = groupByOrder(availableOrders);
  const trackedGrouped = groupByOrder(trackedOrders);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Pedidos do Bling" 
        description="Selecione os volumes que deseja rastrear"
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

      {/* Available Volumes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Volumes Disponíveis</CardTitle>
              <CardDescription>
                {availableOrders.length} {availableOrders.length === 1 ? 'volume' : 'volumes'} de {availableGrouped.size} {availableGrouped.size === 1 ? 'pedido' : 'pedidos'}
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
              <p>Nenhum volume disponível para rastreamento</p>
              <p className="text-sm mt-1">
                Apenas volumes com código de rastreamento aparecem aqui
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from(availableGrouped.entries()).map(([orderId, volumes]) => {
                const firstVolume = volumes[0];
                const isMultiVolume = volumes.length > 1;

                return (
                  <div key={orderId} className="border rounded-lg overflow-hidden">
                    {/* Order Header */}
                    <div className="bg-muted/30 px-4 py-2 flex items-center justify-between border-b">
                      <div className="flex items-center gap-2">
                        <Package2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Pedido #{firstVolume.numero}</span>
                        <span className="text-sm text-muted-foreground">
                          {firstVolume.contato?.nome}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{firstVolume.situacao?.nome}</Badge>
                        <span className="text-sm font-medium">{formatCurrency(firstVolume.valor)}</span>
                      </div>
                    </div>

                    {/* Volumes */}
                    <div className="divide-y">
                      {volumes.map((volume) => (
                        <div
                          key={volume.id}
                          className="flex items-start gap-3 p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => handleToggleOrder(volume.id)}
                        >
                          <Checkbox
                            checked={selectedOrders.has(volume.id)}
                            onCheckedChange={() => handleToggleOrder(volume.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {isMultiVolume && (
                                <Badge variant="outline" className="text-xs">
                                  Volume {volume.volumeNumero}/{volume.totalVolumes}
                                </Badge>
                              )}
                              <span className="text-sm font-mono text-muted-foreground">
                                📦 {volume.codigoRastreamento}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Criado em {new Date(volume.data).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Already Tracked Volumes */}
      {trackedOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Volumes Já Rastreados
            </CardTitle>
            <CardDescription>
              {trackedOrders.length} {trackedOrders.length === 1 ? 'volume' : 'volumes'} de {trackedGrouped.size} {trackedGrouped.size === 1 ? 'pedido' : 'pedidos'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from(trackedGrouped.entries()).map(([orderId, volumes]) => {
                const firstVolume = volumes[0];
                const isMultiVolume = volumes.length > 1;

                return (
                  <div key={orderId} className="border rounded-lg overflow-hidden bg-muted/30">
                    {/* Order Header */}
                    <div className="px-4 py-2 flex items-center justify-between border-b bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Package2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Pedido #{firstVolume.numero}</span>
                        <span className="text-sm text-muted-foreground">
                          {firstVolume.contato?.nome}
                        </span>
                      </div>
                      <Badge variant="outline">Rastreado</Badge>
                    </div>

                    {/* Volumes */}
                    <div className="divide-y">
                      {volumes.map((volume) => (
                        <div
                          key={volume.id}
                          className="flex items-start gap-3 p-4"
                        >
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {isMultiVolume && (
                                <Badge variant="outline" className="text-xs">
                                  Volume {volume.volumeNumero}/{volume.totalVolumes}
                                </Badge>
                              )}
                              <span className="text-sm font-mono text-muted-foreground">
                                📦 {volume.codigoRastreamento}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
