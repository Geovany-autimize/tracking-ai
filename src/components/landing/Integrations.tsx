import { Button } from "@/components/ui/button";
import { ExternalLink, Package } from "lucide-react";

const integrations = [
  { name: "Bling", category: "ERP", logo: "B" },
  { name: "Tiny", category: "ERP", logo: "T" },
  { name: "Nuvemshop", category: "E-commerce", logo: "N" },
  { name: "Tray", category: "E-commerce", logo: "TR" },
  { name: "Shopify", category: "E-commerce", logo: "S" },
  { name: "Correios", category: "Transportadora", logo: "C" },
  { name: "Jadlog", category: "Transportadora", logo: "J" },
  { name: "Total Express", category: "Transportadora", logo: "TE" },
  { name: "Azul Cargo", category: "Transportadora", logo: "AZ" },
  { name: "Sequoia", category: "Transportadora", logo: "SQ" },
  { name: "Loggi", category: "Transportadora", logo: "L" },
  { name: "Melhor Envio", category: "Plataforma", logo: "ME" },
];

export const Integrations = () => {
  return (
    <section className="py-24 px-4 bg-gradient-to-b from-muted/20 to-background">
      <div className="container max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-4 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-bold">
            Integrações{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              que você já usa
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Conecte-se facilmente com suas plataformas favoritas
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-12">
          {integrations.map((integration, idx) => (
            <div
              key={idx}
              className="group bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-[0_10px_40px_hsl(var(--primary)/0.15)] hover:-translate-y-1 animate-fade-in-up"
              style={{ animationDelay: `${idx * 0.03}s` }}
            >
              <div className="space-y-3 text-center">
                <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 font-bold text-primary text-lg">
                  {integration.logo}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{integration.name}</h3>
                  <p className="text-xs text-muted-foreground">{integration.category}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
          <Button variant="outline" size="lg">
            <Package className="w-5 h-5" />
            Ver todas as integrações
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};
