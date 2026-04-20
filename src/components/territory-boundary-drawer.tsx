'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTerritoryBoundary } from '@/hooks/use-territory-boundary';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, Save, MapPin, AlertCircle } from 'lucide-react';

interface TerritoryBoundaryDrawerProps {
  territoryId: string;
  initialCenter?: [number, number];
  initialZoom?: number;
  onBoundarySaved?: () => void;
}

type DrawPoint = [number, number];
type DrawPolygon = DrawPoint[];

const MIN_POINTS_PER_POLYGON = 3;
const DOUBLE_CLICK_THRESHOLD = 300;
const MAP_LAYER_IDS = {
  drawingPoints: 'drawing-points',
  drawingLines: 'drawing-lines',
  completedPolygons: 'completed-polygons',
  pointsSource: 'drawing-points-source',
  linesSource: 'drawing-lines-source',
  polygonsSource: 'completed-polygons-source',
};

/**
 * Territory Boundary Drawing Component
 * 
 * Features:
 * - Interactive point-based polygon drawing
 * - Live preview on MapLibre GL
 * - Multi-polygon support
 * - Keyboard shortcuts (Escape to cancel, Enter to finish)
 * - Touch-friendly with visual feedback
 * - Comprehensive error handling
 * 
 * Interaction Model:
 * - Click to add points
 * - Double-click to finish polygon (min 3 points)
 * - Escape key to clear current polygon
 * - Draw multiple polygons for multi-territory coverage
 */
