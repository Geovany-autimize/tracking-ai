import { Link } from 'react-router-dom';
import { Lightbulb, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardInsight } from '@/lib/dashboard-metrics';

interface InsightsPanelProps {
  insights: DashboardInsight[];
}

export function DashboardInsightsPanel({ insights }: InsightsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Recomendações inteligentes
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Descubra oportunidades para acelerar a operação e encantar clientes.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-6 text-center text-sm text-emerald-600">
            <TrendingUp className="h-6 w-6" />
            <p>Excelente trabalho! Mantendo os indicadores sob controle você inspira confiança.</p>
          </div>
        ) : (
          insights.slice(0, 3).map((insight, index) => (
            <div key={`${insight.title}-${index}`} className="rounded-md border border-border/60 bg-muted/40 p-4">
              <h3 className="text-sm font-semibold">{insight.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{insight.description}</p>
              {insight.route && insight.actionLabel && (
                <Button variant="link" size="sm" className="-ml-2 mt-1 text-xs font-semibold" asChild>
                  <Link to={insight.route}>{insight.actionLabel}</Link>
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

