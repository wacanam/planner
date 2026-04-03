'use client';

import { useRef, useState, useCallback } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// ─── Canvas crop helper ───────────────────────────────────────────────────────

async function getCroppedBlob(image: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      0.9
    )
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AvatarCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imgSrc: string;
  onCropComplete: (file: File) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AvatarCropDialog({
  open,
  onOpenChange,
  imgSrc,
  onCropComplete,
}: AvatarCropDialogProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isApplying, setIsApplying] = useState(false);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 80 }, 1, width, height),
      width,
      height
    );
    setCrop(initialCrop);
  }, []);

  async function handleApply() {
    if (!imgRef.current || !completedCrop) return;
    setIsApplying(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop);

      // Lazy-import to avoid SSR issues
      const imageCompression = (await import('browser-image-compression')).default;
      const compressed = await imageCompression(
        new File([blob], 'avatar.jpg', { type: 'image/jpeg' }),
        {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 512,
          useWebWorker: true,
        }
      );

      onCropComplete(compressed);
      onOpenChange(false);
    } catch (err) {
      console.error('[AvatarCropDialog] apply error', err);
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crop your photo</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center overflow-hidden rounded-xl bg-muted py-4">
          <ReactCrop
            crop={crop}
            onChange={setCrop}
            onComplete={setCompletedCrop}
            aspect={1}
            circularCrop
            minWidth={100}
            minHeight={100}
          >
            {/* biome-ignore lint/performance/noImgElement: crop preview needs ref access not available via next/image */}
            <img
              ref={imgRef}
              src={imgSrc}
              alt="Crop preview"
              className="max-h-80 max-w-full object-contain"
              onLoad={onImageLoad}
            />
          </ReactCrop>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isApplying}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={isApplying || !completedCrop}>
            {isApplying ? 'Applying…' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
