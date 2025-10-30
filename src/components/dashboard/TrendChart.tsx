import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import type { DashboardTrendPoint } from '@/lib/dashboard-metrics';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Area, AreaChart, CartesianGrid, Legend, XAxis, YAxis, type TooltipProps } from 'recharts';

interface TrendChartProps {
  data: DashboardTrendPoint[];
}

const chartConfig = {
  created: {
    label: 'Criados',
    color: 'hsl(var(--chart-1))',
  },
  delivered: {
    label: 'Entregues',
    color: 'hsl(var(--chart-2))',
  },
} as const;

function formatLabel(dateString: string) {
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? dateString : format(date, 'dd/MM', { locale: ptBR });
}

const tooltipLabelFormatter = (label: string | number) => {
  const date = new Date(label);
  if (Number.isNaN(date.getTime())) {
    return label;
  }
  return format(date, "dd 'de' MMMM", { locale: ptBR });
};

function TrendTooltipContent({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const formattedLabel = tooltipLabelFormatter(label ?? '');

  return (
    <div className="min-w-[10rem] rounded-lg border border-border/60 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-foreground">{formattedLabel}</p>
      <div className="mt-2 space-y-1">
        {payload.map((item) => {
          const color =
            item.color ||
            (typeof item.payload === 'object' && item.payload !== null
              ? (item.payload as Record<string, unknown>).stroke
              : undefined) ||
            'hsl(var(--primary))';
          const value =
            typeof item.value === 'number' ? `${item.value} rastreios` : String(item.value ?? '');
          return (
            <div key={item.dataKey} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color as string }} />
                <span>{item.name}</span>
              </span>
              <span className="font-medium">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DashboardTrendChart({ data }: TrendChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-full min-h-[220px] w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/30 p-6 text-center text-sm text-muted-foreground">
        Cadastre rastreios para visualizar a evolução diária.
      </div>
    );
  }

  return (
    <ChartContainer className="aspect-auto h-[300px] overflow-visible" config={chartConfig}>
      <AreaChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 12 }}>
        <defs>
          <linearGradient id="createdFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="deliveredFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tickFormatter={formatLabel}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          interval="equidistantPreserveStart"
          minTickGap={24}
        />
        <YAxis
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Legend verticalAlign="top" height={32} />
        <ChartTooltip cursor={{ strokeDasharray: '3 3' }} content={<TrendTooltipContent />} />
        <Area
          type="monotone"
          dataKey="created"
          name="Criados"
          stroke="hsl(var(--chart-1))"
          fill="url(#createdFill)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="delivered"
          name="Entregues"
          stroke="hsl(var(--chart-2))"
          fill="url(#deliveredFill)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
