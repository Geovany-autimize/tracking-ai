import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useStripeCheckout } from "@/hooks/use-stripe-checkout";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "0",
    description: "Para começar a testar",
    features: [
      "5 créditos de rastreio/mês",
      "1 usuário",
      "WhatsApp e e-mail básicos",
      "Painel unificado",
      "Sem SLA",
    ],
    badge: null,
    highlight: false,
  },
  {
    id: "premium",
    name: "Premium",
    price: "249",
    description: "Para operações em crescimento",
    features: [
      "1.500 créditos/mês",
      "3 usuários",
      "Regras e jornadas personalizadas",
      "Métricas e relatórios",
      "Webhooks & API",
      "Suporte prioritário",
    ],
    badge: "Mais popular",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Consultar",
    description: "Para grandes operações",
    features: [
      "Volume ilimitado",
      "Usuários ilimitados",
      "SSO e SAML",
      "Infraestrutura dedicada",
      "SLA premium 99.9%",
      "Account manager",
      "Desenvolvimento customizado",
    ],
    badge: null,
    highlight: false,
    isExternal: true,
    ctaLink: "https://wa.me/5511999999999?text=Quero%20conhecer%20o%20plano%20Enterprise",
  },
];

export default function PlansPage() {
  const { plan } = useAuth();
  const { toast } = useToast();
  const { createCheckoutSession, isLoading } = useStripeCheckout();

  const handlePlanAction = async (planId: string) => {
    if (planId === plan?.id) return;
    
    if (planId === "premium") {
      // Premium plan - open Stripe checkout
      await createCheckoutSession("price_1SMEgFFsSB8n8Az0aSBb70E7");
    } else {
      toast({
        title: "Em breve",
        description: "A alteração de plano estará disponível em breve.",
      });
    }
  };

  const getCurrentPlanId = () => {
    return plan?.id || "free";
  };

  return (
    <div className="py-8 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-12 space-y-4 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-bold">
            Planos que{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              crescem com você
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Escolha o plano ideal para o seu negócio. Upgrade ou downgrade a qualquer momento.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {plans.map((planItem, idx) => {
            const isCurrentPlan = getCurrentPlanId() === planItem.id;
            
            return (
              <div
                key={idx}
                className={`relative bg-card/50 backdrop-blur-sm rounded-3xl p-8 border transition-all duration-500 hover:shadow-[0_20px_60px_hsl(var(--primary)/0.15)] hover:-translate-y-1 animate-fade-in-up ${
                  planItem.highlight
                    ? "border-primary/50 shadow-[0_20px_60px_hsl(var(--primary)/0.2)]"
                    : "border-border/50 hover:border-primary/30"
                }`}
                style={{ animationDelay: `${idx * 0.1}s` }}
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

                  {isCurrentPlan ? (
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      disabled
                    >
                      Plano Atual
                    </Button>
                  ) : planItem.isExternal ? (
                    <Button
                      variant={planItem.highlight ? "hero" : "outline"}
                      size="lg"
                      className="w-full"
                      asChild
                    >
                      <a href={planItem.ctaLink} target="_blank" rel="noopener noreferrer">
                        Falar com vendas
                      </a>
                    </Button>
                  ) : (
                    <Button
                      variant={planItem.highlight ? "hero" : "outline"}
                      size="lg"
                      className="w-full"
                      onClick={() => handlePlanAction(planItem.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? "Carregando..." : planItem.id === "premium" ? "Fazer Upgrade" : "Selecionar Plano"}
                    </Button>
                  )}

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
        <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
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
      </div>
    </div>
  );
}
