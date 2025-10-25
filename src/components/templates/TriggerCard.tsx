import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, Truck, CheckCircle2, AlertCircle } from 'lucide-react';
import { TriggerOption } from '@/types/templates';
import { cn } from '@/lib/utils';

interface TriggerCardProps {
  trigger: TriggerOption;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const iconMap = {
  Package,
  Truck,
  CheckCircle2,
  AlertCircle,
};

export function TriggerCard({ trigger, checked, onCheckedChange }: TriggerCardProps) {
  const Icon = iconMap[trigger.icon as keyof typeof iconMap];

  return (
    <Card
      className={cn(
        'relative cursor-pointer transition-all hover:scale-105 p-4',
        checked
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-border hover:border-primary/50'
      )}
      onClick={() => onCheckedChange(!checked)}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={checked}
          onCheckedChange={onCheckedChange}
          className="mt-1"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Icon className={cn('h-4 w-4', checked && 'text-primary')} />
            <h4 className="font-medium">{trigger.label}</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            {trigger.description}
          </p>
        </div>
      </div>
    </Card>
  );
}
