import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, ShoppingCart, AlertTriangle, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CreditBalanceCardProps {
  onPurchaseClick: () => void;
  onAutoRechargeClick: () => void;
}

export function CreditBalanceCard({ onPurchaseClick, onAutoRechargeClick }: CreditBalanceCardProps) {
  const { plan, usage, subscription } = useAuth();

  if (!plan || !usage || !subscription) return null;

  const totalCredits = plan.monthly_credits || 0;
  const usedCredits = usage.used_credits || 0;
  const remainingCredits = Math.max(0, totalCredits - usedCredits);
  const percentage = totalCredits > 0 ? (remainingCredits / totalCredits) * 100 : 0;

  const nextReset = subscription.current_period_end
    ? format(new Date(subscription.current_period_end), "dd 'de' MMMM", { locale: ptBR })
    : 'N/A';

  const daysUntilReset = subscription.current_period_end
    ? differenceInDays(new Date(subscription.current_period_end), new Date())
    : 0;

  const isLow = percentage < 20;
  const isCritical = percentage < 10;

  return (
    <Card className={cn(
      'h-full transition-all duration-300',
      isCritical && 'border-destructive animate-pulse'
    )}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Créditos
            </CardTitle>
            <CardDescription>Saldo de rastreamentos</CardDescription>
          </div>
          {isLow && (
            <Badge variant={isCritical ? 'destructive' : 'secondary'} className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {isCritical ? 'Crítico' : 'Baixo'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col">
        <div className="space-y-2 flex-1">
          <div className="flex justify-between items-end">
            <div className="text-3xl font-bold">
              {remainingCredits.toLocaleString('pt-BR')}
            </div>
            <div className="text-sm text-muted-foreground">
              de {totalCredits.toLocaleString('pt-BR')}
            </div>
          </div>
          
          <Progress 
            value={percentage} 
            className={cn(
              'h-2',
              isCritical && 'bg-destructive/20'
            )}
          />

          <div className="text-xs text-muted-foreground">
            {percentage.toFixed(0)}% disponível
          </div>
        </div>

        <div className="pt-2 border-t mt-4">
          <div className="flex justify-between text-sm mb-4">
            <span className="text-muted-foreground">Renova em</span>
            <span className="font-medium">
              {daysUntilReset} {daysUntilReset === 1 ? 'dia' : 'dias'} ({nextReset})
            </span>
          </div>

          <div className="flex gap-2">
            <Button 
              className="flex-1" 
              onClick={onPurchaseClick}
              variant="outline"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Comprar Créditos
            </Button>
            <Button 
              className="flex-1" 
              onClick={onAutoRechargeClick}
              variant="outline"
            >
              <Zap className="mr-2 h-4 w-4" />
              Auto Recharge
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
