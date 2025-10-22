import { MessageSquare, Sparkles, Users, Zap } from "lucide-react";

const benefits = [
  {
    icon: MessageSquare,
    title: "Menos atendimentos repetitivos",
    description: "Atualizações proativas por WhatsApp e e-mail diminuem o retrabalho do suporte.",
    gradient: "from-primary/20 to-primary/5",
  },
  {
    icon: Sparkles,
    title: "Experiência de pós-compra premium",
    description: "Timeline clara de checkpoints e estimativas realistas de entrega.",
    gradient: "from-secondary/20 to-secondary/5",
  },
  {
    icon: Users,
    title: "Time operando no que importa",
    description: "Alertas inteligentes para exceções como atrasos, devoluções e CEP inválido.",
    gradient: "from-primary/20 to-primary/5",
  },
  {
    icon: Zap,
    title: "Sem complicação técnica",
    description: "Integração guiada em minutos com seu ERP ou loja virtual.",
    gradient: "from-secondary/20 to-secondary/5",
  },
];

export const Benefits = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="container max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16 space-y-4 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-bold">
            Por que usar o{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              TrackingAI
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transforme o pós-compra em uma vantagem competitiva
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {benefits.map((benefit, idx) => (
            <div
              key={idx}
              className="group relative bg-card/50 backdrop-blur-sm rounded-3xl p-8 border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-[0_20px_60px_hsl(var(--primary)/0.15)] animate-fade-in-up"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${benefit.gradient} rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative z-10 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <benefit.icon className="w-7 h-7 text-primary" />
                </div>
                
                <h3 className="text-2xl font-bold">{benefit.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
