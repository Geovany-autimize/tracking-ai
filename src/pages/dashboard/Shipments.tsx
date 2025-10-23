import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import ShipmentForm from '@/components/forms/ShipmentForm';

export default function ShipmentsPage() {
  const [formOpen, setFormOpen] = useState(false);

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

      <ShipmentForm open={formOpen} onOpenChange={setFormOpen} />

      <Card>
        <CardHeader>
          <CardTitle>Lista de Rastreios</CardTitle>
          <CardDescription>
            Tabela com filtros por status, busca por código/PLP e timeline lateral nos detalhes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            <p>Nenhum rastreio cadastrado. Clique em "Novo Rastreio" para começar.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
