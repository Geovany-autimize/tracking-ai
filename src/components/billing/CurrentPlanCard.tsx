import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBilling } from '@/hooks/use-billing';

export function CurrentPlanCard() {
  const { plan, subscription } = useAuth();
  const { openBillingPortal, isOpeningPortal } = useBilling();

  if (!plan || !subscription) return null;

  const nextBilling = subscription.current_period_end
    ? format(new Date(subscription.current_period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : 'N/A';

  const isPremium = plan.id !== 'free';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Plano Atual
            </CardTitle>
            <CardDescription>Gerencie sua assinatura</CardDescription>
          </div>
          <Badge variant={isPremium ? 'default' : 'secondary'}>
            {plan.name}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
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

        {plan.monthly_credits && (
          <div className="pt-4 border-t space-y-2">
            <h4 className="text-sm font-medium">Recursos inclusos</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ {plan.monthly_credits.toLocaleString('pt-BR')} créditos/mês</li>
              <li>✓ Rastreamento em tempo real</li>
              <li>✓ Notificações automáticas</li>
              <li>✓ Integrações com WhatsApp</li>
            </ul>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => openBillingPortal()}
          disabled={isOpeningPortal}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          {isOpeningPortal ? 'Carregando...' : 'Gerenciar Pagamento'}
        </Button>
      </CardContent>
    </Card>
  );
}
