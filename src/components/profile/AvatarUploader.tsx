import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AvatarCropper from './AvatarCropper';
import { useToast } from '@/hooks/use-toast';

type Props = {
  customerId: string;
  initialUrl?: string | null;
  initials?: string;
  onUploadComplete?: (url: string) => void;
};

const ACCEPT = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX = 2 * 1024 * 1024;

export default function AvatarUploader({ customerId, initialUrl, initials = '??', onUploadComplete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | undefined>(initialUrl || undefined);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const { toast } = useToast();

  async function pick() {
    inputRef.current?.click();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPT.includes(file.type)) {
      toast({
        title: 'Formato inválido',
        description: 'Use JPG, PNG, GIF ou WEBP.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > MAX) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O arquivo deve ter no máximo 2 MB.',
        variant: 'destructive',
      });
      return;
    }

    setPendingFile(file);
    setCropOpen(true);
  }

  async function handleCroppedUpload(blob: Blob) {
    setLoading(true);
    setProgress(0);

    try {
      const mime = blob.type || 'image/png';
      
      // Get signed upload URL
      const { data: startData, error: startError } = await supabase.functions.invoke('avatar-upload-start', {
        body: { mime },
      });

      if (startError || !startData?.url) {
        throw new Error('Falha ao iniciar upload');
      }

      // Upload file
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', startData.url, true);
        xhr.setRequestHeader('Content-Type', mime);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error('Upload falhou'));
          }
        };
        xhr.onerror = () => reject(new Error('Erro de rede'));
        xhr.send(blob);
      });

      // Commit and save to database
      const { data: commitData, error: commitError } = await supabase.functions.invoke('avatar-commit', {
        body: { path: startData.path, customerId },
      });

      if (commitError || !commitData?.ok) {
        throw new Error(commitData?.error || 'Falha ao salvar');
      }

      setUrl(commitData.url);
      onUploadComplete?.(commitData.url);
      
      toast({
        title: 'Avatar atualizado',
        description: 'Sua foto foi atualizada com sucesso.',
      });
    } catch (e: any) {
      toast({
        title: 'Erro ao enviar foto',
        description: e?.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setProgress(0);
      setPendingFile(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          {url && <AvatarImage src={url} alt="Avatar" />}
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={pick}
          >
            {loading ? `Enviando ${progress}%` : 'Alterar Foto'}
          </Button>
          <p className="text-xs text-muted-foreground">
            JPG, PNG ou GIF. Máx. 2MB
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(',')}
        hidden
        onChange={onFileChange}
      />

      <AvatarCropper
        file={pendingFile}
        open={cropOpen}
        onClose={() => setCropOpen(false)}
        onCropped={handleCroppedUpload}
      />
    </div>
  );
}
