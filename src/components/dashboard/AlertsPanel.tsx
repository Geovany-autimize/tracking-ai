import { Link } from 'react-router-dom';
import { AlertTriangle, Clock3, Timer } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardAlert } from '@/lib/dashboard-metrics';
import { formatStatus } from '@/lib/dashboard-metrics';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AlertsPanelProps {
  alerts: DashboardAlert[];
}

const ICONS: Record<DashboardAlert['type'], typeof AlertTriangle> = {
  exception: AlertTriangle,
  slow: Clock3,
  stuck: Timer,
};

const SEVERITY_VARIANT: Record<DashboardAlert['severity'], string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  low: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};

export function DashboardAlertsPanel({ alerts }: AlertsPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Alertas prioritários</CardTitle>
          <p className="text-sm text-muted-foreground">
            Aja rapidamente sobre rastreios com risco de insatisfação
          </p>
        </div>
        <Badge variant="outline" className="font-medium">
          {alerts.length} ativo(s)
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.length === 0 ? (
          <div className="rounded-md border border-dashed border-emerald-500/30 bg-emerald-500/10 p-6 text-center text-sm font-medium text-emerald-600">
            Nenhum alerta crítico no momento. Continue acompanhando!
          </div>
        ) : (
          <ul className="space-y-3">
            {alerts.slice(0, 6).map((alert) => {
              const Icon = ICONS[alert.type];
              return (
                <li
                  key={alert.id}
                  className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/40 p-3 text-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${SEVERITY_VARIANT[alert.severity]}`}>
                      {alert.type === 'stuck'
                        ? 'Sem atualização'
                        : alert.type === 'exception'
                        ? 'Exceção'
                        : 'Lento'}
                    </span>
                    <div className="flex-1 space-y-1">
                      <p className="flex items-center gap-2 font-medium">
                        <Icon className="h-4 w-4" />
                        {alert.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{alert.description}</p>
                      {alert.lastActivity ? (
                        <p className="text-xs text-muted-foreground">
                          Último evento em {format(alert.lastActivity, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      Status: {formatStatus(alert.status)}
                    </Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/dashboard/shipments/${alert.shipmentId}`}>Ver rastreio</Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
