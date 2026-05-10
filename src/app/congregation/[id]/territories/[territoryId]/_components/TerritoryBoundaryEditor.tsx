'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, MapPin, Save, Trash2, Undo2 } from 'lucide-react';
import TerritoryMap, { type TerritoryMapProps } from '@/components/territory-map';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { type GeoJSONGeometry, useTerritoryBoundary } from '@/hooks/use-territory-boundary';

interface TerritoryBoundaryEditorProps {
  territoryId: string;
  initialCenter?: [number, number];
  onBoundarySaved?: () => void;
}

type DrawingActions = Parameters<NonNullable<TerritoryMapProps['onDrawingActions']>>[0];
type LngLat = [number, number];

function boundaryToRings(boundary: GeoJSONGeometry | null): LngLat[][] {
  if (!boundary) return [];
  if (boundary.type === 'Polygon') {
    return boundary.coordinates.map((ring) => ring.slice(0, -1).map(([lng, lat]) => [lng, lat] as LngLat));
  }
  return boundary.coordinates.flatMap((polygon) =>
    polygon.map((ring) => ring.slice(0, -1).map(([lng, lat]) => [lng, lat] as LngLat))
  );
}

export function TerritoryBoundaryEditor({
  territoryId,
  initialCenter = [0, 0],
  onBoundarySaved,
}: TerritoryBoundaryEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [drawingActions, setDrawingActions] = useState<DrawingActions | null>(null);
  const [ringCount, setRingCount] = useState(0);
  const [activePoints, setActivePoints] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { boundary, isLoading, isSaving, error, fetchBoundary, saveBoundary, clearBoundary } =
    useTerritoryBoundary();

  useEffect(() => {
    fetchBoundary(territoryId);
  }, [fetchBoundary, territoryId]);

  useEffect(() => {
    if (!notice) return;
    const timeoutId = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const boundaryString = useMemo(() => (boundary ? JSON.stringify(boundary) : null), [boundary]);
  const initialRings = useMemo(() => boundaryToRings(boundary), [boundary]);
  const canSave = ringCount > 0 && activePoints === 0 && !isSaving;

  const handleSave = async () => {
    const geojson = drawingActions?.getGeoJSON();
    if (!geojson) {
      setNotice('Draw at least one polygon before saving.');
      return;
    }
    if (activePoints > 0) {
      setNotice('Close the active polygon before saving.');
      return;
    }
    await saveBoundary(territoryId, geojson as GeoJSONGeometry);
    setSaved(true);
    onBoundarySaved?.();
    window.setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = async () => {
    drawingActions?.clearRings();
    await clearBoundary(territoryId);
    setSaved(false);
  };

  return (
    <Card className="mt-4 overflow-hidden rounded-lg">
      <button
        type="button"
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <span className="font-semibold">Territory Boundaries</span>
        </span>
        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {isExpanded && (
        <div className="border-t p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => drawingActions?.undoPoint()}
              disabled={activePoints === 0 || isSaving}
            >
              <Undo2 className="h-4 w-4" />
              Undo point
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => drawingActions?.closeRing()}
              disabled={activePoints < 3 || isSaving}
            >
              <CheckCircle2 className="h-4 w-4" />
              Close polygon
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleClear} disabled={isSaving || ringCount === 0}>
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={!canSave}>
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">
              {isLoading
                ? 'Loading boundary...'
                : activePoints > 0
                  ? `${activePoints} point${activePoints === 1 ? '' : 's'} in active polygon`
                  : `${ringCount} polygon${ringCount === 1 ? '' : 's'}`}
            </span>
          </div>

          {(notice || error || saved) && (
            <div className="mb-3 rounded-lg border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              {saved ? 'Boundary saved.' : notice || error}
            </div>
          )}

          <div className="h-[70vh] min-h-96 overflow-hidden rounded-lg border bg-muted/30">
            <TerritoryMap
              center={initialCenter}
              boundary={boundaryString}
              isDrawing
              drawMode="edit"
              initialDrawingRings={initialRings}
              onDrawingActions={setDrawingActions}
              onDrawingStateChange={(rings, points) => {
                setRingCount(rings);
                setActivePoints(points);
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}