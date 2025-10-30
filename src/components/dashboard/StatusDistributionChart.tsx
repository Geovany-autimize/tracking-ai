import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import type { DashboardStatusSlice } from '@/lib/dashboard-metrics';
import { Pie, PieChart, Cell, Legend, type TooltipProps } from 'recharts';

interface StatusDistributionChartProps {
  data: DashboardStatusSlice[];
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6, var(--primary)))',
];

type PieTooltipPayload = {
  percentage?: number;
  fill?: string;
};

function StatusTooltipContent({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0];
  const percentage = (item.payload as PieTooltipPayload)?.percentage ?? 0;
  const color =
    item.color ||
    (typeof item.payload === 'object' && item.payload !== null
      ? (item.payload as PieTooltipPayload).fill
      : undefined) ||
    'hsl(var(--primary))';

  return (
    <div className="min-w-[9rem] rounded-lg border border-border/60 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-foreground">Status</p>
      {payload.map((entry) => {
        const entryColor =
          entry.color ||
          (typeof entry.payload === 'object' && entry.payload !== null
            ? (entry.payload as PieTooltipPayload).fill
            : undefined) ||
          color;
        const value =
          typeof entry.value === 'number' ? `${entry.value} rastreios` : String(entry.value ?? '');
        const pct =
          typeof (entry.payload as PieTooltipPayload)?.percentage === 'number'
            ? `${(((entry.payload as PieTooltipPayload)?.percentage ?? 0) * 100).toFixed(1)}%`
            : `${(percentage * 100).toFixed(1)}%`;

        return (
          <div key={entry.name} className="mt-2 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entryColor as string }} />
              <span>{entry.name}</span>
            </span>
            <div className="flex flex-col items-end">
              <span className="font-medium">{value}</span>
              <span className="text-[10px] text-muted-foreground">{pct}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardStatusDistributionChart({ data }: StatusDistributionChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-full min-h-[240px] w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/30 p-6 text-center text-sm text-muted-foreground">
        Nenhum dado disponível para o período selecionado.
      </div>
    );
  }

  const chartData = data.map((slice, index) => ({
    name: slice.status,
    value: slice.count,
    percentage: slice.percentage,
    fill: COLORS[index % COLORS.length],
  }));

  const chartConfig = Object.fromEntries(
    data.map((slice, index) => [
      slice.status,
      {
        label: slice.status,
        color: COLORS[index % COLORS.length],
      },
    ]),
  );

  return (
    <ChartContainer className="h-[320px] w-full overflow-visible" config={chartConfig}>
      <PieChart margin={{ top: 8, right: 16, bottom: 48, left: 16 }}>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={4}
          strokeWidth={2}
          isAnimationActive={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Legend
          layout="horizontal"
          verticalAlign="bottom"
          align="center"
          iconType="circle"
          formatter={(value: string, entry) => (
            <span className="text-xs text-muted-foreground">{value}</span>
          )}
        />
        <ChartTooltip cursor={false} content={<StatusTooltipContent />} />
      </PieChart>
    </ChartContainer>
  );
}
