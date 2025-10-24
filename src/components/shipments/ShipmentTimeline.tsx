import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';

// Preview component - dados serão carregados da API futuramente
const mockTimelineEvents = [
  {
    id: '1',
    status: 'pending',
    title: 'Pedido Criado',
    description: 'Rastreio iniciado no sistema',
    date: new Date(),
    icon: Package,
  },
  {
    id: '2',
    status: 'in_transit',
    title: 'Em Trânsito',
    description: 'Objeto saiu para entrega',
    date: new Date(Date.now() - 86400000),
    icon: Truck,
  },
  {
    id: '3',
    status: 'delivered',
    title: 'Entregue',
    description: 'Objeto entregue ao destinatário',
    date: null,
    icon: CheckCircle,
  },
];

export default function ShipmentTimeline() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Rastreamento</CardTitle>
        <CardDescription>
          Timeline das etapas do rastreio (preview - será integrado com API)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-6 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-0.5 before:bg-border">
          {mockTimelineEvents.map((event, index) => {
            const Icon = event.icon;
            const isCompleted = event.date !== null;
            const isCurrent = index === mockTimelineEvents.findIndex(e => e.date === null) - 1;
            
            return (
              <div key={event.id} className="relative flex gap-4 pl-10">
                <div
                  className={`absolute left-0 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    isCompleted
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isCurrent
                      ? 'border-primary bg-background text-primary'
                      : 'border-muted bg-background text-muted-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{event.title}</h4>
                    {isCurrent && (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        Atual
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                  {event.date && (
                    <p className="text-xs text-muted-foreground">
                      {event.date.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
