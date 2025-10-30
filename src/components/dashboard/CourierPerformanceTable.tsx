import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { DashboardCourierPerformance } from '@/lib/dashboard-metrics';
import { formatDays, formatPercent } from '@/lib/dashboard-metrics';

interface CourierPerformanceTableProps {
  data: DashboardCourierPerformance[];
}

export function DashboardCourierPerformanceTable({ data }: CourierPerformanceTableProps) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-md border border-dashed border-muted-foreground/30 p-8 text-center text-sm text-muted-foreground">
        <p>Nenhuma transportadora com dados suficientes no período selecionado.</p>
      </div>
    );
  }

  const bestAverage = data
    .filter((entry) => entry.averageDeliveryDays !== null)
    .reduce<number | null>(
      (best, entry) =>
        entry.averageDeliveryDays !== null && (best === null || entry.averageDeliveryDays < best)
          ? entry.averageDeliveryDays
          : best,
      null,
    );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Transportadora</TableHead>
            <TableHead>Entregues</TableHead>
            <TableHead>Tempo médio</TableHead>
            <TableHead>Exceções</TableHead>
            <TableHead>Sem atualização</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.slice(0, 6).map((entry) => {
            const isBest =
              bestAverage !== null &&
              entry.averageDeliveryDays !== null &&
              entry.averageDeliveryDays === bestAverage;

            return (
              <TableRow key={entry.courier}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span>{entry.courier}</span>
                    {isBest && (
                      <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-500">
                        Destaque
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{entry.deliveredCount}</TableCell>
                <TableCell>{formatDays(entry.averageDeliveryDays)}</TableCell>
                <TableCell>
                  {entry.exceptionRate !== null ? formatPercent(entry.exceptionRate) : '—'}
                </TableCell>
                <TableCell>{entry.stuckCount}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

