import { useState, useCallback } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';

type GeoJSONPosition = [number, number, ...number[]];
export type GeoJSONGeometry =
  | { type: 'Polygon'; coordinates: GeoJSONPosition[][] }
  | { type: 'MultiPolygon'; coordinates: GeoJSONPosition[][][] };

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
  clearBoundary: (territoryId: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing territory boundaries
 * 
 * Handles:
 * - Fetching existing boundaries from Firestore
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

  const territoryDocument = useCallback(
    (territoryId: string) => doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.territories, territoryId),
    []
  );

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
      const snapshot = await getDoc(territoryDocument(territoryId));
      const rawBoundary = snapshot.exists()
        ? ((snapshot.data().boundary ?? null) as string | GeoJSONGeometry | null)
        : null;
      const data = {
        boundary:
          typeof rawBoundary === 'string'
            ? ((JSON.parse(rawBoundary) as GeoJSONGeometry | null) ?? null)
            : rawBoundary,
      };

      if (data.boundary) {
        // Validate boundary structure
        if (validateGeoJSON(data.boundary)) {
          setBoundary(data.boundary);
        } else {
          setError('Invalid boundary data received from server');
          console.warn('[useTerritoryBoundary] Invalid GeoJSON:', data.boundary);
        }
      } else {
        setBoundary(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // "Not found" means the territory exists but has no boundary yet — treat as empty
      if (message.toLowerCase().includes('not found')) {
        setBoundary(null);
      } else {
        // Surface unexpected errors (network failures, server errors, etc.)
        setError(`Failed to fetch boundary: ${message}`);
        console.error('[useTerritoryBoundary] Fetch error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [territoryDocument]);

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
        await updateDoc(territoryDocument(territoryId), {
          boundary: JSON.stringify(newBoundary),
          updatedAt: nowIso(),
        });
        const data = { boundary: newBoundary };

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
    [territoryDocument]
  );

  /**
   * Clear the boundary for a territory (sets it to null in the DB)
   */
  const clearBoundary = useCallback(
    async (territoryId: string) => {
      if (!territoryId) {
        throw new Error('Territory ID is required');
      }

      setIsSaving(true);
      setError(null);

      try {
        await updateDoc(territoryDocument(territoryId), { boundary: null, updatedAt: nowIso() });
        setBoundary(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(`Failed to clear boundary: ${message}`);
        console.error('[useTerritoryBoundary] Clear error:', err);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [territoryDocument]
  );

  return {
    boundary,
    isLoading,
    isSaving,
    error,
    fetchBoundary,
    saveBoundary,
    clearBoundary,
    clearError,
  };
}

/**
 * Validate GeoJSON Polygon or MultiPolygon geometry
 * 
 * @param geometry - GeoJSON geometry to validate
 * @returns true if valid, false otherwise
 */
export function validateGeoJSON(geometry: unknown): geometry is GeoJSONGeometry {
  if (!geometry || typeof geometry !== 'object') return false;

  const { type, coordinates } = geometry as { type?: unknown; coordinates?: unknown };

  if (typeof type !== 'string' || !['Polygon', 'MultiPolygon'].includes(type)) {
    return false;
  }

  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return false;
  }

  // Validate Polygon
  if (type === 'Polygon') {
    const rings = coordinates as unknown[];
    return isLinearRing(rings[0]);
  }

  // Validate MultiPolygon
  if (type === 'MultiPolygon') {
    const polygons = coordinates as unknown[];
    return polygons.every((polygon) => Array.isArray(polygon) && isLinearRing(polygon[0]));
  }

  return false;
}

function isPosition(value: unknown): value is GeoJSONPosition {
  return Array.isArray(value) && value.length >= 2 && value.every((part) => typeof part === 'number');
}

function isLinearRing(value: unknown): value is GeoJSONPosition[] {
  return Array.isArray(value) && value.length >= 4 && value.every(isPosition);
}

