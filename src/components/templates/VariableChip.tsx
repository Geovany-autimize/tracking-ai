import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Code2 } from 'lucide-react';
import { TemplateVariable } from '@/types/templates';

interface VariableChipProps {
  variable: TemplateVariable;
  onClick: (variable: string) => void;
}

export function VariableChip({ variable, onClick }: VariableChipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="secondary"
          className="cursor-pointer transition-all hover:scale-105 hover:shadow-md bg-gradient-to-r from-primary/20 to-secondary/20 border-primary/30"
          onClick={() => onClick(variable.variable)}
        >
          <Code2 className="mr-1 h-3 w-3" />
          {variable.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-1">
          <p className="font-medium">{variable.description}</p>
          <p className="text-xs text-muted-foreground">
            Exemplo: {variable.example}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
