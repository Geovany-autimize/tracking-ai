import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import ShipmentForm from '@/components/forms/ShipmentForm';
import ShipmentList from '@/components/shipments/ShipmentList';

export default function ShipmentsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      // Refresh list when form closes
      setRefreshTrigger(prev => prev + 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold">Rastreios</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie todos os seus rastreios de encomendas
          </p>
        </div>
        <Button variant="default" className="gap-2 shrink-0 whitespace-nowrap" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 shrink-0" />
          <span>Novo Rastreio</span>
        </Button>
      </div>

      <ShipmentForm open={formOpen} onOpenChange={handleFormClose} />

      <ShipmentList refreshTrigger={refreshTrigger} />
    </div>
  );
}
