import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, Zap, Crown, Building2, Sparkles, TrendingUp, HelpCircle, RefreshCw, AlertCircle, X, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BuyCreditsDialog } from '@/components/dialogs/BuyCreditsDialog';
import { AutoRechargeCard } from '@/components/dialogs/AutoRechargeCard';
import { Separator } from '@/components/ui/separator';
import { useCredits } from '@/hooks/use-credits';
import { Skeleton } from '@/components/ui/skeleton';

export default function BillingPage() {
  const { customer, plan, subscription, syncSubscriptionAndCredits } = useAuth();
  const { 
    totalCredits,
    totalPurchasedCredits,
    totalUsed, 
    monthlyCredits, 
    monthlyUsed, 
    monthlyRemaining,
    extraCredits,
    loading: creditsLoading,
    refresh: refreshCredits 
  } = useCredits();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const [buyCreditsOpen, setBuyCreditsOpen] = useState(false);

  // Verifica status da assinatura ao carregar a página
  useEffect(() => {
    const syncOnLoad = async () => {
      await syncSubscriptionAndCredits();
      await refreshCredits();
    };
    syncOnLoad();
  }, []);

  const remainingCredits = totalCredits || 0;
  const usagePercentage = monthlyCredits > 0 
    ? (monthlyUsed / monthlyCredits) * 100 
    : 0;

  const getNextRenewalDate = () => {
    // Use real subscription end date from database (synced with Stripe)
    if (subscription?.current_period_end) {
      return new Date(subscription.current_period_end).toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
    }
    // Fallback to estimated date if subscription data not available
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
      } else if (planId === 'premium') {
        const token = localStorage.getItem('session_token');
        if (!token) {
          toast.error('Você precisa estar logado para fazer upgrade');
          return;
        }

        const { data, error } = await supabase.functions.invoke('create-checkout', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: { priceId: 'price_1SMEgFFsSB8n8Az0aSBb70E7' },
        });

        if (error) {
          console.error('Error creating checkout:', error);
          toast.error('Erro ao criar sessão de pagamento', {
            description: error.message
          });
          return;
        }

        if (data?.url) {
          window.open(data.url, '_blank');
          toast.success('Redirecionando para pagamento...', {
            description: 'Você será redirecionado para completar o pagamento'
          });
        }
      }
    } catch (error) {
      console.error('Error in handleUpgrade:', error);
      toast.error('Erro ao processar upgrade');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('session_token');
      if (!token) {
        toast.error('Você precisa estar logado');
        return;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) {
        console.error('Error creating portal session:', error);
        toast.error('Erro ao abrir portal de gerenciamento', {
          description: error.message
        });
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
        toast.info('Portal do Stripe', {
          description: 'Gerencie ou cancele sua assinatura no portal'
        });
      }
    } catch (error) {
      console.error('Error in handleManageSubscription:', error);
      toast.error('Erro ao processar solicitação');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelPlan = async () => {
    toast.info('Cancelamento de assinatura', {
      description: 'Você será redirecionado para o portal do Stripe onde poderá cancelar. Seu acesso continuará até o fim do período pago.',
      duration: 5000,
    });
    await handleManageSubscription();
  };

  const handleRefreshSubscription = async () => {
    setIsCheckingSubscription(true);
    const loadingToast = toast.loading('Atualizando assinatura...');
    
    try {
      // Use centralized sync function
      await syncSubscriptionAndCredits();

      // Refresh credits
      await refreshCredits();

      toast.success('Assinatura atualizada com sucesso!');
    } catch (error) {
      console.error('Error in handleRefreshSubscription:', error);
      toast.error('Erro ao atualizar assinatura');
    } finally {
      toast.dismiss(loadingToast);
      setIsCheckingSubscription(false);
    }
  };

 
   return (
    <div className="space-y-12 max-w-7xl mx-auto">

      {/* Cancelamento pendente */}
      {subscription?.cancel_at_period_end && plan?.id !== 'free' && (
        <Alert variant="destructive" className="flex items-center gap-4">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <div className="flex-1 min-w-0">
            <AlertTitle className="mb-1">Assinatura cancelada</AlertTitle>
            <AlertDescription>
              Seu plano Premium será cancelado em{' '}
              {new Date(subscription.current_period_end).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
              . Após essa data, você será movido para o plano Free.
            </AlertDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleManageSubscription}
            disabled={isProcessing}
            className="shrink-0 bg-background hover:bg-background/80"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reativar
          </Button>
        </Alert>
      )}

      {/* Current Plan Summary */}
      <Card className="border-border/50">
        <CardContent className="p-6 space-y-6">
          {/* My Plan Section */}
          <div className="flex items-center justify-between pb-6 border-b">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">Meu Plano</h3>
              <Badge 
                className={`text-sm transition-all duration-200 ${
                  plan?.id === 'free' 
                    ? 'bg-muted text-muted-foreground hover:bg-muted/80' 
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105'
                }`}
              >
                {plan?.name || 'Free'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {monthlyCredits === 0 ? 'Créditos ilimitados' : `${monthlyCredits} créditos/mês`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {plan?.id !== 'free' && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCancelPlan}
                    disabled={isProcessing || subscription?.cancel_at_period_end}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar Plano
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleManageSubscription}
                    disabled={isProcessing}
                  >
                    Gerenciar assinatura
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshSubscription}
                    disabled={isCheckingSubscription}
                    title="Atualizar assinatura e créditos"
                  >
                    <RefreshCw className={`w-4 h-4 ${isCheckingSubscription ? 'animate-spin' : ''}`} />
                  </Button>
                </>
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

          {/* Credits Section - Hero Style */}
          <div className="space-y-6">
            {/* Hero Credit Display */}
            {creditsLoading ? (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-8">
                <div className="space-y-4">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-20 w-32" />
                  <Skeleton className="h-2 w-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-8">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-primary" />
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Créditos Disponíveis
                    </h4>
                  </div>
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-6xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
                      {remainingCredits.toLocaleString('pt-BR')}
                    </span>
                    {extraCredits > 0 && (
                      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                        +{extraCredits} extras
                      </Badge>
                    )}
                  </div>
                  
                  <Progress value={usagePercentage} className="h-2 mb-3" />
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {monthlyUsed.toLocaleString('pt-BR')} de {(monthlyCredits + extraCredits).toLocaleString('pt-BR')} usados
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {Math.round(usagePercentage)}%
                    </p>
                  </div>
                </div>
                
                {/* Background decoration */}
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
              </div>
            )}

            {/* Collapsible Details */}
            <Collapsible className="space-y-2">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                <span className="text-sm font-medium text-muted-foreground">
                  Ver detalhamento
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-3 px-3 pb-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Créditos mensais do plano:</span>
                    <span className="font-semibold">{monthlyCredits.toLocaleString('pt-BR')}</span>
                  </div>
                  
                  {extraCredits > 0 && (
                    <div className="flex justify-between">
                      <span className="text-green-600 dark:text-green-400">Créditos extras comprados:</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        +{extraCredits.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                  
                  <Separator className="my-2" />
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total adquirido:</span>
                    <span className="font-semibold">{totalPurchasedCredits.toLocaleString('pt-BR')}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Créditos utilizados:</span>
                    <span className="font-semibold text-destructive">-{(totalUsed || 0).toLocaleString('pt-BR')}</span>
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <div className="flex justify-between text-base">
                    <span className="font-semibold">Restantes:</span>
                    <span className="font-bold text-primary">{remainingCredits.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Action Button */}
            <Button 
              variant="outline" 
              onClick={() => setBuyCreditsOpen(true)}
              className="w-full"
              size="lg"
            >
              <Zap className="w-4 h-4 mr-2" />
              Comprar Créditos Extras
            </Button>

            {/* Additional Info */}
            {!subscription?.cancel_at_period_end && subscription?.current_period_end && (
              <p className="text-xs text-muted-foreground pt-2">
                Renovação em {new Date(subscription.current_period_end).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            )}

            {/* Usage Warning */}
            {usagePercentage > 80 && plan?.id !== 'enterprise' && (
              <Alert className="border-amber-500/20 bg-amber-500/10">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="text-amber-700 dark:text-amber-400">
                  Atenção: {Math.round(usagePercentage)}% dos créditos usados
                </AlertTitle>
                <AlertDescription className="text-amber-600/90 dark:text-amber-400/90">
                  Considere fazer upgrade para não ficar sem créditos.
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 ml-1 text-amber-700 dark:text-amber-300"
                    onClick={() => handleUpgrade('premium')}
                  >
                    Ver planos
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recarga Automática */}
      <AutoRechargeCard />

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
          {plans.map((planItem) => {
            const isCurrentPlan = plan?.id === planItem.id;
            const isFreeWithPendingCancellation = planItem.id === 'free' && subscription?.cancel_at_period_end;
            
            let buttonText = planItem.cta;
            let buttonDisabled = isProcessing;
            
            if (isCurrentPlan) {
              buttonText = 'Plano Atual';
              buttonDisabled = true;
            } else if (isFreeWithPendingCancellation && subscription?.current_period_end) {
              const cancelDate = format(new Date(subscription.current_period_end), "dd/MM/yyyy", { locale: ptBR });
              buttonText = `Ativo em ${cancelDate}`;
              buttonDisabled = true;
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
                    disabled={buttonDisabled}
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

      <BuyCreditsDialog 
        open={buyCreditsOpen} 
        onOpenChange={setBuyCreditsOpen} 
      />
    </div>
  );
}
