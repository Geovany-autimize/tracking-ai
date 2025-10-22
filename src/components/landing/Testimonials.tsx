import { Quote, TrendingDown, TrendingUp } from "lucide-react";

const testimonials = [
  {
    metric: "-42%",
    label: "tickets de 'onde está meu pedido'",
    description: "Reduzimos drasticamente as consultas repetitivas em apenas 30 dias de uso.",
    company: "Loja Exemplo",
    author: "Maria Silva, Head de CS",
    icon: TrendingDown,
    gradient: "from-primary/20 to-primary/5",
  },
  {
    metric: "+18%",
    label: "taxa de recompra",
    description: "Com um pós-compra proativo, nossos clientes voltam mais e recomendam mais.",
    company: "Fashion Store",
    author: "João Santos, CEO",
    icon: TrendingUp,
    gradient: "from-secondary/20 to-secondary/5",
  },
  {
    metric: "4.8h",
    label: "economizados por dia",
    description: "Nossa equipe de suporte agora foca em resolver problemas reais, não em dar status.",
    company: "Tech Shop",
    author: "Ana Costa, Ops Manager",
    icon: TrendingDown,
    gradient: "from-primary/20 to-primary/5",
  },
];

export const Testimonials = () => {
  return (
    <section className="py-24 px-4 bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-4 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-bold">
            Resultados{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              reais
            </span>{" "}
            de quem usa
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Empresas que transformaram o pós-compra com TrackingAI
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, idx) => (
            <div
              key={idx}
              className="group relative bg-card/50 backdrop-blur-sm rounded-3xl p-8 border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-[0_20px_60px_hsl(var(--primary)/0.15)] animate-fade-in-up"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${testimonial.gradient} rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative z-10 space-y-6">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <Quote className="w-6 h-6 text-primary" />
                </div>

                {/* Metric */}
                <div>
                  <div className="flex items-baseline gap-2">
                    <testimonial.icon className="w-8 h-8 text-primary" />
                    <span className="text-5xl font-bold text-primary">{testimonial.metric}</span>
                  </div>
                  <p className="text-xl font-semibold mt-2">{testimonial.label}</p>
                </div>

                {/* Description */}
                <p className="text-muted-foreground leading-relaxed">
                  "{testimonial.description}"
                </p>

                {/* Author */}
                <div className="pt-4 border-t border-border/50">
                  <p className="font-semibold text-sm">{testimonial.author}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
