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
      'group relative flex flex-col items-center rounded-xl border bg-card/50 p-6 transition-all duration-300',
      'hover:bg-card hover:shadow-lg hover:scale-[1.02] hover:border-primary/30',
      'animate-fade-in',
      className
    )}>
      {/* Logo - centralizada no topo */}
      <div className="mb-4">
        {brand ? (
          <div className="scale-125 transition-transform duration-300 group-hover:scale-[1.35]">
            <BrandLogo brand={brand} />
          </div>
        ) : (
          <div className="h-16 w-16 rounded-xl bg-white ring-1 ring-border/40 flex items-center justify-center p-3 shrink-0 transition-all duration-300 group-hover:ring-2 group-hover:ring-primary/30 group-hover:shadow-md">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${title} logo`}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            ) : (
              icon ?? <span className="text-lg">⚙️</span>
            )}
          </div>
        )}
      </div>
      
      {/* Conteúdo - centralizado */}
      <div className="flex-1 text-center mb-4 w-full space-y-2">
        {/* Título */}
        <h3 className="text-sm font-semibold transition-colors duration-300 group-hover:text-primary">
          {title}
        </h3>
        
        {/* Badge de status */}
        <div className="flex justify-center">
          <Badge variant={s.variant} className="text-xs shadow-sm">
            {s.label}
          </Badge>
        </div>
        
        {/* Descrição */}
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2 px-2 pt-1">
            {description}
          </p>
        )}
      </div>
      
      {/* Botão de ação - full width no rodapé */}
      <Button 
        asChild 
        variant="outline" 
        size="sm" 
        className="w-full gap-2 transition-all duration-300 group-hover:border-primary/50 group-hover:bg-primary/5" 
        aria-label={`Configurar ${title}`}
      >
        <Link to={href} className="flex items-center justify-center gap-2">
          <Settings className="h-4 w-4" />
          <span>Configurar</span>
        </Link>
      </Button>
    </div>
  );
}
