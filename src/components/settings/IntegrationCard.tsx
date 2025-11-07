import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { BrandLogo, type BrandKey } from '@/components/brand/BrandLogo';

type Props = {
  title: string;
  description?: string;
  status?: 'nao-configurado' | 'ativo' | 'inativo' | 'erro';
  href?: string;
  icon?: React.ReactNode;
  brand?: BrandKey;
  logoUrl?: string;
  className?: string;
};

const statusMap: Record<NonNullable<Props['status']>, { label: string; variant: 'outline' | 'default' | 'secondary' | 'destructive' }> = {
  'nao-configurado': { label: 'Não configurado', variant: 'outline' },
  'ativo': { label: 'Ativo', variant: 'default' },
  'inativo': { label: 'Inativo', variant: 'secondary' },
  'erro': { label: 'Erro', variant: 'destructive' },
};

export default function IntegrationCard({ 
  title, 
  description, 
  status = 'nao-configurado', 
  href = '#', 
  icon,
  brand,
  logoUrl,
  className 
}: Props) {
  const s = statusMap[status];
  
  return (
    <div className={cn(
      'group relative flex items-start gap-4 rounded-xl border bg-card/50 p-4 transition-all duration-300',
      'hover:bg-card hover:shadow-lg hover:scale-[1.01] hover:border-primary/30',
      'animate-fade-in',
      className
    )}>
      {/* Logo à esquerda */}
      <div className="shrink-0">
        {brand ? (
          <div className="transition-transform duration-300 group-hover:scale-110">
            <BrandLogo brand={brand} />
          </div>
        ) : (
          <div className="h-12 w-12 rounded-xl bg-white ring-1 ring-border/40 flex items-center justify-center p-2.5 transition-all duration-300 group-hover:ring-2 group-hover:ring-primary/30 group-hover:shadow-md">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${title} logo`}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            ) : (
              icon ?? <span className="text-base">⚙️</span>
            )}
          </div>
        )}
      </div>
      
      {/* Área principal: Conteúdo + Botão */}
      <div className="flex-1 flex items-start justify-between gap-4 min-w-0">
        {/* Conteúdo empilhado (título, status, legenda) */}
        <div className="flex-1 space-y-2 min-w-0">
          {/* Título */}
          <h3 className="text-sm font-semibold transition-colors duration-300 group-hover:text-primary">
            {title}
          </h3>
          
          {/* Status */}
          <div>
            <Badge variant={s.variant} className="text-xs shadow-sm">
              {s.label}
            </Badge>
          </div>
          
          {/* Legenda/Descrição */}
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>
        
        {/* Botão à direita */}
        <div className="shrink-0">
          <Button 
            asChild 
            variant="outline" 
            size="sm" 
            className="gap-2 transition-all duration-300 group-hover:border-primary/50 group-hover:bg-primary/5" 
            aria-label={`Configurar ${title}`}
          >
            <Link to={href} className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden md:inline">Configurar</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
