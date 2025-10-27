import { useEffect, useState } from "react";
import { SITE } from "@/config/site.config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export const Navbar = () => {
  const logoPng = `${import.meta.env.BASE_URL}logo.png`;
  const logoSvg = `${import.meta.env.BASE_URL}logo.svg`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("#");

  // Observa as seções por ID e marca o link ativo
  useEffect(() => {
    const sectionIds = SITE.nav
      .map((n) => n.href.startsWith("#") ? n.href.slice(1) : "")
      .filter(Boolean);

    const els = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);

    if (!els.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio - a.intersectionRatio));

        if (visible[0]?.target?.id) {
          setActive(`#${visible[0].target.id}`);
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <nav className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-4">
        <a href="/" className="flex items-center gap-2" aria-label={SITE.name}>
          <picture>
            <source srcSet={logoSvg} type="image/svg+xml" />
            <img src={logoPng} alt={SITE.name} className="h-7 w-7" />
          </picture>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {SITE.logoText}
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          {SITE.nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary relative",
                active === item.href 
                  ? "text-foreground after:absolute after:bottom-[-1.5rem] after:left-0 after:right-0 after:h-0.5 after:bg-gradient-to-r after:from-primary after:to-secondary" 
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </a>
          ))}
          <Button asChild variant="hero" size="lg">
            <a href={SITE.appUrl}>Acessar o app</a>
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          aria-label="Abrir menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden rounded-xl border border-border px-3 py-2 text-foreground hover:bg-accent transition-colors"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t border-border bg-card/95 backdrop-blur-xl animate-fade-in">
          <div className="container max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col gap-4">
              {SITE.nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "text-base font-medium transition-colors",
                    active === item.href ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </a>
              ))}
              <Button asChild variant="hero" size="lg" className="mt-2">
                <a href={SITE.appUrl}>Acessar o app</a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
