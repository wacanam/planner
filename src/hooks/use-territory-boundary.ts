import { useState, useCallback } from 'react';

/**
 * GeoJSON Polygon or MultiPolygon geometry
 */
export interface GeoJSONGeometry {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

/**
 * Territory boundary with metadata
 */
export interface TerritoryBoundary {
  geometry: GeoJSONGeometry;
  updatedAt?: string;
}

/**
 * Hook return type
 */
export interface UseTerritoryBoundaryReturn {
  boundary: GeoJSONGeometry | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchBoundary: (territoryId: string) => Promise<void>;
  saveBoundary: (territoryId: string, boundary: GeoJSONGeometry) => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing territory boundaries
 * 
 * Handles:
 * - Fetching existing boundaries from API
 * - Saving new boundaries as GeoJSON
 * - Error handling and state management
 * - Loading states for async operations
 */
export function useTerritoryBoundary(): UseTerritoryBoundaryReturn {
  const [boundary, setBoundary] = useState<GeoJSONGeometry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Fetch existing boundary from server
   */
  const fetchBoundary = useCallback(async (territoryId: string) => {
    if (!territoryId) {
      setError('Territory ID is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/territories/${territoryId}/boundary`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No boundary yet, that's fine
          setBoundary(null);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.boundary) {
        // Validate boundary structure
        if (validateGeoJSON(data.boundary)) {
          setBoundary(data.boundary);
        } else {
          setError('Invalid boundary data received from server');
          console.warn('[useTerritoryBoundary] Invalid GeoJSON:', data.boundary);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to fetch boundary: ${message}`);
      console.error('[useTerritoryBoundary] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Save boundary to server
   */
  const saveBoundary = useCallback(
    async (territoryId: string, newBoundary: GeoJSONGeometry) => {
      if (!territoryId) {
        throw new Error('Territory ID is required');
      }

      if (!validateGeoJSON(newBoundary)) {
        throw new Error('Invalid boundary geometry');
      }

      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch(`/api/territories/${territoryId}/boundary`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ boundary: newBoundary }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const message = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
          throw new Error(message);
        }

        const data = await response.json();
        if (data.boundary && validateGeoJSON(data.boundary)) {
          setBoundary(data.boundary);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(`Failed to save boundary: ${message}`);
        console.error('[useTerritoryBoundary] Save error:', err);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

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
 * Validate GeoJSON Polygon or MultiPolygon geometry
 * 
 * @param geometry - GeoJSON geometry to validate
 * @returns true if valid, false otherwise
 */
export function validateGeoJSON(geometry: any): geometry is GeoJSONGeometry {
  if (!geometry || typeof geometry !== 'object') return false;

  const { type, coordinates } = geometry;

  if (!['Polygon', 'MultiPolygon'].includes(type)) {
    return false;
  }

  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return false;
  }

  // Validate Polygon
  if (type === 'Polygon') {
    const rings = coordinates as number[][][];
    if (!Array.isArray(rings[0]) || !Array.isArray(rings[0][0])) {
      return false;
    }
    // Check min 3 points per ring
    if (rings[0].length < 4) return false; // 3 unique + 1 closing
    return true;
  }

  // Validate MultiPolygon
  if (type === 'MultiPolygon') {
    const polygons = coordinates as number[][][][];
    return polygons.every((poly) => {
      if (!Array.isArray(poly[0]) || !Array.isArray(poly[0][0])) {
        return false;
      }
      return poly[0].length >= 4; // 3 unique + 1 closing
    });
  }

  return false;
}

/**
 * Convert Leaflet Draw output to GeoJSON MultiPolygon
 * (Kept for backwards compatibility)
 */
export function leafletDrawToGeoJSON(layers: any): GeoJSONGeometry | null {
  const features: any[] = [];

  try {
    layers.eachLayer((layer: any) => {
      if (layer.toGeoJSON) {
        features.push(layer.toGeoJSON());
      }
    });

    if (features.length === 0) return null;

    const coordinates = features
      .filter((f) => f.geometry?.type === 'Polygon')
      .map((f) => f.geometry.coordinates);

    if (coordinates.length === 0) return null;

    return {
      type: 'MultiPolygon',
      coordinates,
    };
  } catch (err) {
    console.error('[leafletDrawToGeoJSON] Error:', err);
    return null;
  }
}

/**
 * Convert GeoJSON to GeoJSON FeatureCollection
 * (Kept for backwards compatibility with visualization)
 */
export function geoJsonToLeafletFeatures(
  boundary: GeoJSONGeometry | null
): GeoJSON.FeatureCollection {
  if (!boundary) {
    return { type: 'FeatureCollection', features: [] };
  }

  if (boundary.type === 'Polygon') {
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: boundary,
          properties: {},
        } as any,
      ],
    };
  }

  if (boundary.type === 'MultiPolygon') {
    return {
      type: 'FeatureCollection',
      features: (boundary.coordinates as number[][][][]).map((coords) => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: coords,
        },
        properties: {},
      })) as any,
    };
  }

  return { type: 'FeatureCollection', features: [] };
}
