import { useState, useEffect, useRef } from 'react';
import { useWhatsApp } from '@/hooks/use-whatsapp';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, CheckCircle2, XCircle, Smartphone, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const QR_CODE_WEBHOOK_URL = 'https://webhook-n8n.autimize.com.br/webhook/24d94ff6-e04f-4286-b83d-f645e6413a15';

export default function WhatsAppSettings() {
  const { customer } = useAuth();
  const { status, instanceData, isChecking, checkStatus, setStatus, setInstanceData } = useWhatsApp();
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [qrExpiresIn, setQrExpiresIn] = useState(30);
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Timer do QR Code
  useEffect(() => {
    // Limpar intervalos anteriores
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    if (showQRDialog && qrCode && qrExpiresIn > 0) {
      timerIntervalRef.current = setInterval(() => {
        setQrExpiresIn(prev => {
          if (prev <= 1) {
            // Solicitar novo QR Code silenciosamente
            handleGenerateNewQR(true);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    } else if (!showQRDialog) {
      setQrExpiresIn(30);
    }
  }, [showQRDialog, qrCode]); // Removido qrExpiresIn das dependências

  // Polling durante conexão
  const startPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(() => {
      checkStatus(true);
    }, 3000);

    // Removido timeout - polling continua até conectar ou fechar dialog
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Parar polling quando conectar
  useEffect(() => {
    if (status === 'connected' && showQRDialog) {
      stopPolling();
      setShowQRDialog(false);
      setQrCode(null);
      toast({
        title: 'WhatsApp conectado!',
        description: 'Sua conta foi conectada com sucesso',
      });
    }
  }, [status, showQRDialog]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      stopPolling();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const handleGenerateNewQR = async (silent = false) => {
    if (!customer?.id) return;

    try {
      const response = await fetch(QR_CODE_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: customer.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao gerar QR Code');
      }

      const data = await response.json();
      
      if (data && data.length > 0 && data[0].binary?.data?.data) {
        const base64Image = data[0].binary.data.data;
        const mimeType = data[0].binary.data.mimeType || 'image/png';
        const qrCodeDataUrl = `data:${mimeType};base64,${base64Image}`;
        // Adicionar timestamp para forçar re-render do useEffect
        setQrCode(`${qrCodeDataUrl}?t=${Date.now()}`);
        setQrExpiresIn(30);
        
        // Mostrar toast apenas se não for renovação automática
        if (!silent) {
          toast({
            title: 'Novo QR Code gerado',
            description: 'Escaneie o código para conectar',
          });
        }
      }
    } catch (error) {
      console.error('Error generating QR Code:', error);
      if (!silent) {
        toast({
          title: 'Erro ao gerar QR Code',
          description: 'Tente novamente',
          variant: 'destructive',
        });
      }
    }
  };

  const handleConnect = async () => {
    if (!customer?.id) {
      toast({
        title: 'Erro',
        description: 'Usuário não identificado',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setStatus('connecting');

    try {
      const response = await fetch(QR_CODE_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: customer.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao conectar com o WhatsApp');
      }

      const data = await response.json();
      
      if (data && data.length > 0 && data[0].binary?.data?.data) {
        const base64Image = data[0].binary.data.data;
        const mimeType = data[0].binary.data.mimeType || 'image/png';
        const qrCodeDataUrl = `data:${mimeType};base64,${base64Image}`;
        setQrCode(qrCodeDataUrl);
        setShowQRDialog(true);
        setQrExpiresIn(30);
        
        startPolling();
      }
    } catch (error) {
      console.error('Error connecting WhatsApp:', error);
      toast({
        title: 'Erro ao conectar',
        description: error instanceof Error ? error.message : 'Tente novamente mais tarde',
        variant: 'destructive',
      });
      setStatus('disconnected');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setStatus('disconnected');
    setInstanceData(null);
    stopPolling();
    toast({
      title: 'WhatsApp desconectado',
      description: 'Sua conta foi desconectada',
    });
  };

  const handleManualRefresh = () => {
    const now = Date.now();
    // Throttle de 3 segundos
    if (now - lastRefresh < 3000) {
      toast({
        title: 'Aguarde',
        description: 'Aguarde alguns segundos antes de verificar novamente',
      });
      return;
    }
    setLastRefresh(now);
    checkStatus(true);
  };

  const statusConfig = {
    connected: {
      icon: <CheckCircle2 className="h-5 w-5" />,
      label: 'Conectado',
      variant: 'default' as const,
      color: 'text-green-500',
    },
    disconnected: {
      icon: <XCircle className="h-5 w-5" />,
      label: 'Desconectado',
      variant: 'outline' as const,
      color: 'text-muted-foreground',
    },
    connecting: {
      icon: <Loader2 className="h-5 w-5 animate-spin" />,
      label: 'Conectando...',
      variant: 'secondary' as const,
      color: 'text-blue-500',
    },
    checking: {
      icon: <Loader2 className="h-5 w-5 animate-spin" />,
      label: 'Verificando...',
      variant: 'secondary' as const,
      color: 'text-blue-500',
    },
  };

  const currentStatus = statusConfig[status];

  // Extrair número formatado
  const formatPhoneNumber = (jid?: string) => {
    if (!jid) return null;
    const number = jid.split('@')[0];
    if (number.length >= 12) {
      return `+${number.slice(0, 2)} (${number.slice(2, 4)}) ${number.slice(4, 9)}-${number.slice(9)}`;
    }
    return `+${number}`;
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h2 className="text-2xl font-semibold">Configuração do WhatsApp</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte sua conta do WhatsApp para enviar notificações aos clientes
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Status da Conexão
              </CardTitle>
              <CardDescription>
                Gerencie a conexão da sua conta do WhatsApp
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={currentStatus.variant} className="gap-2">
                <span className={currentStatus.color}>{currentStatus.icon}</span>
                {currentStatus.label}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleManualRefresh}
                disabled={isChecking}
                title="Verificar status da conexão"
              >
                <RefreshCw className={cn("h-4 w-4", isChecking && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'disconnected' && (
            <div className="rounded-lg border bg-muted/50 p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Como conectar:</h3>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Clique no botão "Conectar WhatsApp"</li>
                    <li>Um QR Code será exibido</li>
                    <li>Abra o WhatsApp no seu celular</li>
                    <li>Vá em Configurações → Aparelhos conectados → Conectar aparelho</li>
                    <li>Escaneie o QR Code exibido</li>
                  </ol>
                </div>
                <Button 
                  onClick={handleConnect} 
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Conectar WhatsApp
                </Button>
              </div>
            </div>
          )}

          {status === 'connected' && instanceData && (
            <div className="rounded-lg border bg-green-500/10 border-green-500/20 p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  {instanceData.profilePicUrl && (
                    <AvatarImage src={instanceData.profilePicUrl} alt={instanceData.profileName || 'Profile'} />
                  )}
                  <AvatarFallback className="bg-green-500/20 text-green-500">
                    <Smartphone className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-medium text-green-500 mb-1">WhatsApp Conectado</h3>
                    <p className="text-sm text-muted-foreground">
                      Sua conta está conectada e pronta para enviar notificações
                    </p>
                  </div>
                  
                  <div className="space-y-2 pt-2 border-t border-green-500/20">
                    {instanceData.profileName && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Nome:</span>
                        <span className="font-medium">{instanceData.profileName}</span>
                      </div>
                    )}
                    {instanceData.ownerJid && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Número:</span>
                        <span className="font-medium">{formatPhoneNumber(instanceData.ownerJid)}</span>
                      </div>
                    )}
                    {instanceData.name && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Instância:</span>
                        <span className="font-mono text-xs">{instanceData.name}</span>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleDisconnect}
                    className="mt-2"
                  >
                    Desconectar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {status === 'connecting' && instanceData && (
            <div className="rounded-lg border bg-amber-500/10 border-amber-500/20 p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  {instanceData.profilePicUrl && (
                    <AvatarImage src={instanceData.profilePicUrl} alt={instanceData.profileName || 'Profile'} />
                  )}
                  <AvatarFallback className="bg-amber-500/20 text-amber-500">
                    <Smartphone className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-medium text-amber-500 mb-1">WhatsApp Aguardando Conexão</h3>
                    <p className="text-sm text-muted-foreground">
                      A instância foi criada mas ainda não está conectada. Gere um QR Code para conectar seu número.
                    </p>
                  </div>
                  
                  <div className="space-y-2 pt-2 border-t border-amber-500/20">
                    {instanceData.profileName && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Nome:</span>
                        <span className="font-medium">{instanceData.profileName}</span>
                      </div>
                    )}
                    {instanceData.ownerJid && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Número:</span>
                        <span className="font-medium">{formatPhoneNumber(instanceData.ownerJid)}</span>
                      </div>
                    )}
                    {instanceData.name && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Instância:</span>
                        <span className="font-mono text-xs">{instanceData.name}</span>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleConnect}
                    disabled={isLoading}
                    className="mt-2"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Gerar QR Code para Conectar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Conectar WhatsApp
            </DialogTitle>
            <DialogDescription>
              Escaneie o QR Code abaixo com seu WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrCode ? (
              <>
                <div className="rounded-lg border bg-white p-4">
                  <img 
                    src={qrCode} 
                    alt="QR Code WhatsApp" 
                    className="w-64 h-64 object-contain"
                  />
                </div>
                
                {/* Timer Visual */}
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className={cn(
                      "text-sm font-medium",
                      qrExpiresIn > 15 ? "text-green-500" :
                      qrExpiresIn > 10 ? "text-amber-500" :
                      qrExpiresIn > 5 ? "text-orange-500" :
                      "text-red-500"
                    )}>
                      {qrExpiresIn === 0 ? "Gerando novo QR Code..." : 
                       qrExpiresIn <= 5 ? `Expira em ${qrExpiresIn}s! Escaneie rápido!` :
                       `Expira em: ${qrExpiresIn}s`}
                    </span>
                  </div>
                  <Progress 
                    value={(qrExpiresIn / 30) * 100} 
                    className="h-2"
                  />
                </div>

                {qrExpiresIn <= 5 && (
                  <div className="flex items-center gap-2 text-sm text-amber-500">
                    <AlertCircle className="h-4 w-4" />
                    <span>QR Code expirando, aguarde renovação automática...</span>
                  </div>
                )}
              </>
            ) : (
              <div className="w-64 h-64 rounded-lg border bg-muted flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            
            <div className="text-center space-y-2 max-w-xs">
              <p className="text-sm font-medium">Como escanear:</p>
              <ol className="text-xs text-muted-foreground space-y-1.5 text-left">
                <li className="flex gap-2">
                  <span className="font-medium">1.</span>
                  <span>Abra o WhatsApp no celular</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium">2.</span>
                  <span>Toque em <strong>Mais opções</strong> (⋮) ou <strong>Configurações</strong></span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium">3.</span>
                  <span>Selecione <strong>Aparelhos conectados</strong></span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium">4.</span>
                  <span>Toque em <strong>Conectar um aparelho</strong></span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium">5.</span>
                  <span>Escaneie o QR Code acima</span>
                </li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
