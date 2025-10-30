import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { DashboardTrendPoint } from '@/lib/dashboard-metrics';
import { format } from 'date-fns';
import { Area, AreaChart, CartesianGrid, Legend, XAxis, YAxis } from 'recharts';

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
  exceptions: {
    label: 'Exceções',
    color: 'hsl(var(--chart-5))',
  },
} as const;

function formatLabel(dateString: string) {
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? dateString : format(date, 'dd/MM');
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
    <ChartContainer className="aspect-auto h-[280px]" config={chartConfig}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="createdFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="deliveredFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="exceptionFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-5))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--chart-5))" stopOpacity={0} />
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
        <ChartTooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="created"
          stroke="hsl(var(--chart-1))"
          fill="url(#createdFill)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="delivered"
          stroke="hsl(var(--chart-2))"
          fill="url(#deliveredFill)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="exceptions"
          stroke="hsl(var(--chart-5))"
          fill="url(#exceptionFill)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
