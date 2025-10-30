import { Activity, RefreshCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { DashboardAutomationSummary } from '@/lib/dashboard-metrics';
import { formatPercent } from '@/lib/dashboard-metrics';

interface AutomationCardProps {
  automation: DashboardAutomationSummary;
}

export function DashboardAutomationCard({ automation }: AutomationCardProps) {
  const autoTrackingRate = automation.autoTrackingRate !== null ? automation.autoTrackingRate : 0;
  const lastUpdateLabel = automation.lastTrackingUpdate
    ? formatDistanceToNow(automation.lastTrackingUpdate, { addSuffix: true, locale: ptBR })
    : 'sem registros';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Saúde da automação</CardTitle>
        <CardDescription>Veja como os fluxos automáticos estão sustentando a operação</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Auto-tracking habilitado</span>
            <span>{formatPercent(automation.autoTrackingRate)}</span>
          </div>
          <Progress value={autoTrackingRate * 100} className="mt-2 h-2 rounded-full" />
          <p className="mt-2 text-xs text-muted-foreground">
            {automation.shipmentsWithAutoTracking} de {automation.totalShipments} rastreios estão sendo atualizados
            automaticamente.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/40 p-3">
          <Activity className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">Última atualização recebida</p>
            <p className="text-xs text-muted-foreground">{lastUpdateLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/40 p-3">
          <RefreshCcw className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">Fluxos em tempo real</p>
            <p className="text-xs text-muted-foreground">
              Mantenha a taxa acima de 80% para reduzir follow-up manual e manter clientes informados.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

