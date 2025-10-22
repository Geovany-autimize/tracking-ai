import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Package, Zap, Users } from "lucide-react";

export const Hero = () => {
  const scrollToPricing = () => {
    document.getElementById("precos")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 pt-32 pb-20 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      <div className="absolute top-20 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-20 -right-40 w-80 h-80 bg-secondary/20 rounded-full blur-[120px] animate-float" style={{ animationDelay: "3s" }} />

      <div className="container max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy & CTAs */}
          <div className="space-y-8 animate-fade-in-up">
            <Badge variant="outline" className="px-4 py-2 text-sm border-primary/30 bg-primary/5">
              <Zap className="w-4 h-4 mr-2 text-primary" />
              Rastreamento Inteligente
            </Badge>

            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
                Rastreamento que{" "}
                <span className="bg-gradient-to-r from-primary via-primary-glow to-secondary bg-clip-text text-transparent">
                  reduz tickets
                </span>{" "}
                e aumenta a satisfação
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl leading-relaxed">
                O TrackingAI centraliza o status dos pedidos e notifica seus clientes por WhatsApp e e-mail automaticamente — do postado ao entregue.
              </p>
            </div>

            {/* Value bullets */}
            <div className="flex flex-wrap gap-6 text-sm text-foreground/90">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>Menos tickets repetidos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary" />
                <span>Jornada de entrega clara</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>Alertas de exceção</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary" />
                <span>Métricas acionáveis</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button variant="hero" size="xl" onClick={scrollToPricing}>
                Experimente grátis por 7 dias
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="xl">
                <Play className="w-5 h-5" />
                Ver demo interativa
              </Button>
            </div>

            {/* Trust elements */}
            <div className="pt-8 space-y-3 text-sm text-muted-foreground">
              <p className="font-medium">✓ Sem cartão na avaliação • Cancelamento em 1 clique</p>
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-foreground/70">Integra com:</span>
                <Badge variant="secondary" className="font-normal">Shopify</Badge>
                <Badge variant="secondary" className="font-normal">Bling</Badge>
                <Badge variant="secondary" className="font-normal">Tiny</Badge>
                <Badge variant="secondary" className="font-normal">Nuvemshop</Badge>
                <Badge variant="secondary" className="font-normal">Tray</Badge>
              </div>
            </div>
          </div>

          {/* Right: Mockup visual */}
          <div className="relative lg:ml-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="relative bg-gradient-to-br from-card via-card to-card/80 rounded-3xl p-8 shadow-[0_20px_80px_hsl(240_8%_0%/0.5)] border border-border/50 backdrop-blur-xl">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Pedido #8742</p>
                      <p className="text-xs text-muted-foreground">Atualizado há 2h</p>
                    </div>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/30">Em trânsito</Badge>
                </div>

                {/* Timeline */}
                <div className="space-y-4 py-4">
                  {[
                    { label: "Entregue", date: "25/10 às 14:32", active: false, completed: false },
                    { label: "Saiu para entrega", date: "25/10 às 09:15", active: true, completed: false },
                    { label: "Em trânsito", date: "24/10 às 18:20", active: false, completed: true },
                    { label: "Postado", date: "23/10 às 11:45", active: false, completed: true },
                  ].map((step, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <div className="relative">
                        <div className={`w-3 h-3 rounded-full ${step.active ? "bg-primary animate-glow-pulse" : step.completed ? "bg-primary/50" : "bg-muted"}`} />
                        {idx < 3 && <div className={`absolute left-1/2 -translate-x-1/2 top-3 w-[2px] h-8 ${step.completed ? "bg-primary/30" : "bg-muted"}`} />}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${step.active ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                        <p className="text-xs text-muted-foreground">{step.date}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notification preview */}
                <div className="bg-muted/30 rounded-xl p-4 border border-border/30 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-secondary" />
                    </div>
                    <div className="flex-1 text-xs">
                      <p className="font-medium text-foreground/90">Notificação enviada</p>
                      <p className="text-muted-foreground mt-1">
                        "Olá! Seu pedido #8742 saiu para entrega e chegará hoje até às 18h."
                      </p>
                      <p className="text-muted-foreground mt-2">📱 WhatsApp • ✉️ E-mail</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating stats */}
            <div className="absolute -bottom-6 -left-6 bg-card/90 backdrop-blur-xl rounded-2xl p-4 shadow-elevated border border-border/50 animate-scale-in" style={{ animationDelay: "0.5s" }}>
              <p className="text-2xl font-bold text-primary">-42%</p>
              <p className="text-xs text-muted-foreground">tickets de suporte</p>
            </div>
            <div className="absolute -top-6 -right-6 bg-card/90 backdrop-blur-xl rounded-2xl p-4 shadow-elevated border border-border/50 animate-scale-in" style={{ animationDelay: "0.7s" }}>
              <p className="text-2xl font-bold text-secondary">+18%</p>
              <p className="text-xs text-muted-foreground">taxa de recompra</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
