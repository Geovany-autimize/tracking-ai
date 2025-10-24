import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from '@/hooks/use-toast';

interface ImportUploadStepProps {
  type: 'shipments' | 'customers';
  onFileLoaded: (data: any[], headers: string[]) => void;
  onDownloadTemplate: () => void;
}

export function ImportUploadStep({ type, onFileLoaded, onDownloadTemplate }: ImportUploadStepProps) {
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, selecione um arquivo CSV',
        variant: 'destructive',
      });
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          toast({
            title: 'Arquivo vazio',
            description: 'O arquivo CSV não contém dados',
            variant: 'destructive',
          });
          return;
        }

        const headers = results.meta.fields || [];
        onFileLoaded(results.data, headers);
        
        toast({
          title: 'Arquivo carregado',
          description: `${results.data.length} linhas encontradas`,
        });
      },
      error: (error) => {
        toast({
          title: 'Erro ao ler arquivo',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  }, [onFileLoaded]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">
          Importar {type === 'shipments' ? 'Rastreios' : 'Clientes'}
        </h3>
        <p className="text-sm text-muted-foreground">
          Faça upload de um arquivo CSV para importar múltiplos registros de uma vez
        </p>
      </div>

      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={onDownloadTemplate}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Baixar Modelo CSV
        </Button>
      </div>

      <div className="border-2 border-dashed rounded-lg p-12 text-center space-y-4">
        <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
        <div>
          <p className="text-sm font-medium mb-2">
            Arraste um arquivo CSV ou clique para selecionar
          </p>
          <p className="text-xs text-muted-foreground">
            Tamanho máximo: 1000 linhas
          </p>
        </div>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          id="csv-upload"
        />
        <label htmlFor="csv-upload">
          <Button variant="default" asChild>
            <span>Selecionar Arquivo</span>
          </Button>
        </label>
      </div>
    </div>
  );
}
