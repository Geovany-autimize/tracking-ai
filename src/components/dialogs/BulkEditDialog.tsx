import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

interface BulkEditShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (data: { status?: string; auto_tracking?: boolean }) => Promise<void>;
}

export function BulkEditShipmentDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: BulkEditShipmentDialogProps) {
  const [status, setStatus] = useState<string>('');
  const [autoTracking, setAutoTracking] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const updates: { status?: string; auto_tracking?: boolean } = {};
      if (status) updates.status = status;
      if (autoTracking !== null) updates.auto_tracking = autoTracking;
      
      await onConfirm(updates);
      onOpenChange(false);
      setStatus('');
      setAutoTracking(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar em Massa</DialogTitle>
          <DialogDescription>
            Atualizando {selectedCount} rastreio{selectedCount !== 1 ? 's' : ''}. 
            Apenas os campos preenchidos serão atualizados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Manter atual" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_transit">Em Trânsito</SelectItem>
                <SelectItem value="out_for_delivery">Saiu para Entrega</SelectItem>
                <SelectItem value="delivered">Entregue</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-tracking">Rastreamento Automático</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {autoTracking === null ? 'Manter atual' : autoTracking ? 'Ativado' : 'Desativado'}
              </span>
              <Switch
                id="auto-tracking"
                checked={autoTracking === true}
                onCheckedChange={(checked) => setAutoTracking(checked)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || (!status && autoTracking === null)}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aplicar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
