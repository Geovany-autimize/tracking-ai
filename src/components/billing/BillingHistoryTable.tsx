import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export function BillingHistoryTable() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Histórico de Cobranças
            </CardTitle>
            <CardDescription>Todas as suas transações</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">Em breve</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Estamos preparando seu histórico de transações. 
            Em breve você poderá visualizar todas as suas cobranças aqui.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
