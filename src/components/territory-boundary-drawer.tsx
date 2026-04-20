'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTerritoryBoundary } from '@/hooks/use-territory-boundary';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface TerritoryBoundaryDrawerProps {
  territoryId: string;
  initialCenter?: [number, number];
  initialZoom?: number;
  onBoundarySaved?: () => void;
}

/**
 * Territory Boundary Drawing Component (Simplified)
 * - Service Overseers and Territory Servants can draw boundaries
 * - Uses MapLibre GL for map display
 * - GeoJSON input/output
 * 
 * TODO: Integrate with drawing library (Mapbox Draw or Leaflet Draw)
 * Currently simplified to map display + manual GeoJSON input
 */
export function TerritoryBoundaryDrawer({
  territoryId,
  initialCenter = [0, 0],
  initialZoom = 12,
  onBoundarySaved,
}: TerritoryBoundaryDrawerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [geoJsonInput, setGeoJsonInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { fetchBoundary, saveBoundary } = useTerritoryBoundary();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: initialCenter,
      zoom: initialZoom,
    });

    // Load existing boundary
    fetchBoundary(territoryId).then(() => {
      // Boundary loaded, can be displayed on map
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [territoryId, initialCenter, initialZoom, fetchBoundary]);

  // Save boundary
  const handleSave = async () => {
    if (!geoJsonInput.trim()) {
      setError('Please paste valid GeoJSON');
      return;
    }

    try {
      const geoJson = JSON.parse(geoJsonInput);

      // Validate GeoJSON
      if (!geoJson.type || !['Polygon', 'MultiPolygon'].includes(geoJson.type)) {
        setError('GeoJSON must be Polygon or MultiPolygon');
        return;
      }

      setIsSaving(true);
      setError(null);
      await saveBoundary(territoryId, geoJson);
      setGeoJsonInput('');
      alert('Boundary saved successfully!');
      onBoundarySaved?.();
    } catch (err) {
      setError(String(err));
      console.error('Failed to save boundary:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <div className="p-4 border-b">
        <div>
          <h3 className="font-semibold">Territory Boundary Editor</h3>
          <p className="text-sm text-gray-600">Paste GeoJSON multi-polygon boundary</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 p-4 flex-1 overflow-auto">
        {/* Map display */}
        <div className="h-48 bg-gray-100 rounded border">
          <div
            ref={mapContainer}
            className="w-full h-full"
          />
        </div>

        {/* GeoJSON input */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">GeoJSON Boundary</label>
          <textarea
            value={geoJsonInput}
            onChange={(e) => setGeoJsonInput(e.target.value)}
            placeholder='{"type":"MultiPolygon","coordinates":[...]}'
            className="w-full h-32 p-3 border rounded font-mono text-xs"
          />
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded">
          <p className="font-semibold mb-1">📝 Instructions:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Paste valid GeoJSON (Polygon or MultiPolygon)</li>
            <li>Use tools like <a href="https://geojson.io" className="underline text-blue-600">geojson.io</a> to draw boundaries</li>
            <li>Copy GeoJSON and paste above</li>
            <li>Click Save to store</li>
          </ul>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving || !geoJsonInput.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSaving ? 'Saving...' : 'Save Boundary'}
          </Button>
          <Button
            onClick={() => setGeoJsonInput('')}
            variant="outline"
          >
            Clear
          </Button>
        </div>
      </div>
    </Card>
  );
}
