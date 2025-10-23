import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/neon-button';
import { Settings } from 'lucide-react';

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
      'flex items-start gap-3 rounded-xl border bg-card/50 p-4 hover:bg-card transition-colors',
      className
    )}>
      <div className="h-12 w-12 rounded-lg bg-white dark:bg-muted flex items-center justify-center p-2 border shrink-0">
        {icon ?? <span className="text-sm">⚙️</span>}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-medium truncate">{title}</h3>
          <Badge variant={s.variant} className="text-xs shrink-0">
            {s.label}
          </Badge>
        </div>
        {description && <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>}
      </div>
      
      <Link to={href} className="shrink-0">
        <Button variant="ghost" size="sm" className="shrink-0">
          <Settings className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
