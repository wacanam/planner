'use client';

import { Move, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Button } from '@/components/ui/button';

interface AvatarCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  loading?: boolean;
}

const PREVIEW_SIZE = 192; // 192px (w-48)
const OUTPUT_SIZE = 400; // Crisp 400x400 square avatar for sharp rendering on retina/high-DPI

export function AvatarCropDialog({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
  loading = false,
}: AvatarCropDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [naturalDim, setNaturalDim] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startPanX: number; startPanY: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset state on modal open / new image
  useEffect(() => {
    if (open) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    }
  }, [open, imageSrc]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalDim({
      width: img.naturalWidth || 400,
      height: img.naturalHeight || 400,
    });
  };

  // Compute aspect-ratio-preserving base dimensions to cover the preview circle
  const nw = naturalDim.width || 400;
  const nh = naturalDim.height || 400;
  const isRotated90or270 = rotation % 180 !== 0;

  const baseCoverScale = isRotated90or270
    ? Math.max(PREVIEW_SIZE / nh, PREVIEW_SIZE / nw)
    : Math.max(PREVIEW_SIZE / nw, PREVIEW_SIZE / nh);

  const previewBaseWidth = nw * baseCoverScale;
  const previewBaseHeight = nh * baseCoverScale;

  // Pointer drag events for smooth pan
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.clientX;
    const deltaY = e.clientY - dragStartRef.current.clientY;
    setPan({
      x: Math.round(dragStartRef.current.startPanX + deltaX),
      y: Math.round(dragStartRef.current.startPanY + deltaY),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleSave = useCallback(() => {
    if (!imgRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const scaleRatio = OUTPUT_SIZE / PREVIEW_SIZE;
    const canvasBaseWidth = previewBaseWidth * scaleRatio;
    const canvasBaseHeight = previewBaseHeight * scaleRatio;

    ctx.save();
    // Translate to center with scaled pan offset
    ctx.translate(
      OUTPUT_SIZE / 2 + pan.x * scaleRatio,
      OUTPUT_SIZE / 2 + pan.y * scaleRatio
    );
    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);
    // Apply zoom
    ctx.scale(zoom, zoom);
    // Draw centered with exact aspect ratio preserved
    ctx.drawImage(
      imgRef.current,
      -canvasBaseWidth / 2,
      -canvasBaseHeight / 2,
      canvasBaseWidth,
      canvasBaseHeight
    );
    ctx.restore();

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob);
          onOpenChange(false);
        }
      },
      'image/jpeg',
      0.88
    );
  }, [previewBaseWidth, previewBaseHeight, pan.x, pan.y, rotation, zoom, onCropComplete, onOpenChange]);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Adjust Profile Picture"
      description="Position, zoom, and rotate your photo before saving"
    >
      <div className="space-y-4">
        {/* Preview Circle */}
        <div className="flex flex-col items-center justify-center py-2 sm:py-4 select-none">
          <div
            className="w-44 h-44 sm:w-48 sm:h-48 rounded-full overflow-hidden border-2 border-primary shadow-lg bg-muted relative flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none ring-4 ring-primary/10"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            title="Drag to reposition photo"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={handleImageLoad}
              draggable={false}
              style={{
                width: `${previewBaseWidth}px`,
                height: `${previewBaseHeight}px`,
                maxWidth: 'none',
                maxHeight: 'none',
                position: 'absolute',
                left: '50%',
                top: '50%',
                transformOrigin: 'center center',
                transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) rotate(${rotation}deg) scale(${zoom})`,
                userSelect: 'none',
                pointerEvents: 'none',
                transition: isDragging ? 'none' : 'transform 0.08s ease-out',
              }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1 font-medium">
            <Move size={12} className="opacity-70" />
            <span>Drag photo to reposition inside circle</span>
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl h-10 w-10 sm:h-9 sm:w-9 active:scale-95 cursor-pointer"
            onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))}
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <ZoomOut size={17} />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl h-10 w-10 sm:h-9 sm:w-9 active:scale-95 cursor-pointer"
            onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.1).toFixed(2))))}
            title="Zoom In"
            aria-label="Zoom in"
          >
            <ZoomIn size={17} />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl h-10 w-10 sm:h-9 sm:w-9 active:scale-95 cursor-pointer"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            title="Rotate 90 degrees"
            aria-label="Rotate image"
          >
            <RotateCw size={17} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="rounded-xl text-xs h-10 sm:h-9 px-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => {
              setZoom(1);
              setRotation(0);
              setPan({ x: 0, y: 0 });
            }}
            title="Reset position and zoom"
          >
            Reset
          </Button>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl text-xs h-10 sm:h-9 w-full sm:w-auto cursor-pointer"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl text-xs font-semibold h-10 sm:h-9 w-full sm:w-auto cursor-pointer"
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