export function TerritoryBoundaryDrawer({
  territoryId,
  initialCenter = [0, 0],
  initialZoom = 13,
  onBoundarySaved,
}: TerritoryBoundaryDrawerProps) {
  // DOM references
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  // Drawing state
  const [polygons, setPolygons] = useState<DrawPolygon[]>([]);
  const [currentPoints, setCurrentPoints] = useState<DrawPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Interaction state
  const lastClickTimeRef = useRef<number>(0);
  const { fetchBoundary, saveBoundary } = useTerritoryBoundary();

  /**
   * Initialize MapLibre and drawing layers
   */
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://demotiles.maplibre.org/style.json',
        center: initialCenter,
        zoom: initialZoom,
      });

      map.current.once('load', () => {
        if (!map.current) return;
        setupDrawingLayers();
        setMapReady(true);
        fetchBoundary(territoryId);
      });

      map.current.once('error', (e) => {
        console.error('[TerritoryBoundaryDrawer] Map error:', e);
        setError('Failed to load map. Please refresh.');
      });
    } catch (err) {
      console.error('[TerritoryBoundaryDrawer] Init error:', err);
      setError('Failed to initialize map');
    }

    return () => {
      if (map.current) {
        map.current.off('click', handleMapClick);
        map.current.remove();
        map.current = null;
      }
    };
  }, [territoryId, initialCenter, initialZoom, fetchBoundary]);

  /**
   * Setup all drawing layers and sources
   */
  const setupDrawingLayers = useCallback(() => {
    if (!map.current) return;

    // Completed polygons (fill + outline)
    map.current.addSource(MAP_LAYER_IDS.polygonsSource, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    map.current.addLayer({
      id: `${MAP_LAYER_IDS.completedPolygons}-fill`,
      type: 'fill',
      source: MAP_LAYER_IDS.polygonsSource,
      paint: {
        'fill-color': '#10b981',
        'fill-opacity': 0.3,
      },
    });

    map.current.addLayer({
      id: `${MAP_LAYER_IDS.completedPolygons}-outline`,
      type: 'line',
      source: MAP_LAYER_IDS.polygonsSource,
      paint: {
        'line-color': '#059669',
        'line-width': 2.5,
      },
    });

    // Current polygon lines
    map.current.addSource(MAP_LAYER_IDS.linesSource, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    map.current.addLayer({
      id: MAP_LAYER_IDS.drawingLines,
      type: 'line',
      source: MAP_LAYER_IDS.linesSource,
      paint: {
        'line-color': '#3b82f6',
        'line-width': 2,
        'line-opacity': 0.8,
      },
    });

    // Current points
    map.current.addSource(MAP_LAYER_IDS.pointsSource, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    map.current.addLayer({
      id: MAP_LAYER_IDS.drawingPoints,
      type: 'circle',
      source: MAP_LAYER_IDS.pointsSource,
      paint: {
        'circle-radius': 6,
        'circle-color': '#3b82f6',
        'circle-opacity': 0.9,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    });

    // Change cursor on hover
    map.current.on('mouseenter', MAP_LAYER_IDS.drawingPoints, () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', MAP_LAYER_IDS.drawingPoints, () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });

    // Add click handler
    map.current.on('click', handleMapClick);
  }, []);

  /**
   * Handle map clicks for drawing points
   */
  const handleMapClick = (e: maplibregl.MapMouseEvent) => {
    if (!isDrawing || !map.current) return;

    const now = Date.now();
    const isDoubleClick = now - lastClickTimeRef.current < DOUBLE_CLICK_THRESHOLD;
    lastClickTimeRef.current = now;

    try {
      const [lng, lat] = [e.lngLat.lng, e.lngLat.lat];
      const newPoint: DrawPoint = [lng, lat];

      setCurrentPoints((prev) => {
        const updated = [...prev, newPoint];

        if (isDoubleClick && updated.length >= MIN_POINTS_PER_POLYGON) {
          finishPolygon(updated);
          return [];
        }

        return updated;
      });
    } catch (err) {
      console.error('[TerritoryBoundaryDrawer] Click handling error:', err);
      setError('Error adding point. Please try again.');
    }
  };

  /**
   * Finish and save current polygon
   */
  const finishPolygon = (points: DrawPoint[]) => {
    if (points.length < MIN_POINTS_PER_POLYGON) {
      setError(`Polygon must have at least ${MIN_POINTS_PER_POLYGON} points`);
      return;
    }

    setPolygons((prev) => [...prev, points]);
    setCurrentPoints([]);
    setError(null);
  };

  /**
   * Update map visualization when polygons or points change
   */
  useEffect(() => {
    if (!map.current || !mapReady) return;

    try {
      // Update completed polygons
      const completedFeatures = polygons.map((polygon) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[...polygon, polygon[0]]],
        },
        properties: { filled: true },
      }));

      const source = map.current.getSource(MAP_LAYER_IDS.polygonsSource) as any;
      if (source?.setData) {
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
        properties: { index: currentPoints.indexOf(point) },
      }));

      const pointSource = map.current.getSource(MAP_LAYER_IDS.pointsSource) as any;
      if (pointSource?.setData) {
        pointSource.setData({
          type: 'FeatureCollection',
          features: pointFeatures,
        });
      }

      // Update current lines
      if (currentPoints.length > 1) {
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

        const lineSource = map.current.getSource(MAP_LAYER_IDS.linesSource) as any;
        if (lineSource?.setData) {
          lineSource.setData({
            type: 'FeatureCollection',
            features: lineFeatures,
          });
        }
      }
    } catch (err) {
      console.error('[TerritoryBoundaryDrawer] Visualization update error:', err);
    }
  }, [polygons, currentPoints, mapReady]);

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!isDrawing) return;

      if (e.key === 'Escape') {
        setCurrentPoints([]);
        setError(null);
      } else if (e.key === 'Enter' && currentPoints.length >= MIN_POINTS_PER_POLYGON) {
        finishPolygon(currentPoints);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isDrawing, currentPoints]);

  /**
   * Save boundary to database
   */
  const handleSave = async () => {
    if (polygons.length === 0) {
      setError('Please draw at least one polygon');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const geoJson =
        polygons.length === 1
          ? {
              type: 'Polygon' as const,
              coordinates: [
                [...polygons[0], polygons[0][0]], // Close ring
              ],
            }
          : {
              type: 'MultiPolygon' as const,
              coordinates: polygons.map((polygon) => [
                [...polygon, polygon[0]], // Close each ring
              ]),
            };

      await saveBoundary(territoryId, geoJson);
      setPolygons([]);
      setCurrentPoints([]);
      onBoundarySaved?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to save: ${message}`);
      console.error('[TerritoryBoundaryDrawer] Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Clear current polygon
   */
  const handleClearCurrent = () => {
    setCurrentPoints([]);
    setError(null);
  };

  /**
   * Clear all polygons
   */
  const handleClearAll = () => {
    setPolygons([]);
    setCurrentPoints([]);
    setError(null);
  };

  /**
   * Toggle drawing mode
   */
  const handleToggleDrawing = () => {
    setIsDrawing(!isDrawing);
    if (isDrawing) {
      handleClearAll();
    }
  };

  return (
    <Card className="w-full h-full flex flex-col bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
          <MapPin className="w-4 h-4 text-blue-600" />
          Draw Territory Boundary
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {isDrawing
            ? currentPoints.length === 0
              ? '👆 Click on map to add points'
              : `📍 ${currentPoints.length} points • 🖱️ Double-click to finish`
            : '⏸️ Click "Start Drawing" to begin'}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900 flex gap-3">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Map Container */}
      <div className="flex-1 min-h-0 relative bg-gray-100 dark:bg-gray-900">
        <div ref={mapContainer} className="w-full h-full" />

        {/* Drawing Status Overlay */}
        {isDrawing && (
          <div className="absolute bottom-4 left-4 z-10 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-xs">
            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Drawing Mode
            </div>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300 mb-4">
              <div className="flex justify-between">
                <span>✏️ Polygons:</span>
                <span className="font-semibold">{polygons.length}</span>
              </div>
              <div className="flex justify-between">
                <span>📍 Points:</span>
                <span className="font-semibold">{currentPoints.length}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Button
                onClick={handleClearCurrent}
                disabled={currentPoints.length === 0}
                size="sm"
                variant="outline"
                className="w-full"
              >
                Clear Current
              </Button>
              <Button
                onClick={handleClearAll}
                disabled={polygons.length === 0 && currentPoints.length === 0}
                size="sm"
                variant="destructive"
                className="w-full"
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-4 flex gap-2">
        <Button
          onClick={handleToggleDrawing}
          disabled={!mapReady}
          variant={isDrawing ? 'destructive' : 'default'}
          className="flex-1"
        >
          {isDrawing ? '⏹️ Stop Drawing' : '▶️ Start Drawing'}
        </Button>
        <Button
          onClick={handleSave}
          disabled={polygons.length === 0 || isSaving || !mapReady}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Boundary'}
        </Button>
      </div>

      {/* Instructions */}
      {!isDrawing && mapReady && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border-t border-blue-200 dark:border-blue-900 text-sm text-blue-900 dark:text-blue-100 space-y-2">
          <div className="font-semibold">📍 How to Draw:</div>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Click <strong>"Start Drawing"</strong> button</li>
            <li>Click on the map to add boundary points</li>
            <li><strong>Double-click</strong> to finish polygon (min 3 points)</li>
            <li>Or press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Enter</kbd> to finish</li>
            <li>Draw multiple polygons for multi-territory coverage</li>
            <li>Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Esc</kbd> to cancel current</li>
          </ol>
          <p className="text-xs mt-3 opacity-75">
            💡 <strong>Tip:</strong> Completed polygons appear in green. Current points in blue.
          </p>
        </div>
      )}
    </Card>
  );
}
