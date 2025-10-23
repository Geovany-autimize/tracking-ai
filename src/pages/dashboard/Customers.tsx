import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/neon-button';
import { UserPlus } from 'lucide-react';
import CustomerForm from '@/components/forms/CustomerForm';

export default function CustomersPage() {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold">Clientes</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre e gerencie seus clientes
          </p>
        </div>
        <Button variant="solid" className="gap-2 shrink-0 whitespace-nowrap" onClick={() => setFormOpen(true)}>
          <UserPlus className="h-4 w-4 shrink-0" />
          <span>Novo Cliente</span>
        </Button>
      </div>

      <CustomerForm open={formOpen} onOpenChange={setFormOpen} />

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            Gerencie contatos e preferências de notificação dos seus clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            <p>Nenhum cliente cadastrado ainda.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
