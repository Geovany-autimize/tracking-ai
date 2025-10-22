import { 
  BarChart3, 
  Bell, 
  Globe, 
  Lock, 
  Mail, 
  MessageSquare, 
  Package, 
  Settings, 
  Webhook,
  Users
} from "lucide-react";

const features = [
  {
    icon: Package,
    title: "Painel de rastreio unificado",
    description: "Centralize todas as transportadoras em um só lugar com status em tempo real.",
  },
  {
    icon: MessageSquare,
    title: "Notificações WhatsApp",
    description: "Envio automático de atualizações por WhatsApp com templates personalizáveis.",
  },
  {
    icon: Mail,
    title: "Notificações por e-mail",
    description: "E-mails transacionais elegantes e responsivos com sua marca.",
  },
  {
    icon: Settings,
    title: "Regras e jornadas",
    description: "Configure gatilhos personalizados para cada etapa da entrega.",
  },
  {
    icon: Bell,
    title: "Alertas de exceção",
    description: "Seja notificado sobre atrasos, devoluções e problemas na entrega.",
  },
  {
    icon: BarChart3,
    title: "Relatórios e métricas",
    description: "Tempo médio de entrega, taxa de sucesso e CSAT pós-compra.",
  },
  {
    icon: Users,
    title: "Permissões de equipe",
    description: "Controle de acesso granular para diferentes níveis de usuários.",
  },
  {
    icon: Globe,
    title: "Domínios customizados",
    description: "Use seu próprio domínio para páginas de rastreamento.",
  },
  {
    icon: Webhook,
    title: "Webhooks & API",
    description: "Integração avançada com seus sistemas e workflows.",
  },
  {
    icon: Lock,
    title: "Segurança e LGPD",
    description: "Seus dados e dos seus clientes totalmente protegidos e em conformidade.",
  },
];

export const Features = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/5 to-transparent" />
      
      <div className="container max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16 space-y-4 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-bold">
            Tudo que você precisa para{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              encantar no pós-compra
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Recursos completos para transformar a experiência de rastreamento
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="group bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-[0_10px_40px_hsl(var(--primary)/0.15)] hover:-translate-y-1 animate-fade-in-up"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                
                <h3 className="text-lg font-bold leading-tight">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
