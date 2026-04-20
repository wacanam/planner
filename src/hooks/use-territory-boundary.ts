import { useState, useCallback } from 'react';

interface Boundary {
  type: 'MultiPolygon' | 'Polygon';
  coordinates: any;
}

interface UseTerritoryBoundaryReturn {
  boundary: Boundary | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchBoundary: (territoryId: string) => Promise<void>;
  saveBoundary: (territoryId: string, boundary: Boundary) => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing territory boundaries
 * Fetches and saves multi-polygon GeoJSON boundaries
 */
export function useTerritoryBoundary(): UseTerritoryBoundaryReturn {
  const [boundary, setBoundary] = useState<Boundary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const fetchBoundary = useCallback(async (territoryId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/territories/${territoryId}/boundary`);
      if (!res.ok) throw new Error('Failed to fetch boundary');
      const data = await res.json();
      setBoundary(data.boundary);
    } catch (err) {
      setError(String(err));
      console.error('[useTerritoryBoundary] Fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveBoundary = useCallback(async (territoryId: string, newBoundary: Boundary) => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/territories/${territoryId}/boundary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boundary: newBoundary }),
      });
      if (!res.ok) throw new Error('Failed to save boundary');
      const data = await res.json();
      setBoundary(data.boundary);
    } catch (err) {
      setError(String(err));
      console.error('[useTerritoryBoundary] Save failed:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    boundary,
    isLoading,
    isSaving,
    error,
    fetchBoundary,
    saveBoundary,
    clearError,
  };
}

/**
 * Validate GeoJSON geometry
 */
export function validateGeometry(geometry: any): boolean {
  if (!geometry || !geometry.type) return false;
  if (!['Polygon', 'MultiPolygon'].includes(geometry.type)) return false;
  if (!Array.isArray(geometry.coordinates)) return false;
  return true;
}

/**
 * Convert Leaflet Draw output to GeoJSON
 */
export function leafletDrawToGeoJSON(layers: any): Boundary | null {
  const features: any[] = [];

  layers.eachLayer((layer: any) => {
    if (layer.toGeoJSON) {
      features.push(layer.toGeoJSON());
    }
  });

  if (features.length === 0) return null;

  // Combine all polygons into MultiPolygon
  const coordinates = features
    .filter((f) => f.geometry.type === 'Polygon')
    .map((f) => f.geometry.coordinates);

  if (coordinates.length === 0) return null;

  return {
    type: 'MultiPolygon',
    coordinates,
  };
}

/**
 * Convert GeoJSON to Leaflet-compatible format
 */
export function geoJsonToLeafletFeatures(boundary: Boundary | null): any {
  if (!boundary) return { type: 'FeatureCollection', features: [] };

  if (boundary.type === 'Polygon') {
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: boundary,
        },
      ],
    };
  }

  if (boundary.type === 'MultiPolygon') {
    return {
      type: 'FeatureCollection',
      features: boundary.coordinates.map((coords: any) => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: coords,
        },
      })),
    };
  }

  return { type: 'FeatureCollection', features: [] };
}
