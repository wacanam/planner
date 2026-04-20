'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder';
import MapDrawer from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTerritoryBoundary, leafletDrawToGeoJSON, geoJsonToLeafletFeatures } from '@/hooks/use-territory-boundary';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface TerritoryBoundaryDrawerProps {
  territoryId: string;
  initialCenter?: [number, number];
  initialZoom?: number;
  onBoundarySaved?: () => void;
}

/**
 * Territory Boundary Drawing Component
 * - Service Overseers and Territory Servants can draw multi-polygon boundaries
 * - Uses MapLibre GL + Draw library
 * - Saves GeoJSON to database
 */
export function TerritoryBoundaryDrawer({
  territoryId,
  initialCenter = [0, 0],
  initialZoom = 12,
  onBoundarySaved,
}: TerritoryBoundaryDrawerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MapDrawer | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasBoundary, setHasBoundary] = useState(false);

  const { boundary, isLoading, isSaving, error, fetchBoundary, saveBoundary } = useTerritoryBoundary();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: initialCenter,
      zoom: initialZoom,
    });

    // Add geocoder
    const geocoder = new MaplibreGeocoder(
      {
        maplibregl: maplibregl,
      },
      {
        showResultsWhileTyping: true,
        minLength: 2,
      }
    );
    map.current.addControl(geocoder);

    // Add draw control
    draw.current = new MapDrawer({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
        combine_features: true,
        uncombine_features: true,
      },
    });
    map.current.addControl(draw.current);

    // Load existing boundary
    fetchBoundary(territoryId);

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [territoryId, initialCenter, initialZoom, fetchBoundary]);

  // Display boundary on map when loaded
  useEffect(() => {
    if (!boundary || !map.current || !draw.current) return;

    const features = geoJsonToLeafletFeatures(boundary);
    if (features.features.length > 0) {
      draw.current.set({
        features: features.features,
      });
      setHasBoundary(true);
    }
  }, [boundary]);

  // Handle drawing changes
  const handleDrawUpdate = () => {
    if (!draw.current) return;
    const data = draw.current.getAll();
    if (data.features.length > 0) {
      setHasBoundary(true);
    } else {
      setHasBoundary(false);
    }
  };

  // Save boundary
  const handleSave = async () => {
    if (!draw.current) return;

    const data = draw.current.getAll();
    if (data.features.length === 0) {
      alert('Please draw at least one polygon');
      return;
    }

    try {
      // Convert to MultiPolygon GeoJSON
      const coordinates: any[] = [];
      for (const feature of data.features) {
        if (feature.geometry.type === 'Polygon') {
          coordinates.push(feature.geometry.coordinates);
        }
      }

      if (coordinates.length === 0) {
        alert('No valid polygons found');
        return;
      }

      const geoJson = {
        type: coordinates.length === 1 ? 'Polygon' : 'MultiPolygon',
        coordinates: coordinates.length === 1 ? coordinates[0] : coordinates,
      };

      await saveBoundary(territoryId, geoJson);
      alert('Boundary saved successfully!');
      onBoundarySaved?.();
    } catch (err) {
      console.error('Failed to save boundary:', err);
    }
  };

  // Clear drawing
  const handleClear = () => {
    if (!draw.current) return;
    draw.current.deleteAll();
    setHasBoundary(false);
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h3 className="font-semibold">Territory Boundary Editor</h3>
          <p className="text-sm text-gray-600">Draw multi-polygon boundaries for this territory</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsDrawing(!isDrawing)}
            variant={isDrawing ? 'default' : 'outline'}
            disabled={isSaving}
          >
            {isDrawing ? 'Drawing...' : 'Draw'}
          </Button>
          <Button
            onClick={handleClear}
            variant="outline"
            disabled={!hasBoundary || isSaving}
          >
            Clear
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasBoundary || isSaving}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSaving ? 'Saving...' : 'Save Boundary'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="p-4 text-center text-gray-500">
          Loading boundary...
        </div>
      )}

      <div
        ref={mapContainer}
        className="flex-1 bg-gray-100"
        onMouseEnter={() => handleDrawUpdate()}
      />

      <div className="p-4 border-t text-sm text-gray-600 bg-gray-50">
        <p>💡 <strong>Instructions:</strong></p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Click the <strong>Draw</strong> button to start drawing polygons</li>
          <li>Click on the map to create polygon points</li>
          <li>Double-click to finish a polygon</li>
          <li>Draw multiple polygons for multi-territory coverage</li>
          <li>Click <strong>Save Boundary</strong> to store your work</li>
        </ul>
      </div>
    </Card>
  );
}
