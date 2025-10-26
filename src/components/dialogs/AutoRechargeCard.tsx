import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAutoRecharge } from '@/hooks/use-auto-recharge';
import { CreditCard, Zap, Trash2, Settings2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export const AutoRechargeCard = () => {
  const { 
    settings, 
    loading, 
    processing, 
    setupPaymentMethod, 
    updateSettings, 
    removePaymentMethod,
    toggleEnabled,
    confirmSetup
  } = useAutoRecharge();

  const [searchParams, setSearchParams] = useSearchParams();
  const [minCredits, setMinCredits] = useState(settings?.min_credits_threshold || 100);
  const [rechargeAmount, setRechargeAmount] = useState(settings?.recharge_amount || 500);

  // Confirmar setup quando voltar do Stripe
  useEffect(() => {
    const setupSuccess = searchParams.get('setup');
    const sessionId = searchParams.get('session_id');
    
    if (setupSuccess === 'success' && sessionId) {
      confirmSetup(sessionId).then(() => {
        // Limpar query params
        searchParams.delete('setup');
        searchParams.delete('session_id');
        setSearchParams(searchParams);
      });
    }
  }, [searchParams, confirmSetup, setSearchParams]);

  // Atualizar valores locais quando settings mudar
  useEffect(() => {
    if (settings) {
      setMinCredits(settings.min_credits_threshold);
      setRechargeAmount(settings.recharge_amount);
    }
  }, [settings]);

  const hasPaymentMethod = !!settings?.stripe_payment_method_id;
  const isEnabled = settings?.enabled || false;

  const handleSaveSettings = async () => {
    await updateSettings({
      min_credits_threshold: minCredits,
      recharge_amount: rechargeAmount,
    });
  };

  const getCardBrandIcon = (brand?: string) => {
    if (!brand) return '💳';
    const icons: Record<string, string> = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      elo: '💳',
    };
    return icons[brand.toLowerCase()] || '💳';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Recarga Automática
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <CardTitle>Recarga Automática</CardTitle>
          </div>
          {hasPaymentMethod && (
            <Badge variant={isEnabled ? "default" : "secondary"}>
              {isEnabled ? "Ativada" : "Desativada"}
            </Badge>
          )}
        </div>
        <CardDescription>
          Configure a recarga automática de créditos quando estiver com poucos créditos disponíveis
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!hasPaymentMethod ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Configure um método de pagamento para ativar a recarga automática de créditos.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Quando seus créditos ficarem abaixo do limite configurado, faremos uma recarga automática.
            </AlertDescription>
          </Alert>
        )}

        {/* Método de Pagamento */}
        {hasPaymentMethod && settings?.last_payment_method_details && (
          <div className="space-y-2">
            <Label>Método de Pagamento</Label>
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {getCardBrandIcon(settings.last_payment_method_details.brand)} •••• {settings.last_payment_method_details.last4}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expira em {settings.last_payment_method_details.exp_month}/{settings.last_payment_method_details.exp_year}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removePaymentMethod}
                disabled={processing}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Ativar/Desativar */}
        {hasPaymentMethod && (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-recharge-enabled">Ativar Recarga Automática</Label>
              <p className="text-xs text-muted-foreground">
                Recarregar créditos automaticamente quando necessário
              </p>
            </div>
            <Switch
              id="auto-recharge-enabled"
              checked={isEnabled}
              onCheckedChange={toggleEnabled}
              disabled={processing}
            />
          </div>
        )}

        {/* Configurações */}
        {hasPaymentMethod && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="min-credits">
                Limite Mínimo de Créditos
              </Label>
              <Input
                id="min-credits"
                type="number"
                min={50}
                max={1000}
                value={minCredits}
                onChange={(e) => setMinCredits(parseInt(e.target.value))}
                disabled={processing}
              />
              <p className="text-xs text-muted-foreground">
                Quando seus créditos ficarem abaixo de {minCredits}, faremos uma recarga automática
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recharge-amount">
                Quantidade de Créditos para Recarregar
              </Label>
              <Input
                id="recharge-amount"
                type="number"
                min={100}
                max={5000}
                step={100}
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(parseInt(e.target.value))}
                disabled={processing}
              />
              <p className="text-xs text-muted-foreground">
                Recarregaremos {rechargeAmount} créditos (R$ {(rechargeAmount * 0.5).toFixed(2)})
              </p>
            </div>

            <Button
              onClick={handleSaveSettings}
              disabled={processing}
              variant="outline"
              className="w-full"
            >
              <Settings2 className="w-4 h-4 mr-2" />
              Salvar Configurações
            </Button>
          </div>
        )}

        {/* Botão de Configurar Método de Pagamento */}
        <Button
          onClick={setupPaymentMethod}
          disabled={processing}
          variant={hasPaymentMethod ? "outline" : "default"}
          className="w-full"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          {hasPaymentMethod ? 'Alterar Método de Pagamento' : 'Configurar Método de Pagamento'}
        </Button>
      </CardContent>
    </Card>
  );
};
