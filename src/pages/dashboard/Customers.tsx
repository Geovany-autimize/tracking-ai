import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Upload } from 'lucide-react';
import CustomerForm from '@/components/forms/CustomerForm';
import CustomerList from '@/components/customers/CustomerList';
import { ImportDialog } from '@/components/dialogs/ImportDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export default function CustomersPage() {
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
      await supabase.from('shipment_customers').insert({
        first_name: item.first_name,
        last_name: item.last_name,
        email: item.email,
        phone: item.phone,
        notes: item.notes,
        customer_id: customer!.id,
      });
    }
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold">Clientes</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre e gerencie seus clientes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 shrink-0" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Importar
          </Button>
          <Button variant="default" className="gap-2 shrink-0" onClick={() => setFormOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </div>
      </div>

      <CustomerForm open={formOpen} onOpenChange={handleFormClose} />
      <ImportDialog type="customers" open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} />

      <CustomerList refreshTrigger={refreshTrigger} />
    </div>
  );
}
