import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Clock, AlertTriangle } from 'lucide-react';

function InsightCard({ 
  icon: Icon, 
  title, 
  value, 
  description 
}: { 
  icon: any; 
  title: string; 
  value: string; 
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function InsightsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Insights</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Análise detalhada do desempenho das suas entregas
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InsightCard
          icon={Clock}
          title="Tempo Médio de Entrega"
          value="8.5 dias"
          description="+12% vs. mês anterior"
        />
        <InsightCard
          icon={TrendingUp}
          title="Taxa de Sucesso"
          value="94.2%"
          description="Entregas sem problemas"
        />
        <InsightCard
          icon={AlertTriangle}
          title="Exceções"
          value="3"
          description="Requerem atenção"
        />
        <InsightCard
          icon={BarChart3}
          title="NPS Médio"
          value="8.7"
          description="Satisfação dos clientes"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Relatórios Detalhados</CardTitle>
          <CardDescription>
            Análises de tempo médio, taxa de sucesso, exceções, NPS e CSAT (em breve)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-60 text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Gráficos e relatórios detalhados em desenvolvimento</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
