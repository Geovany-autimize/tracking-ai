import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { DashboardStatusSlice } from '@/lib/dashboard-metrics';
import { Pie, PieChart, Cell, Legend } from 'recharts';

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
  payload: {
    percentage?: number;
  };
};

export function DashboardStatusDistributionChart({ data }: StatusDistributionChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-full min-h-[220px] w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/30 p-6 text-center text-sm text-muted-foreground">
        Nenhum dado disponível para o período selecionado.
      </div>
    );
  }

  const chartData = data.map((slice) => ({
    name: slice.status,
    value: slice.count,
    percentage: slice.percentage,
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
    <ChartContainer className="aspect-square h-[260px]" config={chartConfig}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={4}
          strokeWidth={2}
        >
          {chartData.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Legend layout="vertical" align="right" verticalAlign="middle" />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name, entry: PieTooltipPayload) => {
                const percentage = entry.payload?.percentage ?? 0;
                const formattedValue =
                  typeof value === 'number' ? `${value} rastreios` : String(value);
                return [formattedValue, `${name} • ${(percentage * 100).toFixed(1)}%`];
              }}
            />
          }
        />
      </PieChart>
    </ChartContainer>
  );
}
