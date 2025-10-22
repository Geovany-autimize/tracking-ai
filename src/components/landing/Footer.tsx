import { Mail, MapPin, ExternalLink } from "lucide-react";

const footerLinks = {
  produto: [
    { label: "Funcionalidades", href: "#features" },
    { label: "Integrações", href: "#integrations" },
    { label: "Preços", href: "#pricing" },
    { label: "Casos de uso", href: "#testimonials" },
  ],
  recursos: [
    { label: "Documentação", href: "#" },
    { label: "API", href: "#" },
    { label: "Webhooks", href: "#" },
    { label: "Status", href: "#" },
  ],
  empresa: [
    { label: "Sobre", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Carreiras", href: "#" },
    { label: "Contato", href: "#" },
  ],
  legal: [
    { label: "Termos de uso", href: "#" },
    { label: "Política de privacidade", href: "#" },
    { label: "LGPD", href: "#" },
    { label: "Segurança", href: "#" },
  ],
};

export const Footer = () => {
  return (
    <footer className="bg-gradient-to-b from-background to-muted/20 border-t border-border/50 pt-16 pb-8 px-4">
      <div className="container max-w-7xl mx-auto">
        {/* Main footer content */}
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                TrackingAI
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Rastreamento logístico inteligente com notificações automáticas para e-commerce.
              </p>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-foreground">Autimize</p>
                  <p>CNPJ: 40.204.528/0001-05</p>
                  <p>Rua Exemplo, 123 - São Paulo, SP</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <a href="mailto:contato@autimize.com.br" className="hover:text-primary transition-colors">
                  contato@autimize.com.br
                </a>
              </div>
            </div>
          </div>

          {/* Links columns */}
          <div>
            <h4 className="font-semibold mb-4">Produto</h4>
            <ul className="space-y-3">
              {footerLinks.produto.map((link, idx) => (
                <li key={idx}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Recursos</h4>
            <ul className="space-y-3">
              {footerLinks.recursos.map((link, idx) => (
                <li key={idx}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
                    {link.label}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Empresa</h4>
            <ul className="space-y-3">
              {footerLinks.empresa.map((link, idx) => (
                <li key={idx}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link, idx) => (
                <li key={idx}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Autimize. Todos os direitos reservados.</p>
          
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-primary transition-colors">
              LinkedIn
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Instagram
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              YouTube
            </a>
            <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs font-medium">
              🔒 LGPD
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
