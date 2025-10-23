import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, CheckCircle2, XCircle, Smartphone } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export default function WhatsAppSettings() {
  const { customer } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      const response = await fetch('https://webhook-n8n.autimize.com.br/webhook/24d94ff6-e04f-4286-b83d-f645e6413a15', {
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
      
      // O webhook retorna um array com a estrutura: [{ binary: { data: { data: "base64...", mimeType: "image/png" } } }]
      if (data && data.length > 0 && data[0].binary?.data?.data) {
        const base64Image = data[0].binary.data.data;
        const mimeType = data[0].binary.data.mimeType || 'image/png';
        
        // Converte base64 para data URL
        const qrCodeDataUrl = `data:${mimeType};base64,${base64Image}`;
        setQrCode(qrCodeDataUrl);
        setShowQRDialog(true);
        
        // Simula polling para verificar conexão (ajuste conforme sua API)
        const checkConnection = setInterval(() => {
          // Aqui você deve verificar o status real via API
          // Por enquanto, simula conexão após 10 segundos
        }, 3000);

        // Cleanup após 60 segundos
        setTimeout(() => {
          clearInterval(checkConnection);
        }, 60000);
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

  const handleConnectionSuccess = () => {
    setStatus('connected');
    setShowQRDialog(false);
    setQrCode(null);
    toast({
      title: 'WhatsApp conectado!',
      description: 'Sua conta foi conectada com sucesso',
    });
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
  };

  const currentStatus = statusConfig[status];

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
            <Badge variant={currentStatus.variant} className="gap-2">
              <span className={currentStatus.color}>{currentStatus.icon}</span>
              {currentStatus.label}
            </Badge>
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

          {status === 'connected' && (
            <div className="rounded-lg border bg-green-500/10 border-green-500/20 p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-green-500 mb-1">WhatsApp Conectado</h3>
                  <p className="text-sm text-muted-foreground">
                    Sua conta está conectada e pronta para enviar notificações
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === 'connecting' && (
            <div className="rounded-lg border bg-blue-500/10 border-blue-500/20 p-6">
              <div className="flex items-start gap-3">
                <Loader2 className="h-5 w-5 text-blue-500 mt-0.5 animate-spin" />
                <div className="flex-1">
                  <h3 className="font-medium text-blue-500 mb-1">Aguardando conexão...</h3>
                  <p className="text-sm text-muted-foreground">
                    Escaneie o QR Code para conectar sua conta
                  </p>
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
              <div className="rounded-lg border bg-white p-4">
                <img 
                  src={qrCode} 
                  alt="QR Code WhatsApp" 
                  className="w-64 h-64 object-contain"
                />
              </div>
            ) : (
              <div className="w-64 h-64 rounded-lg border bg-muted flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Abra o WhatsApp no seu celular
              </p>
              <p className="text-xs text-muted-foreground">
                Configurações → Aparelhos conectados → Conectar aparelho
              </p>
            </div>
            {/* Botão temporário para simular conexão bem-sucedida */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleConnectionSuccess}
              className="mt-2"
            >
              Simular Conexão (Dev)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
