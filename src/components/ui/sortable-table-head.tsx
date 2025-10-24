import { TableHead } from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SortDirection } from '@/hooks/use-table-sorting';

interface SortableTableHeadProps {
  column: string;
  label: string;
  currentColumn: string | null;
  currentDirection: SortDirection;
  onSort: (column: string) => void;
  className?: string;
}

export function SortableTableHead({
  column,
  label,
  currentColumn,
  currentDirection,
  onSort,
  className,
}: SortableTableHeadProps) {
  const isActive = currentColumn === column;

  const Icon = isActive && currentDirection === 'asc' 
    ? ArrowUp 
    : isActive && currentDirection === 'desc' 
    ? ArrowDown 
    : ArrowUpDown;

  return (
    <TableHead className={className}>
      <button
        onClick={() => onSort(column)}
        className="flex items-center gap-2 hover:text-foreground transition-colors"
      >
        <span>{label}</span>
        <Icon 
          className={cn(
            "h-4 w-4 transition-colors",
            isActive ? "text-foreground" : "text-muted-foreground"
          )} 
        />
      </button>
    </TableHead>
  );
}
