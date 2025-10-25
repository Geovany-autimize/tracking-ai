import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download } from 'lucide-react';
import { useBilling, type BillingTransaction } from '@/hooks/use-billing';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

export function BillingHistoryTable() {
  const { transactions, isLoadingHistory } = useBilling();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <Badge className="bg-success">Pago</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'subscription':
        return 'Assinatura';
      case 'credit_purchase':
        return 'Compra de Créditos';
      case 'auto_topup':
        return 'Recarga Automática';
      default:
        return type;
    }
  };

  const formatAmount = (cents: number, currency: string) => {
    const symbol = currency === 'brl' ? 'R$' : currency.toUpperCase();
    return `${symbol} ${(cents / 100).toFixed(2).replace('.', ',')}`;
  };

  if (isLoadingHistory) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Cobranças</CardTitle>
          <CardDescription>Todas as suas transações</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Cobranças
          </CardTitle>
          <CardDescription>Todas as suas transações</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma transação encontrada
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Histórico de Cobranças
        </CardTitle>
        <CardDescription>
          Todas as suas transações e faturas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Créditos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx: BillingTransaction) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">
                    {format(new Date(tx.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>{tx.description || '-'}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {getTypeLabel(tx.type)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatAmount(tx.amount_cents, tx.currency)}
                  </TableCell>
                  <TableCell>{getStatusBadge(tx.status)}</TableCell>
                  <TableCell className="text-right">
                    {tx.credits_added ? (
                      <span className="text-success font-medium">
                        +{tx.credits_added}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {transactions.length >= 10 && (
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {transactions.length} transações
            </p>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
