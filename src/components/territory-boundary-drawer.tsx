'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTerritoryBoundary } from '@/hooks/use-territory-boundary';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, Save, MapPin } from 'lucide-react';

interface TerritoryBoundaryDrawerProps {
  territoryId: string;
  initialCenter?: [number, number];
  initialZoom?: number;
  onBoundarySaved?: () => void;
}

type DrawPoint = [number, number];
type DrawPolygon = DrawPoint[];

/**
 * Territory Boundary Drawing Component
 * - Click on map to add points
 * - Double-click to finish polygon
 * - Draw multiple polygons for multi-polygon
 * - Live preview on map
 * - Save GeoJSON to database
 */
export function TerritoryBoundaryDrawer({
  territoryId,
  initialCenter = [0, 0],
  initialZoom = 13,
  onBoundarySaved,
}: TerritoryBoundaryDrawerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [polygons, setPolygons] = useState<DrawPolygon[]>([]);
  const [currentPoints, setCurrentPoints] = useState<DrawPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastClickTimeRef = useRef<number>(0);

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

    // Add drawing source and layers
    map.current.on('load', () => {
      if (!map.current) return;

      // Current points layer
      map.current.addSource('drawing-points', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      map.current.addLayer({
        id: 'drawing-points-layer',
        type: 'circle',
        source: 'drawing-points',
        paint: {
          'circle-radius': 5,
          'circle-color': '#3b82f6',
          'circle-opacity': 0.8,
        },
      });

      // Current lines layer
      map.current.addSource('drawing-lines', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      map.current.addLayer({
        id: 'drawing-lines-layer',
        type: 'line',
        source: 'drawing-lines',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
          'line-opacity': 0.6,
        },
      });

      // Completed polygons layer
      map.current.addSource('completed-polygons', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      map.current.addLayer({
        id: 'completed-polygons-fill',
        type: 'fill',
        source: 'completed-polygons',
        paint: {
          'fill-color': '#10b981',
          'fill-opacity': 0.3,
        },
      });

      map.current.addLayer({
        id: 'completed-polygons-line',
        type: 'line',
        source: 'completed-polygons',
        paint: {
          'line-color': '#10b981',
          'line-width': 2,
        },
      });

      // Load existing boundary
      fetchBoundary(territoryId);
    });

    // Map click handler
    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      if (!isDrawing || !map.current) return;

      const now = Date.now();
      const isDoubleClick = now - lastClickTimeRef.current < 300;
      lastClickTimeRef.current = now;

      const [lng, lat] = [e.lngLat.lng, e.lngLat.lat];
      const newPoints = [...currentPoints, [lng, lat] as DrawPoint];

      if (isDoubleClick && newPoints.length >= 3) {
        // Finish polygon
        finishPolygon(newPoints);
      } else {
        setCurrentPoints(newPoints);
      }
    };

    if (map.current) {
      map.current.on('click', handleMapClick);
    }

    return () => {
      if (map.current) {
        map.current.off('click', handleMapClick);
        map.current.remove();
      }
    };
  }, [isDrawing, territoryId, fetchBoundary, initialCenter, initialZoom]);

  // Update map visualization
  useEffect(() => {
    if (!map.current) return;

    // Update completed polygons
    const completedFeatures = polygons.map((polygon) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[...polygon, polygon[0]]],
      },
      properties: {},
    }));

    const source = map.current.getSource('completed-polygons') as any;
    if (source && 'setData' in source) {
      source.setData({
        type: 'FeatureCollection',
        features: completedFeatures,
      });
    }

    // Update current points
    const pointFeatures = currentPoints.map((point) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: point,
      },
      properties: {},
    }));

    const pointSource = map.current.getSource('drawing-points') as any;
    if (pointSource && 'setData' in pointSource) {
      pointSource.setData({
        type: 'FeatureCollection',
        features: pointFeatures,
      });
    }

    // Update current lines
    if (currentPoints.length > 0) {
      const lineFeatures = [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: currentPoints,
          },
          properties: {},
        },
      ];

      const lineSource = map.current.getSource('drawing-lines') as any;
      if (lineSource && 'setData' in lineSource) {
        lineSource.setData({
          type: 'FeatureCollection',
          features: lineFeatures,
        });
      }
    }
  }, [polygons, currentPoints]);

  const finishPolygon = (points: DrawPoint[]) => {
    if (points.length < 3) {
      setError('Polygon must have at least 3 points');
      return;
    }
    setPolygons([...polygons, points]);
    setCurrentPoints([]);
    setError(null);
  };

  const handleClearCurrent = () => {
    setCurrentPoints([]);
    setError(null);
  };

  const handleClearAll = () => {
    setPolygons([]);
    setCurrentPoints([]);
    setError(null);
  };

  const handleSave = async () => {
    if (polygons.length === 0) {
      setError('Please draw at least one polygon');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Create GeoJSON
      const geoJson =
        polygons.length === 1
          ? {
              type: 'Polygon' as const,
              coordinates: [
                [...polygons[0], polygons[0][0]], // Close the ring
              ],
            }
          : {
              type: 'MultiPolygon' as const,
              coordinates: polygons.map((polygon) => [
                [...polygon, polygon[0]], // Close each ring
              ]),
            };

      await saveBoundary(territoryId, geoJson);
      alert('✅ Boundary saved successfully!');
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
      {/* Header */}
      <div className="p-4 border-b">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Draw Territory Boundary
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {isDrawing
              ? currentPoints.length === 0
                ? 'Click on map to add points'
                : `${currentPoints.length} points • Double-click to finish`
              : 'Click "Start Drawing" to begin'}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200 text-red-700 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Map */}
      <div className="flex-1 min-h-0 relative">
        <div ref={mapContainer} className="w-full h-full" />

        {/* Drawing Controls Overlay */}
        {isDrawing && (
          <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4 max-w-xs">
            <div className="text-sm font-semibold mb-3">Drawing Status</div>
            <div className="space-y-2 text-sm text-gray-700 mb-4">
              <div>✏️ Polygons: {polygons.length}</div>
              <div>📍 Current points: {currentPoints.length}</div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleClearCurrent}
                disabled={currentPoints.length === 0}
                size="sm"
                variant="outline"
              >
                Clear Current
              </Button>
              <Button onClick={handleClearAll} size="sm" variant="destructive">
                <Trash2 className="w-3 h-3 mr-1" />
                Clear All
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="border-t p-4 flex gap-2">
        <Button
          onClick={() => setIsDrawing(!isDrawing)}
          variant={isDrawing ? 'destructive' : 'default'}
          className="flex-1"
        >
          {isDrawing ? 'Stop Drawing' : 'Start Drawing'}
        </Button>
        <Button
          onClick={handleSave}
          disabled={polygons.length === 0 || isSaving}
          className="bg-green-600 hover:bg-green-700 flex-1"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Boundary'}
        </Button>
      </div>

      {/* Instructions */}
      {!isDrawing && (
        <div className="p-4 bg-blue-50 border-t text-sm text-blue-900 space-y-2">
          <div className="font-semibold">📍 How to Draw:</div>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Click "Start Drawing"</li>
            <li>Click on the map to add points around your territory</li>
            <li>Double-click to finish the polygon (min. 3 points)</li>
            <li>Draw more polygons for multi-territory coverage</li>
            <li>Click "Save Boundary" when done</li>
          </ol>
        </div>
      )}
    </Card>
  );
}
