import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { ProcessedRow } from '@/lib/import-processor';
import { Badge } from '@/components/ui/badge';

interface ImportPreviewStepProps {
  processedRows: ProcessedRow<any>[];
  onConfirm: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export function ImportPreviewStep({
  processedRows,
  onConfirm,
  onBack,
  isLoading,
}: ImportPreviewStepProps) {
  const validRows = processedRows.filter(r => r.validation.status === 'valid');
  const warningRows = processedRows.filter(r => r.validation.status === 'warning');
  const errorRows = processedRows.filter(r => r.validation.status === 'error');

  const previewRows = processedRows.slice(0, 10);
  const headers = previewRows[0]?.data ? Object.keys(previewRows[0].data) : [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Preview da Importação</h3>
        <p className="text-sm text-muted-foreground">
          Revise os dados antes de confirmar a importação
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="ml-2">
            <span className="font-semibold">{validRows.length}</span> linhas válidas
          </AlertDescription>
        </Alert>
        <Alert>
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="ml-2">
            <span className="font-semibold">{warningRows.length}</span> com avisos
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            <span className="font-semibold">{errorRows.length}</span> com erros
          </AlertDescription>
        </Alert>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Status</TableHead>
                {headers.map(header => (
                  <TableHead key={header}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(row.validation.status)}
                    </div>
                  </TableCell>
                  {headers.map(header => (
                    <TableCell key={header} className="max-w-[200px] truncate">
                      {row.data?.[header]?.toString() || '—'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {processedRows.length > 10 && (
          <div className="p-3 bg-muted text-center text-sm text-muted-foreground">
            Mostrando 10 de {processedRows.length} linhas
          </div>
        )}
      </div>

      {errorRows.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Erros encontrados:</div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {errorRows.slice(0, 3).map((row, idx) => (
                <li key={idx}>
                  Linha {row.rowIndex + 2}: {row.validation.messages.join(', ')}
                </li>
              ))}
              {errorRows.length > 3 && (
                <li>... e mais {errorRows.length - 3} erros</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          {errorRows.length > 0 && (
            <Badge variant="outline">
              {validRows.length + warningRows.length} linhas serão importadas
            </Badge>
          )}
          <Button onClick={onConfirm} disabled={isLoading || validRows.length === 0}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Importação
          </Button>
        </div>
      </div>
    </div>
  );
}
