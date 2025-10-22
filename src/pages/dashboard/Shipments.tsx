import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function ShipmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Rastreios</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie todos os seus rastreios de encomendas
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Rastreio
        </Button>
      </div>

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
