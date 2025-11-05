import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { sendToTrackingAPI, parseTrackingResponse, mapApiStatusToInternal } from '@/lib/tracking-api';
import { useHighlights } from '@/contexts/HighlightsContext';
import { useCredits } from '@/hooks/use-credits';

interface QuickShipmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  onShipmentCreated: () => void;
}

export default function QuickShipmentForm({
  open,
  onOpenChange,
  customerId,
  onShipmentCreated,
}: QuickShipmentFormProps) {
  const { customer, refreshSession } = useAuth();
  const { addNew } = useHighlights();
  const { refresh: refreshCredits } = useCredits();
  const [trackingCode, setTrackingCode] = useState('');
  const [autoTracking, setAutoTracking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id) return;

    setIsLoading(true);
    try {
      // Usar nova função que cria shipment e consome crédito atomicamente
      const { data: result, error } = await supabase.functions.invoke('create-shipment-with-credit', {
        body: {
          tracking_code: trackingCode,
          shipment_customer_id: customerId,
          auto_tracking: autoTracking,
        },
      });

      if (error) throw error;

      if (!result.success) {
        // Tratar erros específicos
        if (result.error === 'DUPLICATE_TRACKING_CODE') {
          toast({
            title: 'Código duplicado',
            description: 'Este código de rastreio já existe',
            variant: 'destructive',
          });
        } else if (result.error === 'NO_CREDITS') {
          toast({
            title: 'Sem créditos disponíveis',
            description: 'Você precisa comprar mais créditos para criar rastreios',
            variant: 'destructive',
          });
        } else {
          throw new Error(result.error || result.message || 'Erro ao criar rastreio');
        }
        setIsLoading(false);
        return;
      }

      // Buscar shipment criado para processar API
      const { data: insertedData, error: fetchError } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', result.shipment_id)
        .single();

      if (fetchError) throw fetchError;

      // Enviar para API de rastreio e processar resposta
      try {
        const apiResponse = await sendToTrackingAPI(customer.id, trackingCode, 'new_track');
        
        // Processar dados da API padronizados
        const trackingData = parseTrackingResponse(apiResponse);
        
        if (trackingData && insertedData) {
          // Importar função de enriquecimento
          const { enrichEventsWithCourierNames } = await import('@/lib/tracking-api');
          
          // Enriquecer eventos com nomes das transportadoras
          const enrichedEvents = await enrichEventsWithCourierNames(trackingData.events);
          
          // Atualizar registro com dados da API
          await supabase.from('shipments').update({
            tracker_id: trackingData.tracker.trackerId,
            tracking_events: enrichedEvents as any,
            shipment_data: trackingData.shipment as any,
            status: mapApiStatusToInternal(trackingData.shipment.statusMilestone),
            last_update: new Date().toISOString()
          }).eq('id', insertedData.id);
        }
        
        toast({ title: 'Rastreio criado e sincronizado com sucesso' });
      } catch (apiError) {
        console.error('Tracking API error:', apiError);
        toast({ 
          title: 'Rastreio criado',
          description: 'Use o botão Atualizar para sincronizar',
          variant: 'destructive'
        });
      }

        // destacar como novo na lista
        if (insertedData?.id) {
          addNew('shipment', insertedData.id);
        }

        // Atualizar créditos na UI e mostrar feedback
        await refreshSession();
        await refreshCredits(); // Atualizar contador de créditos
        
        const remainingCredits = result.remaining_credits ?? 0;
        toast({
          title: 'Rastreio criado com sucesso',
          description: remainingCredits > 0 
            ? `${remainingCredits} créditos restantes`
            : 'Você está sem créditos. Considere comprar mais.',
        });

        setTrackingCode('');
        setAutoTracking(true);
        onOpenChange(false);
        onShipmentCreated();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao criar rastreio',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Rastreio</DialogTitle>
          <DialogDescription>
            Adicionar rastreio para este cliente
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tracking-code">Código de Rastreio *</Label>
            <Input
              id="tracking-code"
              placeholder="Ex: BR123456789BR"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="auto-tracking" className="text-base cursor-pointer">
                Rastreamento Automático
              </Label>
              <p className="text-sm text-muted-foreground">
                Atualizar status automaticamente
              </p>
            </div>
            <Switch
              id="auto-tracking"
              checked={autoTracking}
              onCheckedChange={setAutoTracking}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Rastreio'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
