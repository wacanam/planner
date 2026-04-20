'use client';

import React from 'react';
import { Trash2, Save, Type } from 'lucide-react';
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
    <div className="absolute bottom-24 left-4 z-10 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-xs">
      {/* Title */}
      <div className="text-sm font-semibold mb-3 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3-8c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z"/>
        </svg>
        Drawing Mode
      </div>

      {/* Status */}
      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400 mb-4 p-2 bg-gray-50 dark:bg-gray-800 rounded">
        <div>✏️ Polygons: <span className="font-semibold">{polygonCount}</span></div>
        <div>📍 Current points: <span className="font-semibold">{pointCount}</span></div>
        {pointCount > 0 && <div className="text-blue-600 dark:text-blue-400 text-[11px] mt-1">💡 Double-click to finish</div>}
      </div>

      {/* Instructions */}
      {pointCount === 0 && polygonCount === 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 p-2 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-900">
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
            className="flex-1 text-xs h-7"
          >
            Clear Current
          </Button>
          <Button
            onClick={onClearAll}
            disabled={polygonCount === 0 && pointCount === 0}
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            title="Clear all polygons"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        <Button
          onClick={onSave}
          disabled={polygonCount === 0 || isSaving}
          size="sm"
          className="w-full bg-green-600 hover:bg-green-700 text-white text-xs h-8"
        >
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {isSaving ? 'Saving...' : 'Save Boundary'}
        </Button>
      </div>
    </div>
  );
}
