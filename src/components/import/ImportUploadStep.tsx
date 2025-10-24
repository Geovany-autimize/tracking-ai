import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload, Loader2, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from '@/hooks/use-toast';

interface ImportUploadStepProps {
  type: 'shipments' | 'customers';
  onFileLoaded: (data: any[], headers: string[]) => void;
  onDownloadTemplate: () => void;
}

export function ImportUploadStep({ type, onFileLoaded, onDownloadTemplate }: ImportUploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, selecione um arquivo CSV',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setIsProcessing(false);
        if (results.data.length === 0) {
          toast({
            title: 'Arquivo vazio',
            description: 'O arquivo CSV não contém dados',
            variant: 'destructive',
          });
          setFileName(null);
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
        setIsProcessing(false);
        setFileName(null);
        toast({
          title: 'Erro ao ler arquivo',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  }, [onFileLoaded]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

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

      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center space-y-4 transition-colors ${
          isDragging ? 'border-primary bg-primary/10' : 'border-border'
        } ${fileName ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
            <p className="text-sm font-medium">Processando arquivo...</p>
          </>
        ) : fileName ? (
          <>
            <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Arquivo carregado com sucesso!
              </p>
              <p className="text-xs text-muted-foreground mt-1">{fileName}</p>
            </div>
          </>
        ) : (
          <>
            <Upload className={`h-12 w-12 mx-auto transition-colors ${
              isDragging ? 'text-primary' : 'text-muted-foreground'
            }`} />
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
          </>
        )}
      </div>
    </div>
  );
}
