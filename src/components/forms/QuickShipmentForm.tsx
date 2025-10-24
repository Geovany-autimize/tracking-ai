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
  const { customer } = useAuth();
  const [trackingCode, setTrackingCode] = useState('');
  const [autoTracking, setAutoTracking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id) return;

    setIsLoading(true);
    try {
      // Verificar duplicata
      const { data: existing } = await supabase
        .from('shipments')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('tracking_code', trackingCode)
        .maybeSingle();

      if (existing) {
        toast({
          title: 'Código duplicado',
          description: 'Este código de rastreio já existe',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const { data: insertedData, error } = await supabase.from('shipments').insert({
        customer_id: customer.id,
        shipment_customer_id: customerId,
        tracking_code: trackingCode,
        auto_tracking: autoTracking,
        status: 'pending',
      }).select().single();

      if (error) throw error;

      // Enviar para API de rastreio e processar resposta
      try {
        const apiResponse = await sendToTrackingAPI(customer.id, trackingCode, 'new_track');
        
        // Processar dados da API
        const apiData = Array.isArray(apiResponse) ? apiResponse[0] : apiResponse;
        const trackingData = parseTrackingResponse(apiData);
        
        if (trackingData && insertedData) {
          // Atualizar registro com dados da API
          await supabase.from('shipments').update({
            tracker_id: trackingData.tracker.trackerId,
            tracking_events: trackingData.events as any,
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
