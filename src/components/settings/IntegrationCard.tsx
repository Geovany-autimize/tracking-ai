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
      'flex items-start gap-3 rounded-xl border bg-card/50 p-4 hover:bg-card transition-colors',
      className
    )}>
      {brand ? (
        <BrandLogo brand={brand} />
      ) : (
        <div className="h-12 w-12 rounded-lg bg-white ring-1 ring-border/40 flex items-center justify-center p-2.5 shrink-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${title} logo`}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          ) : (
            icon ?? <span className="text-sm">⚙️</span>
          )}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-medium truncate">{title}</h3>
          <Badge variant={s.variant} className="text-xs shrink-0">
            {s.label}
          </Badge>
        </div>
        {description && <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>}
      </div>
      
      <Button asChild variant="ghost" size="icon" className="h-9 w-9 md:hidden" aria-label={`Configurar ${title}`}>
        <Link to={href}>
          <Settings className="h-4 w-4" />
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm" className="hidden md:inline-flex gap-2" aria-label={`Configurar ${title}`}>
        <Link to={href}>
          <Settings className="h-4 w-4" />
          Configurar
        </Link>
      </Button>
    </div>
  );
}
