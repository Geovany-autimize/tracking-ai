import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ImportUploadStep } from '@/components/import/ImportUploadStep';
import { ImportMappingStep } from '@/components/import/ImportMappingStep';
import { ImportPreviewStep } from '@/components/import/ImportPreviewStep';
import { downloadTemplate, generateShipmentTemplate, generateCustomerTemplate } from '@/lib/csv-templates';
import {
  processImportData,
  shipmentImportSchema,
  customerImportSchema,
  ProcessedRow,
  getValidRows,
} from '@/lib/import-processor';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

interface ImportDialogProps {
  type: 'shipments' | 'customers';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: any[]) => Promise<void>;
}

const SHIPMENT_FIELDS = [
  { id: 'tracking_code', label: 'Código de Rastreio', required: true },
  { id: 'customer_email', label: 'Email do Cliente', required: true },
  { id: 'status', label: 'Status', required: false },
  { id: 'auto_tracking', label: 'Rastreamento Automático', required: false },
];

const CUSTOMER_FIELDS = [
  { id: 'first_name', label: 'Nome', required: true },
  { id: 'last_name', label: 'Sobrenome', required: true },
  { id: 'email', label: 'Email', required: true },
  { id: 'phone', label: 'Telefone', required: false },
  { id: 'notes', label: 'Observações', required: false },
];

export function ImportDialog({ type, open, onOpenChange, onImport }: ImportDialogProps) {
  const [step, setStep] = useState(1);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [processedRows, setProcessedRows] = useState<ProcessedRow<any>[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fields = type === 'shipments' ? SHIPMENT_FIELDS : CUSTOMER_FIELDS;
  const schema: z.ZodTypeAny = type === 'shipments' ? shipmentImportSchema : customerImportSchema;

  const handleDownloadTemplate = () => {
    const template = type === 'shipments' 
      ? generateShipmentTemplate() 
      : generateCustomerTemplate();
    const filename = type === 'shipments' 
      ? 'template_rastreios.csv' 
      : 'template_clientes.csv';
    downloadTemplate(template, filename);
  };

  const handleFileLoaded = (data: any[], headers: string[]) => {
    if (data.length > 1000) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O limite é de 1000 linhas por importação',
        variant: 'destructive',
      });
      return;
    }
    
    setCsvData(data);
    setCsvHeaders(headers);
    setStep(2);
  };

  const handleMappingComplete = (newMapping: Record<string, string>) => {
    setMapping(newMapping);
    const processed = processImportData(csvData, newMapping, schema);
    setProcessedRows(processed);
    setStep(3);
  };

  const handleConfirmImport = async () => {
    setIsLoading(true);
    try {
      const validData = getValidRows(processedRows);
      await onImport(validData);
      
      toast({
        title: 'Importação concluída',
        description: `${validData.length} registros importados com sucesso`,
      });
      
      handleClose();
    } catch (error: any) {
      toast({
        title: 'Erro na importação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setCsvData([]);
    setCsvHeaders([]);
    setMapping({});
    setProcessedRows([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {step === 1 && (
          <ImportUploadStep
            type={type}
            onFileLoaded={handleFileLoaded}
            onDownloadTemplate={handleDownloadTemplate}
          />
        )}
        {step === 2 && (
          <ImportMappingStep
            csvHeaders={csvHeaders}
            requiredFields={fields}
            onNext={handleMappingComplete}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <ImportPreviewStep
            processedRows={processedRows}
            onConfirm={handleConfirmImport}
            onBack={() => setStep(2)}
            isLoading={isLoading}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
