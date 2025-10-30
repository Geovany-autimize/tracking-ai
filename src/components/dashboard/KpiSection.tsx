import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDays, formatPercent } from '@/lib/dashboard-metrics';
import type { DashboardAutomationSummary, DashboardOverviewMetrics } from '@/lib/dashboard-metrics';

interface DashboardKpiSectionProps {
  metrics: DashboardOverviewMetrics;
  automation: DashboardAutomationSummary;
}

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

function formatPercentDelta(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  const formatted = value.toFixed(1);
  return value > 0 ? `+${formatted}%` : `${formatted}%`;
}

function DeltaIndicator({ value }: { value: number | null }) {
  if (value === null || Number.isNaN(value)) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        —
      </span>
    );
  }

  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={`flex items-center gap-1 text-xs font-medium ${
        positive ? 'text-emerald-500' : 'text-destructive'
      }`}
    >
      <Icon className="h-3 w-3" />
      {formatPercentDelta(value)}
    </span>
  );
}

function KpiCard({
  title,
  value,
  description,
  delta,
}: {
  title: string;
  value: string;
  description: string;
  delta?: number | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-2xl font-semibold tracking-tight">{value}</CardTitle>
          {typeof delta !== 'undefined' ? <DeltaIndicator value={delta} /> : null}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardKpiSection({ metrics, automation }: DashboardKpiSectionProps) {
  const deliveredValue = numberFormatter.format(metrics.deliveredCount);
  const avgDelivery = formatDays(metrics.averageDeliveryDays);
  const exceptionRate = formatPercent(metrics.exceptionRate);
  const stuckValue = numberFormatter.format(metrics.stuckShipments);
  const autoTrackingRate =
    automation.autoTrackingRate !== null ? formatPercent(automation.autoTrackingRate) : '—';

  const autoTrackingDescription =
    automation.totalShipments > 0
      ? `${automation.shipmentsWithAutoTracking} de ${automation.totalShipments} rastreios`
      : 'Nenhum rastreio encontrado';

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard
        title="Entregues no período"
        value={deliveredValue}
        description="Comparado ao período anterior"
        delta={metrics.deliveredDelta}
      />
      <KpiCard
        title="Tempo médio de entrega"
        value={avgDelivery}
        description="Dias entre criação e entrega"
        delta={metrics.averageDeliveryDelta}
      />
      <KpiCard
        title="Taxa de exceções"
        value={exceptionRate}
        description="Proporção de rastreios com exceção"
        delta={metrics.exceptionRateDelta}
      />
      <KpiCard
        title="Sem atualização"
        value={stuckValue}
        description={`Sem eventos há mais de ${metrics.stuckThresholdHours}h`}
      />
      <KpiCard
        title="Auto-tracking ativo"
        value={autoTrackingRate}
        description={autoTrackingDescription}
      />
    </div>
  );
}
