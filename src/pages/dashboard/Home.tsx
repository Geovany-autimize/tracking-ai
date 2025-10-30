import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { DashboardAutomationCard } from '@/components/dashboard/AutomationCard';
import { DashboardAlertsPanel } from '@/components/dashboard/AlertsPanel';
import { DashboardCourierPerformanceTable } from '@/components/dashboard/CourierPerformanceTable';
import { DashboardInsightsPanel } from '@/components/dashboard/InsightsPanel';
import { DashboardKpiSection } from '@/components/dashboard/KpiSection';
import { DashboardRangeSelector } from '@/components/dashboard/RangeSelector';
import { DashboardStatusDistributionChart } from '@/components/dashboard/StatusDistributionChart';
import { DashboardTrendChart } from '@/components/dashboard/TrendChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  buildDashboardMetrics,
  getDashboardRange,
  getEarliestRequiredDate,
  type DashboardMetrics,
  type DashboardRangeKey,
  type DashboardShipmentRecord,
} from '@/lib/dashboard-metrics';

const fallbackMetrics: DashboardMetrics = {
  overview: {
    deliveredCount: 0,
    deliveredDelta: null,
    averageDeliveryDays: null,
    averageDeliveryDelta: null,
    exceptionRate: null,
    exceptionRateDelta: null,
    stuckShipments: 0,
    stuckThresholdHours: 72,
  },
  trends: [],
  statusDistribution: [],
  courierPerformance: [],
  alerts: [],
  insights: [],
  automation: {
    autoTrackingRate: null,
    lastTrackingUpdate: null,
    shipmentsWithAutoTracking: 0,
    totalShipments: 0,
  },
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-lg lg:col-span-2" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed border-muted-foreground/40">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Vamos começar a monitorar suas entregas</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Assim que você cadastrar rastreios, exibiremos aqui os indicadores-chave de performance,
            alertas inteligentes e recomendações acionáveis.
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/shipments">
            <Plus className="mr-2 h-4 w-4" />
            Criar primeiro rastreio
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DashboardHome() {
  const { customer } = useAuth();
  const [rangeKey, setRangeKey] = useState<DashboardRangeKey>('30d');
  const range = useMemo(() => getDashboardRange(rangeKey), [rangeKey]);
  const earliestDate = useMemo(() => getEarliestRequiredDate(range), [range]);

  const { data: shipmentsData, isLoading, isError } = useQuery({
    queryKey: ['dashboard_shipments', customer?.id, rangeKey, earliestDate.toISOString()],
    enabled: !!customer?.id,
    queryFn: async () => {
      if (!customer?.id) return [] as DashboardShipmentRecord[];

      const earliestIso = earliestDate.toISOString();
      const { data, error } = await supabase
        .from('shipments')
        .select('id,status,created_at,last_update,auto_tracking,tracking_events,shipment_data')
        .eq('customer_id', customer.id)
        .or(`created_at.gte.${earliestIso},last_update.gte.${earliestIso}`);

      if (error) {
        console.error('[Dashboard] Failed to load shipments', error);
        throw error;
      }

      return (data || []) as DashboardShipmentRecord[];
    },
  });

  const metrics = useMemo(() => {
    if (!shipmentsData || shipmentsData.length === 0) {
      return fallbackMetrics;
    }
    return buildDashboardMetrics(shipmentsData, range);
  }, [shipmentsData, range]);

  const hasData = shipmentsData && shipmentsData.length > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Olá, {customer?.name || 'empreendedor(a)'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe seus indicadores logísticos sem precisar mergulhar em planilhas.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Button variant="outline" asChild>
            <Link to="/dashboard/shipments">
              <Plus className="mr-2 h-4 w-4" />
              Novo rastreio
            </Link>
          </Button>
          <DashboardRangeSelector value={rangeKey} onChange={setRangeKey} />
        </div>
      </header>

      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            Não foi possível carregar os dados do dashboard. Tente novamente em instantes.
          </CardContent>
        </Card>
      ) : !hasData ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          <DashboardKpiSection metrics={metrics.overview} automation={metrics.automation} />

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Evolução de rastreios</CardTitle>
                <CardDescription>
                  Como os novos rastreios, entregas e exceções evoluíram no período selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DashboardTrendChart data={metrics.trends} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Onde estão seus pedidos</CardTitle>
                <CardDescription>Distribuição atual por status de entrega</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center">
                <DashboardStatusDistributionChart data={metrics.statusDistribution} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Performance por transportadora</CardTitle>
                <CardDescription>Compare tempos médios, exceções e gargalos de atualização</CardDescription>
              </CardHeader>
              <CardContent>
                <DashboardCourierPerformanceTable data={metrics.courierPerformance} />
              </CardContent>
            </Card>

            <DashboardAutomationCard automation={metrics.automation} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardAlertsPanel alerts={metrics.alerts} />
            <DashboardInsightsPanel insights={metrics.insights} />
          </div>
        </div>
      )}
    </div>
  );
}

