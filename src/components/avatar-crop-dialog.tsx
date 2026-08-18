'use client';

import { RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Button } from '@/components/ui/button';

interface AvatarCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  loading?: boolean;
}

export function AvatarCropDialog({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
  loading = false,
}: AvatarCropDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleSave = useCallback(() => {
    if (!imgRef.current) return;
    const canvas = document.createElement('canvas');
    const size = 300;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    ctx.drawImage(imgRef.current, -size / 2, -size / 2, size, size);
    ctx.restore();

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob);
          onOpenChange(false);
        }
      },
      'image/jpeg',
      0.85
    );
  }, [zoom, rotation, onCropComplete, onOpenChange]);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Adjust Profile Picture"
      description="Zoom and position your photo before saving"
    >
      <div className="space-y-4">
        {/* Preview Circle */}
        <div className="flex items-center justify-center py-2 sm:py-4">
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden border-2 border-primary shadow-inner bg-muted relative flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              className="w-full h-full object-cover transition-transform"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl h-10 w-10 sm:h-9 sm:w-9 active:scale-95"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <ZoomOut size={18} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl h-10 w-10 sm:h-9 sm:w-9 active:scale-95"
            onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
            title="Zoom In"
            aria-label="Zoom in"
          >
            <ZoomIn size={18} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl h-10 w-10 sm:h-9 sm:w-9 active:scale-95"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            title="Rotate"
            aria-label="Rotate image"
          >
            <RotateCw size={18} />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl text-xs h-10 sm:h-9 w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl text-xs font-semibold h-10 sm:h-9 w-full sm:w-auto"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving…' : 'Apply Avatar'}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
