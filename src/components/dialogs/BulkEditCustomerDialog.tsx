import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import PhoneField from '@/components/forms/PhoneField';

interface BulkEditCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (data: { phone?: string; notes?: string }) => Promise<void>;
}

export function BulkEditCustomerDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: BulkEditCustomerDialogProps) {
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const updates: { phone?: string; notes?: string } = {};
    if (phone) updates.phone = phone;
    if (notes) updates.notes = notes;

    try {
      await onConfirm(updates);
      setPhone('');
      setNotes('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = phone || notes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Clientes em Massa</DialogTitle>
          <DialogDescription>
            Editar {selectedCount} cliente{selectedCount !== 1 ? 's' : ''} selecionado{selectedCount !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <PhoneField
            label="Telefone / WhatsApp"
            required={false}
            value={phone}
            onChange={setPhone}
          />

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Adicione notas sobre os clientes..."
            />
          </div>

          <div className="text-xs text-muted-foreground">
            * Apenas os campos preenchidos serão atualizados
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
            <Button type="submit" disabled={!hasChanges || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
