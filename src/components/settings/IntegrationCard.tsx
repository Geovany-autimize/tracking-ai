import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Props = {
  title: string;
  description?: string;
  status?: 'nao-configurado' | 'ativo' | 'inativo' | 'erro';
  href?: string;
  icon?: React.ReactNode;
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
  className 
}: Props) {
  const s = statusMap[status];
  
  return (
    <div className={cn(
      'flex items-center justify-between gap-4 rounded-lg border bg-card p-4',
      className
    )}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
          {icon ?? <span className="text-sm">⚙️</span>}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">{title}</h3>
            <Badge variant={s.variant} className="text-xs">
              {s.label}
            </Badge>
          </div>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link to={href}>Configurar</Link>
      </Button>
    </div>
  );
}
