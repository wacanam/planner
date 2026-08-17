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
        <div className="flex items-center justify-center py-4">
          <div className="w-48 h-48 rounded-full overflow-hidden border-2 border-primary shadow-inner bg-muted relative flex items-center justify-center">
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
            className="rounded-xl h-9 w-9"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl h-9 w-9"
            onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl h-9 w-9"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            title="Rotate"
          >
            <RotateCw size={16} />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl text-xs"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl text-xs font-semibold"
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
