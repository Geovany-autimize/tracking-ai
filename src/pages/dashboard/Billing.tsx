import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, Zap, Crown, Building2, Sparkles, CalendarDays, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function BillingPage() {
  const { customer, plan, usage } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <header>
        <h2 className="text-3xl font-bold">Planos e Faturamento</h2>
        <p className="text-muted-foreground mt-2">
          Gerencie sua assinatura e acompanhe seu uso
        </p>
      </header>

      {/* Current Plan Summary */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">Plano Atual: {plan?.name || 'Free'}</CardTitle>
              <CardDescription>
                Conta ativa desde {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {totalCredits === 0 ? 'Ilimitado' : `${totalCredits} créditos/mês`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Créditos Usados</span>
                <span className="font-semibold">{usedCredits} de {totalCredits}</span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {remainingCredits} créditos restantes
              </p>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-card/50 border">
              <CalendarDays className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Próxima Renovação</p>
                <p className="font-semibold">{getNextRenewalDate()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-card/50 border">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Uso Mensal</p>
                <p className="font-semibold">{Math.round(usagePercentage)}%</p>
              </div>
            </div>
          </div>

          {usagePercentage > 80 && plan?.id !== 'enterprise' && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  Você está usando {Math.round(usagePercentage)}% dos seus créditos
                </p>
                <p className="text-sm text-muted-foreground">
                  Considere fazer upgrade para não ficar sem créditos
                </p>
              </div>
              <Button variant="default" onClick={() => handleUpgrade('premium')}>
                Ver Planos
              </Button>
            </div>
          )}
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
                
                {isCurrentPlan && (
                  <div className="absolute -top-4 left-4">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                      Seu Plano Atual
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
                    {isCurrentPlan ? 'Plano Atual' : planItem.cta}
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

        {/* Trust badges and credit info */}
        <div className="space-y-6">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>Comece grátis (5 créditos/mês)</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>Sem fidelidade</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>Upgrade/downgrade a qualquer momento</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>Cancele em 1 clique</span>
            </div>
          </div>
          
          <div className="max-w-2xl mx-auto p-4 rounded-xl bg-card/30 border border-border/50">
            <p className="text-sm text-muted-foreground text-center">
              <strong className="text-foreground">Como funcionam os créditos:</strong> Cada rastreio criado consome 1 crédito. 
              No plano Free você tem 5 créditos/mês que resetam no primeiro dia de cada mês. 
              No Premium, 1.500 créditos/mês. Se exceder, será necessário fazer upgrade para continuar rastreando.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
