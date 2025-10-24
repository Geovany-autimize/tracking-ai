import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Package, Truck, Home, AlertCircle, Clock, MapPin } from 'lucide-react';
import { TrackingEvent, ShipmentData } from '@/lib/tracking-api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ShipmentTimelineProps {
  events?: TrackingEvent[];
  shipmentData?: ShipmentData;
}

const getStatusIcon = (milestone: string) => {
  switch (milestone) {
    case 'delivered':
      return Home;
    case 'out_for_delivery':
      return Truck;
    case 'in_transit':
      return Package;
    case 'exception':
      return AlertCircle;
    default:
      return Clock;
  }
};

const getStatusVariant = (milestone: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (milestone) {
    case 'delivered':
      return 'default';
    case 'out_for_delivery':
      return 'secondary';
    case 'exception':
      return 'destructive';
    default:
      return 'outline';
  }
};

export function ShipmentTimeline({ events = [], shipmentData }: ShipmentTimelineProps) {
  // Ordenar eventos do mais recente para o mais antigo
  const sortedEvents = [...events].sort((a, b) => 
    new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
  );

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Rastreamento</CardTitle>
          <CardDescription>
            Acompanhe o status e movimentações do seu pacote
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum evento registrado</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Clique no botão de atualizar para buscar os eventos de rastreamento mais recentes
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Rastreamento</CardTitle>
        <CardDescription>
          {sortedEvents.length} {sortedEvents.length === 1 ? 'evento registrado' : 'eventos registrados'}
          {shipmentData && ` • Status: ${shipmentData.statusMilestone}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sortedEvents.map((event, index) => {
            const Icon = getStatusIcon(event.statusMilestone);
            const isFirstEvent = index === 0;

            return (
              <div key={event.eventId} className="flex gap-4">
                {/* Timeline Line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      flex h-10 w-10 items-center justify-center rounded-full border-2
                      ${isFirstEvent 
                        ? 'border-primary bg-primary text-primary-foreground' 
                        : 'border-muted bg-background text-muted-foreground'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {index < sortedEvents.length - 1 && (
                    <div className="h-full w-px bg-border mt-2" />
                  )}
                </div>

                {/* Event Content */}
                <div className="flex-1 pb-6">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-semibold">{event.status}</h4>
                    {isFirstEvent && (
                      <Badge variant="default" className="text-xs">
                        Mais Recente
                      </Badge>
                    )}
                    {event.statusMilestone && (
                      <Badge variant={getStatusVariant(event.statusMilestone)} className="text-xs">
                        {event.statusMilestone}
                      </Badge>
                    )}
                  </div>
                  
                  {event.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <MapPin className="h-3 w-3" />
                      <span>{event.location}</span>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {format(new Date(event.datetime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>

                  {event.courierCode && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Transportadora: {event.courierCode}
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
