import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle } from "lucide-react";

export const CTAFinal = () => {
  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px]" />
      
      <div className="container max-w-5xl mx-auto relative z-10">
        <div className="bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-xl rounded-[3rem] p-12 md:p-16 border border-border/50 shadow-[0_20px_80px_hsl(240_8%_0%/0.4)] text-center space-y-8 animate-fade-in-up">
          {/* Headline */}
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Pronto para{" "}
              <span className="bg-gradient-to-r from-primary via-primary-glow to-secondary bg-clip-text text-transparent">
                reduzir tickets
              </span>{" "}
              e encantar no pós-compra?
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Junte-se a centenas de lojas que já transformaram o pós-compra em vantagem competitiva
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button variant="hero" size="xl" onClick={scrollToPricing}>
              Começar avaliação gratuita
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="xl"
              onClick={() => window.open('https://wa.me/5511999999999?text=Quero%20conhecer%20o%20TrackingAI', '_blank')}
            >
              <MessageCircle className="w-5 h-5" />
              Falar com um especialista
            </Button>
          </div>

          {/* Trust elements */}
          <div className="pt-8 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground border-t border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Sem cartão na avaliação</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <span>Setup em minutos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Suporte em português</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <span>Cancele quando quiser</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
