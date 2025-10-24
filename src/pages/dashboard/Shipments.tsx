import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload } from 'lucide-react';
import ShipmentForm from '@/components/forms/ShipmentForm';
import ShipmentList from '@/components/shipments/ShipmentList';
import { ImportDialog } from '@/components/dialogs/ImportDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export default function ShipmentsPage() {
  const { customer } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setRefreshTrigger(prev => prev + 1);
  };

  const handleImport = async (data: any[]) => {
    for (const item of data) {
      const { data: existingCustomer } = await supabase.from('shipment_customers').select('id').eq('email', item.customer_email).eq('customer_id', customer!.id).single();
      await supabase.from('shipments').insert({ tracking_code: item.tracking_code, status: item.status, auto_tracking: item.auto_tracking, shipment_customer_id: existingCustomer?.id, customer_id: customer!.id });
    }
    setRefreshTrigger(prev => prev + 1);
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
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 shrink-0" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Importar
          </Button>
          <Button variant="default" className="gap-2 shrink-0" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo Rastreio
          </Button>
        </div>
      </div>

      <ShipmentForm open={formOpen} onOpenChange={handleFormClose} />
      <ImportDialog type="shipments" open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} />

      <ShipmentList refreshTrigger={refreshTrigger} />
    </div>
  );
}
