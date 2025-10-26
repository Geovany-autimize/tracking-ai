import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Check, Zap, Crown, Building2, Sparkles, CalendarDays, TrendingUp, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function BillingPage() {
  const { customer, plan, usage } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoCredits, setAutoCredits] = useState(false);

  const totalCredits = plan?.monthly_credits || 0;
  const usedCredits = usage?.used_credits || 0;
  const remainingCredits = Math.max(0, totalCredits - usedCredits);
  const usagePercentage = totalCredits > 0 ? (usedCredits / totalCredits) * 100 : 0;

  const getNextRenewalDate = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '0',
      description: 'Para começar a testar',
      credits: 5,
      icon: Zap,
      features: [
        '5 créditos de rastreio/mês',
        '1 usuário',
        'WhatsApp e e-mail básicos',
        'Painel unificado',
        'Sem SLA',
      ],
      badge: null,
      cta: 'Plano Atual',
      highlight: false,
      tier: 1,
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '249',
      description: 'Para operações em crescimento',
      credits: 1500,
      icon: Crown,
      features: [
        '1.500 créditos/mês',
        '3 usuários',
        'Regras e jornadas personalizadas',
        'Métricas e relatórios',
        'Webhooks & API',
        'Suporte prioritário',
      ],
      badge: 'Mais popular',
      cta: 'Assinar Premium',
      highlight: true,
      tier: 2,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Consultar',
      description: 'Para grandes operações',
      credits: null,
      icon: Building2,
      features: [
        'Volume ilimitado',
        'Usuários ilimitados',
        'SSO e SAML',
        'Infraestrutura dedicada',
        'SLA premium 99.9%',
        'Account manager',
        'Desenvolvimento customizado',
      ],
      badge: null,
      cta: 'Falar com vendas',
      highlight: false,
      tier: 3,
    },
  ];

  const handleUpgrade = async (planId: string) => {
    setIsProcessing(true);
    try {
      if (planId === 'enterprise') {
        window.open('https://wa.me/5511999999999?text=Olá! Gostaria de conhecer o plano Enterprise', '_blank');
      } else {
        toast.info('Funcionalidade de upgrade em desenvolvimento', {
          description: 'Em breve você poderá fazer upgrade diretamente pelo app'
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      {/* Header */}
      <header>
        <h2 className="text-3xl font-bold">Planos e Faturamento</h2>
        <p className="text-muted-foreground mt-2">
          Gerencie sua assinatura e acompanhe seu uso
        </p>
      </header>

      {/* Current Plan Summary */}
      <Card className="border-border/50">
        <CardContent className="p-6 space-y-6">
          {/* My Plan Section */}
          <div className="flex items-center justify-between pb-6 border-b">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">Meu Plano</h3>
              <Badge 
                variant="secondary" 
                className={`text-sm transition-colors ${
                  plan?.id === 'free' 
                    ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' 
                    : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15'
                }`}
              >
                {plan?.name || 'Free'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {totalCredits === 0 ? 'Créditos ilimitados' : `${totalCredits} créditos/mês`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {plan?.id !== 'free' && (
                <Button variant="outline" size="sm" onClick={() => handleUpgrade('enterprise')}>
                  Cancelar assinatura
                </Button>
              )}
            </div>
          </div>

          {/* Billing Section */}
          <div className="flex items-center justify-between pb-6 border-b">
            <div>
              <h4 className="text-base font-semibold mb-1">Faturamento</h4>
              <p className="text-2xl font-bold">
                {plan?.id === 'free' ? 'R$ 0,00' : plan?.id === 'premium' ? 'R$ 249,00' : 'Sob consulta'} 
                <span className="text-sm font-normal text-muted-foreground ml-2">cobrado mensalmente</span>
              </p>
              {plan?.id !== 'free' && (
                <p className="text-sm text-muted-foreground mt-1">
                  Próxima fatura em {getNextRenewalDate()}
                </p>
              )}
            </div>
          </div>

          {/* Credits Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-base font-semibold mb-1">Créditos</h4>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">{usedCredits} / {totalCredits} créditos usados ({Math.round(usagePercentage)}%)</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  toast.info('Funcionalidade em desenvolvimento', {
                    description: 'Em breve você poderá comprar créditos extras'
                  });
                }}
              >
                Comprar extras
              </Button>
            </div>
            
            <Progress value={usagePercentage} className="h-2 mb-2" />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-muted-foreground">
                Uso reinicia em {getNextRenewalDate()}
              </p>
              {plan?.id !== 'free' && (
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={autoCredits}
                    onCheckedChange={setAutoCredits}
                    id="auto-credits"
                  />
                  <label 
                    htmlFor="auto-credits" 
                    className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1"
                  >
                    Auto-purchase de créditos extras
                    <HelpCircle className="w-3 h-3" />
                  </label>
                </div>
              )}
            </div>

            {usagePercentage > 80 && plan?.id !== 'enterprise' && (
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Você está usando {Math.round(usagePercentage)}% dos seus créditos
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Considere fazer upgrade para não ficar sem créditos
                  </p>
                </div>
                <Button variant="default" size="sm" onClick={() => handleUpgrade('premium')}>
                  Ver Planos
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <section className="space-y-6">
        <div className="text-center space-y-4">
          <h3 className="text-4xl font-bold">
            Planos que{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              crescem com você
            </span>
          </h3>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Escolha o plano ideal para o seu negócio
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((planItem, idx) => {
            const isCurrentPlan = plan?.id === planItem.id;
            const currentPlanTier = plans.find(p => p.id === plan?.id)?.tier || 1;
            const isDowngrade = planItem.tier < currentPlanTier;
            const isUpgrade = planItem.tier > currentPlanTier;
            
            let buttonText = planItem.cta;
            if (isCurrentPlan) {
              buttonText = 'Plano Atual';
            } else if (isDowngrade) {
              buttonText = `Fazer downgrade para ${planItem.name}`;
            } else if (isUpgrade) {
              buttonText = `Fazer upgrade para ${planItem.name}`;
            }
            
            return (
              <div
                key={planItem.id}
                className={`relative bg-card/50 backdrop-blur-sm rounded-3xl p-8 border transition-all duration-500 hover:shadow-[0_20px_60px_hsl(var(--primary)/0.15)] hover:-translate-y-1 ${
                  planItem.highlight
                    ? "border-primary/50 shadow-[0_20px_60px_hsl(var(--primary)/0.2)]"
                    : "border-border/50 hover:border-primary/30"
                } ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
              >
                {planItem.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-primary to-secondary border-0 px-4 py-1.5 shadow-lg">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {planItem.badge}
                    </Badge>
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{planItem.name}</h3>
                    <p className="text-sm text-muted-foreground">{planItem.description}</p>
                  </div>

                  <div>
                    {planItem.price === "Consultar" ? (
                      <p className="text-4xl font-bold">Sob consulta</p>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl text-muted-foreground">R$</span>
                        <span className="text-5xl font-bold">{planItem.price}</span>
                        <span className="text-muted-foreground">/mês</span>
                      </div>
                    )}
                  </div>

                  <Button
                    variant={planItem.highlight ? "hero" : "outline"}
                    size="lg"
                    className="w-full"
                    disabled={isCurrentPlan || isProcessing}
                    onClick={() => handleUpgrade(planItem.id)}
                  >
                    {buttonText}
                  </Button>

                  <div className="space-y-3 pt-4 border-t border-border/50">
                    {planItem.features.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground/90">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </section>
    </div>
  );
}
