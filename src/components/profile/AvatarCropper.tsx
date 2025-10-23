import { useCallback, useEffect, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { getCroppedBlobFromImage } from '@/lib/crop';
import { Button } from '@/components/ui/button';

type Props = {
  file: File | null;
  open: boolean;
  onClose: () => void;
  onCropped: (blob: Blob) => void;
};

export default function AvatarCropper({ file, open, onClose, onCropped }: Props) {
  const [zoom, setZoom] = useState(1);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    if (!open) {
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setAreaPixels(null);
    }
  }, [open]);

  const onCropComplete = useCallback((_area: Area, areaPx: Area) => {
    setAreaPixels(areaPx);
  }, []);

  async function handleConfirm() {
    if (!file || !areaPixels) return;
    const blob = await getCroppedBlobFromImage(
      file,
      { x: areaPixels.x, y: areaPixels.y, width: areaPixels.width, height: areaPixels.height },
      0,
      512,
      'image/png'
    );
    onCropped(blob);
    onClose();
  }

  if (!open || !file) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium">Ajustar foto</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Esc
          </Button>
        </div>

        <div className="relative h-[360px] bg-muted">
          <Cropper
            image={URL.createObjectURL(file)}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
            restrictPosition={true}
          />
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3 flex-1">
            <label className="text-xs text-muted-foreground">Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm}>Confirmar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
