import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Zap, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useStripeCheckout } from '@/hooks/use-stripe-checkout';

interface CurrentPlanCardProps {
  onUpgradeClick?: () => void;
}

export function CurrentPlanCard({ onUpgradeClick }: CurrentPlanCardProps) {
  const { plan, subscription } = useAuth();
  const { openCustomerPortal, isLoading } = useStripeCheckout();

  if (!plan || !subscription) return null;

  const nextBilling = subscription.current_period_end
    ? format(new Date(subscription.current_period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : 'N/A';

  const isPremium = plan.id !== 'free';

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Plano Atual
            </CardTitle>
            <CardDescription>Informações sobre sua assinatura</CardDescription>
          </div>
          <Badge variant={isPremium ? 'default' : 'secondary'}>
            {plan.name}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col justify-between min-h-[230px]">
        <div className="space-y-3 flex-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Valor mensal</span>
            <span className="font-semibold">
              {plan.price_cents ? `R$ ${(plan.price_cents / 100).toFixed(2)}` : 'Grátis'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Próxima cobrança</span>
            <span className="font-medium">{nextBilling}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={isPremium ? 'default' : 'secondary'}>
              {subscription.status === 'active' ? 'Ativo' : subscription.status}
            </Badge>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {!isPremium && onUpgradeClick && (
            <Button 
              className="w-full bg-primary hover:bg-primary/90"
              onClick={onUpgradeClick}
            >
              <Zap className="mr-2 h-4 w-4" />
              Fazer Upgrade
            </Button>
          )}
          
          {isPremium && subscription?.stripe_subscription_id && (
            <Button 
              variant="outline"
              className="w-full"
              onClick={openCustomerPortal}
              disabled={isLoading}
            >
              <Settings className="mr-2 h-4 w-4" />
              {isLoading ? "Carregando..." : "Gerenciar Assinatura"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
