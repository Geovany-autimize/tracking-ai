import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { DashboardRangeKey } from '@/lib/dashboard-metrics';

const RANGE_OPTIONS: Array<{ key: DashboardRangeKey; label: string }> = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '90 dias' },
];

interface RangeSelectorProps {
  value: DashboardRangeKey;
  onChange: (value: DashboardRangeKey) => void;
}

export function DashboardRangeSelector({ value, onChange }: RangeSelectorProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) {
          onChange(next as DashboardRangeKey);
        }
      }}
      className="flex w-full flex-wrap justify-start gap-2"
    >
      {RANGE_OPTIONS.map((option) => (
        <ToggleGroupItem
          key={option.key}
          value={option.key}
          className="rounded-full px-4 py-2 text-xs font-medium uppercase tracking-wide data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

