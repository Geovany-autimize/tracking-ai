export async function getCroppedBlobFromImage(
  file: File,
  crop: { x: number; y: number; width: number; height: number },
  rotation: number = 0,
  outSize: number = 512,
  mime: string = 'image/png'
): Promise<Blob> {
  const image = await readImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const { naturalWidth: iw, naturalHeight: ih } = image;

  // Área a recortar na imagem original
  const sx = Math.max(0, crop.x);
  const sy = Math.max(0, crop.y);
  const sw = Math.min(iw - sx, crop.width);
  const sh = Math.min(ih - sy, crop.height);

  // Saída quadrada
  canvas.width = outSize;
  canvas.height = outSize;

  // Fundo transparente e desenho escalado
  ctx.save();
  if (rotation) {
    ctx.translate(outSize / 2, outSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-outSize / 2, -outSize / 2);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outSize, outSize);
  ctx.restore();

  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((blob) => resolve(blob as Blob), mime, 0.92)
  );
}

function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = URL.createObjectURL(file);
  });
}
