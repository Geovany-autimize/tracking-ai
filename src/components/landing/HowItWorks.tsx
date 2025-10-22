import { ArrowRight, CheckCircle2, Plug, Settings, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Plug,
    title: "Conecte sua loja/ERP",
    description: "Integração guiada com Bling, Tiny, Shopify, Nuvemshop, Tray e outros em minutos.",
    number: "01",
  },
  {
    icon: Settings,
    title: "Configure os gatilhos",
    description: "Sincronize pedidos e ative as notificações automáticas por WhatsApp e e-mail.",
    number: "02",
  },
  {
    icon: TrendingUp,
    title: "Acompanhe e relaxe",
    description: "Monitore o painel unificado enquanto a IA mantém seus clientes informados.",
    number: "03",
  },
];

export const HowItWorks = () => {
  return (
    <section className="py-24 px-4 bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-16 space-y-4 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-bold">
            Como funciona
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comece a rastrear e notificar em 3 passos simples
          </p>
        </div>

        <div className="relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/20 via-primary to-primary/20 -translate-y-1/2" />

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative animate-fade-in-up" style={{ animationDelay: `${idx * 0.15}s` }}>
                <div className="relative bg-card/80 backdrop-blur-sm rounded-3xl p-8 border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-[0_20px_60px_hsl(var(--primary)/0.15)] group h-full">
                  {/* Number badge */}
                  <div className="absolute -top-4 -left-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                    <span className="text-2xl font-bold text-primary-foreground">{step.number}</span>
                  </div>

                  <div className="space-y-4 pt-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                      <step.icon className="w-7 h-7 text-primary" />
                    </div>

                    <h3 className="text-2xl font-bold">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.description}</p>

                    {idx < steps.length - 1 && (
                      <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-20">
                        <ArrowRight className="w-8 h-8 text-primary/40 animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA após os passos */}
        <div className="mt-16 text-center animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/10 border border-primary/30 text-sm">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span className="font-medium">Setup completo em menos de 10 minutos</span>
          </div>
        </div>
      </div>
    </section>
  );
};
