'use client';

import { CircleDot, MapPinned, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DrawingToolbarProps {
  isDrawing: boolean;
  pointCount: number;
  polygonCount: number;
  onClearCurrent: () => void;
  onClearAll: () => void;
  onSave: () => void;
  isSaving: boolean;
}

/**
 * Inline drawing toolbar for territory map
 * Shows status and quick actions while drawing
 */
export function DrawingToolbar({
  isDrawing,
  pointCount,
  polygonCount,
  onClearCurrent,
  onClearAll,
  onSave,
  isSaving,
}: DrawingToolbarProps) {
  if (!isDrawing) return null;

  return (
    <div className="absolute bottom-24 left-3 right-3 z-10 max-w-sm rounded-lg border bg-background p-4 shadow-lg sm:left-4 sm:right-auto sm:w-80">
      {/* Title */}
      <div className="text-sm font-semibold mb-3 flex items-center gap-2">
        <MapPinned className="h-4 w-4" />
        Drawing Mode
      </div>

      {/* Status */}
      <div className="mb-4 space-y-1 rounded bg-muted/50 p-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <MapPinned className="h-3.5 w-3.5" />
          Polygons: <span className="font-semibold text-foreground">{polygonCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CircleDot className="h-3.5 w-3.5" />
          Current points: <span className="font-semibold text-foreground">{pointCount}</span>
        </div>
        {pointCount > 0 && (
          <div className="mt-1 text-[11px] text-primary">Double-click to finish</div>
        )}
      </div>

      {/* Instructions */}
      {pointCount === 0 && polygonCount === 0 && (
        <div className="mb-3 rounded border border-primary/20 bg-primary/5 p-2 text-xs text-muted-foreground">
          Click on map to add points. Double-click to finish polygon.
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button
            onClick={onClearCurrent}
            disabled={pointCount === 0}
            size="sm"
            variant="outline"
            className="h-8 flex-1 text-xs"
          >
            Clear Current
          </Button>
          <Button
            onClick={onClearAll}
            disabled={polygonCount === 0 && pointCount === 0}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title="Clear all polygons"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Button
          onClick={onSave}
          disabled={polygonCount === 0 || isSaving}
          size="sm"
          className="h-9 w-full text-xs"
        >
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {isSaving ? 'Saving...' : 'Save Boundary'}
        </Button>
      </div>
    </div>
  );
}
