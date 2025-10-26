import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Check, Zap, Crown, Building2, ArrowRight, TrendingUp, CalendarDays, CreditCard } from 'lucide-react';
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
      price: 'R$ 0',
      period: '/mês',
      credits: 5,
      icon: Zap,
      description: 'Para começar',
      features: [
        '5 rastreios por mês',
        'Notificações via e-mail',
        'Painel básico',
        'Suporte por e-mail',
      ],
      color: 'from-gray-500 to-gray-600',
      badge: null,
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 'R$ 249',
      period: '/mês',
      credits: 1500,
      icon: Crown,
      description: 'Para crescer',
      features: [
        '1.500 rastreios por mês',
        'Notificações WhatsApp',
        'Templates personalizados',
        'Insights avançados',
        'Integrações e-commerce',
        'Suporte prioritário',
      ],
      color: 'from-primary to-secondary',
      badge: 'Mais Popular',
      recommended: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Personalizado',
      period: '',
      credits: null,
      icon: Building2,
      description: 'Para escalar',
      features: [
        'Rastreios ilimitados',
        'WhatsApp Business API dedicada',
        'API customizada',
        'White-label disponível',
        'Gerente de conta dedicado',
        'SLA garantido',
        'Onboarding personalizado',
      ],
      color: 'from-purple-500 to-pink-500',
      badge: 'Ilimitado',
    },
  ];

  const creditPackages = [
    { credits: 100, price: 49, bonus: 0 },
    { credits: 500, price: 199, bonus: 50 },
    { credits: 1000, price: 349, bonus: 150 },
    { credits: 2500, price: 799, bonus: 500 },
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

  const handleBuyCredits = async (credits: number, price: number) => {
    setIsProcessing(true);
    try {
      toast.info('Compra de créditos em desenvolvimento', {
        description: `${credits} créditos por R$ ${price}`
      });
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
          Gerencie sua assinatura, créditos e histórico de pagamentos
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
        <div>
          <h3 className="text-2xl font-semibold">Planos Disponíveis</h3>
          <p className="text-muted-foreground mt-1">
            Escolha o plano ideal para o seu negócio
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((planItem) => {
            const Icon = planItem.icon;
            const isCurrentPlan = plan?.id === planItem.id;
            
            return (
              <Card 
                key={planItem.id}
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                  planItem.recommended ? 'border-primary/50 shadow-md' : ''
                } ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
              >
                {planItem.badge && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-gradient-to-r from-primary to-secondary text-white border-0">
                      {planItem.badge}
                    </Badge>
                  </div>
                )}
                
                {isCurrentPlan && (
                  <div className="absolute top-4 left-4">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                      Seu Plano Atual
                    </Badge>
                  </div>
                )}

                <CardHeader className="space-y-4 pt-8">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${planItem.color} flex items-center justify-center`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{planItem.name}</CardTitle>
                    <CardDescription>{planItem.description}</CardDescription>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{planItem.price}</span>
                    {planItem.period && (
                      <span className="text-muted-foreground">{planItem.period}</span>
                    )}
                  </div>
                  {planItem.credits !== null && (
                    <Badge variant="secondary" className="w-fit">
                      {planItem.credits} créditos mensais
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  <Separator />
                  <ul className="space-y-3">
                    {planItem.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full group"
                    variant={planItem.recommended ? 'default' : 'outline'}
                    disabled={isCurrentPlan || isProcessing}
                    onClick={() => handleUpgrade(planItem.id)}
                  >
                    {isCurrentPlan ? (
                      'Plano Atual'
                    ) : planItem.id === 'enterprise' ? (
                      <>
                        Falar com Vendas
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    ) : (
                      <>
                        Fazer Upgrade
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Credit Packages */}
      <section className="space-y-6">
        <div>
          <h3 className="text-2xl font-semibold">Comprar Créditos Avulsos</h3>
          <p className="text-muted-foreground mt-1">
            Precisa de mais créditos? Compre pacotes avulsos sem mudar de plano
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {creditPackages.map((pkg) => (
            <Card key={pkg.credits} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CreditCard className="h-8 w-8 text-primary" />
                  {pkg.bonus > 0 && (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                      +{pkg.bonus} bônus
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-3xl font-bold mt-4">
                  {pkg.credits + pkg.bonus}
                </CardTitle>
                <CardDescription>créditos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-2xl font-semibold">
                  R$ {pkg.price}
                </div>
                {pkg.bonus > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {pkg.credits} créditos + {pkg.bonus} de bônus
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant="outline"
                  disabled={isProcessing}
                  onClick={() => handleBuyCredits(pkg.credits + pkg.bonus, pkg.price)}
                >
                  Comprar Agora
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <Card className="bg-muted/50">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Precisa de mais créditos?</p>
                <p className="text-sm text-muted-foreground">
                  Entre em contato para pacotes personalizados
                </p>
              </div>
              <Button variant="outline" asChild>
                <a href="https://wa.me/5511999999999?text=Olá! Preciso de um pacote de créditos personalizado" target="_blank" rel="noopener noreferrer">
                  Falar com Vendas
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Payment History */}
      <section className="space-y-6">
        <div>
          <h3 className="text-2xl font-semibold">Histórico de Transações</h3>
          <p className="text-muted-foreground mt-1">
            Suas últimas transações e faturas
          </p>
        </div>

        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Nenhuma transação ainda</p>
              <p className="text-sm mt-1">
                Seu histórico de pagamentos aparecerá aqui
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
