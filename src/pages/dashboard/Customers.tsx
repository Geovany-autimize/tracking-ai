import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import CustomerForm from '@/components/forms/CustomerForm';
import CustomerList from '@/components/customers/CustomerList';

export default function CustomersPage() {
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
          <h2 className="text-2xl font-semibold">Clientes</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre e gerencie seus clientes
          </p>
        </div>
        <Button variant="default" className="gap-2 shrink-0 whitespace-nowrap" onClick={() => setFormOpen(true)}>
          <UserPlus className="h-4 w-4 shrink-0" />
          <span>Novo Cliente</span>
        </Button>
      </div>

      <CustomerForm open={formOpen} onOpenChange={handleFormClose} />

      <CustomerList refreshTrigger={refreshTrigger} />
    </div>
  );
}
