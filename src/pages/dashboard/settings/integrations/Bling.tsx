import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Package, ArrowLeft, RefreshCw, Unplug, CheckCircle, AlertCircle, Clock, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/app/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useBlingIntegration } from '@/hooks/use-bling-integration';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function BlingIntegration() {
  const navigate = useNavigate();
  const {
    integration,
    syncLogs,
    isLoadingIntegration,
    isLoadingLogs,
    isConnected,
    hasError,
    startOAuth,
    syncOrders,
    disconnect,
    validateToken,
    isSyncing,
    isDisconnecting,
    isValidating,
  } = useBlingIntegration();

  // Validar token ao montar o componente
  useEffect(() => {
    if (integration && integration.status === 'active') {
      validateToken();
    }
  }, [integration?.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/dashboard/settings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <PageHeader
          title="Integração Bling"
          description="Importe pedidos automaticamente do Bling para o Tracking AI"
        />
      </div>

      {/* Card de Status da Conexão */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <BrandLogo brand="bling" eager={true} />
          <div className="flex-1">
            <CardTitle>Bling ERP</CardTitle>
            <CardDescription>Sistema de gestão empresarial</CardDescription>
          </div>
          {isLoadingIntegration ? (
            <Skeleton className="h-6 w-20" />
          ) : (
            <Badge variant={hasError ? 'destructive' : isConnected ? 'default' : 'outline'}>
              {hasError ? 'Erro de Autorização' : isConnected ? 'Conectado' : 'Não configurado'}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingIntegration ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : hasError && integration ? (
            <>
              <div className="space-y-3 rounded-lg bg-destructive/10 border border-destructive/30 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-destructive">
                      Autorização Revogada
                    </p>
                    <p className="text-sm text-muted-foreground">
                      A autorização do Bling foi revogada ou expirou. Por favor, reconecte para continuar sincronizando pedidos.
                    </p>
                  </div>
                </div>
                {integration.last_sync_at && (
                  <p className="text-xs text-muted-foreground">
                    Última sincronização bem-sucedida: {formatDate(integration.last_sync_at)}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
              <Button 
                onClick={startOAuth} 
                disabled={false}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reconectar com Bling
              </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={isDisconnecting} className="gap-2">
                      <Unplug className="h-4 w-4" />
                      Remover Integração
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover Integração?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso irá remover completamente a integração com o Bling. Você poderá reconectar a qualquer momento.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={disconnect}>
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          ) : isConnected && integration ? (
            <>
              <div className="space-y-2 rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Status:</strong> Integração ativa {isValidating && '(validando...)'}
                </p>
                {integration.last_sync_at && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Última sincronização:</strong> {formatDate(integration.last_sync_at)}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  <strong>Conectado em:</strong> {formatDate(integration.created_at)}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => navigate('/dashboard/settings/integrations/bling/orders')}
                  variant="outline"
                  className="gap-2"
                >
                  <Package className="h-4 w-4" />
                  Gerenciar Pedidos
                </Button>

                <Button
                  onClick={syncOrders}
                  disabled={isSyncing}
                  className="gap-2"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Sincronizar Todos
                    </>
                  )}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDisconnecting} className="gap-2">
                      <Unplug className="h-4 w-4" />
                      Desconectar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Desconectar Bling?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso irá desativar a integração com o Bling. Você poderá reconectar a qualquer momento.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={disconnect}>
                        Desconectar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Conecte sua conta Bling para importar pedidos automaticamente. Os pedidos com código de rastreio serão sincronizados como envios no Tracking AI.
              </p>

              <Button 
                onClick={startOAuth}
                disabled={false}
                className="gap-2"
              >
                Conectar com Bling
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Card de Histórico de Sincronizações */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Sincronizações</CardTitle>
            <CardDescription>Últimas 10 sincronizações realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLogs ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : syncLogs && syncLogs.length > 0 ? (
              <div className="space-y-2">
                {syncLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="shrink-0 mt-1">
                      {log.status === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : log.status === 'partial' ? (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={log.sync_type === 'manual' ? 'default' : 'secondary'} className="text-xs">
                          {log.sync_type === 'manual' ? 'Manual' : 'Automática'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(log.started_at)}
                        </span>
                      </div>

                      <p className="text-sm">
                        <strong>{log.orders_imported}</strong> importados,{' '}
                        <strong>{log.orders_updated}</strong> atualizados
                        {log.orders_failed > 0 && (
                          <>, <strong className="text-destructive">{log.orders_failed}</strong> falharam</>
                        )}
                      </p>

                      {log.error_message && (
                        <p className="text-xs text-muted-foreground">
                          {log.error_message}
                        </p>
                      )}

                      {!log.completed_at && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 animate-pulse" />
                          <span>Em andamento...</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma sincronização realizada ainda
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Card de Como Funciona */}
      <Card>
        <CardHeader>
          <CardTitle>Como funciona a integração?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-2">
            <li>Conecte sua conta Bling de forma segura via OAuth</li>
            <li>O Tracking AI busca automaticamente seus pedidos com código de rastreio</li>
            <li>Os pedidos são importados como envios e começam a ser rastreados</li>
            <li>Você pode sincronizar manualmente a qualquer momento</li>
            <li>As informações dos clientes são preservadas e associadas aos envios</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}