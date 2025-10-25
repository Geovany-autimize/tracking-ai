import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Package, Truck, CheckCircle2, AlertCircle, FileText, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { TriggerOption } from '@/types/templates';
import { MessageTemplate } from '@/types/templates';
import { cn } from '@/lib/utils';

interface TriggerAssignmentCardProps {
  trigger: TriggerOption;
  activeTemplate: MessageTemplate | null;
  availableTemplates: MessageTemplate[];
  onAssign: (templateId: string | null) => void;
  isLoading?: boolean;
}

const iconMap = {
  Package,
  Truck,
  CheckCircle2,
  AlertCircle,
  FileText,
  MapPin,
  Clock,
  AlertTriangle,
};

export function TriggerAssignmentCard({ 
  trigger, 
  activeTemplate, 
  availableTemplates,
  onAssign,
  isLoading = false 
}: TriggerAssignmentCardProps) {
  const Icon = iconMap[trigger.icon as keyof typeof iconMap];
  const hasTemplate = !!activeTemplate;

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md',
        hasTemplate ? 'border-primary/50 bg-primary/5' : 'border-border'
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            hasTemplate ? 'bg-primary/10' : 'bg-muted'
          )}>
            <Icon className={cn('h-5 w-5', hasTemplate && 'text-primary')} />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <TooltipProvider delayDuration={2000}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h4 className="font-medium text-sm cursor-help">{trigger.label}</h4>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{trigger.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {hasTemplate && (
                <Badge variant="default" className="h-5 px-1.5 text-xs">
                  Ativo
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Select 
          value={activeTemplate?.id || 'none'} 
          onValueChange={(value) => onAssign(value === 'none' ? null : value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-full h-9 text-sm">
            <SelectValue placeholder="Selecione um template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">Nenhum template</span>
            </SelectItem>
            {availableTemplates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
