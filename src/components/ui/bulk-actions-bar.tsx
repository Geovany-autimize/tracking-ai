import { Button } from '@/components/ui/button';
import { X, Trash2, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkActionsBarProps {
  selectedCount: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onClear: () => void;
  className?: string;
}

export function BulkActionsBar({
  selectedCount,
  onEdit,
  onDelete,
  onClear,
  className,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-4 bg-primary/10 border border-primary/20 rounded-lg mb-4",
        "animate-in slide-in-from-bottom-2 duration-200",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">
          {selectedCount} {selectedCount === 1 ? 'item selecionado' : 'itens selecionados'}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        {onEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Button>
        )}
        {onDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="gap-2"
        >
          <X className="h-4 w-4" />
          Limpar
        </Button>
      </div>
    </div>
  );
}
