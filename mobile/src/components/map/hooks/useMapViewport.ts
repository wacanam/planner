import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapCoordinate, MapRegion } from '../types';

const isWeb = typeof window !== 'undefined' && typeof window.location !== 'undefined';

const STORAGE_KEY_PREFIX = '@planner_map_viewport_';

export interface UseMapViewportOptions {
  /**
   * Unique storage key to scope the saved viewport (e.g. `assignment_${id}` or `territory_${id}`).
   * If not provided, state will not be persisted.
   */
  storageKey?: string | null;

  /**
   * Default fallback region if no saved state or boundary is available.
   */
  defaultRegion?: MapRegion;

  /**
   * Optional territory or boundary coordinates. If present and no saved viewport exists,
   * the map will calculate the bounding box for these coordinates.
   */
  boundaryCoordinates?: MapCoordinate[];

  /**
   * Debounce delay in milliseconds before saving region changes to storage (default: 400ms).
   */
  debounceMs?: number;

  /**
   * Whether to sync coordinates to URL query parameters on Web (default: true).
   */
  syncWebUrl?: boolean;
}

const defaultFallbackRegion: MapRegion = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

/**
 * Calculates a bounding box MapRegion from an array of coordinates.
 */
export function calculateRegionFromCoordinates(
  coordinates: MapCoordinate[],
  paddingRatio = 1.4,
  minDelta = 0.008
): MapRegion | null {
  if (!coordinates || coordinates.length === 0) return null;

  const validCoords = coordinates.filter(
    (c) =>
      typeof c.latitude === 'number' &&
      typeof c.longitude === 'number' &&
      !Number.isNaN(c.latitude) &&
      !Number.isNaN(c.longitude)
  );

  if (validCoords.length === 0) return null;

  const lats = validCoords.map((c) => c.latitude);
  const lngs = validCoords.map((c) => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latDelta = Math.max(minDelta, (maxLat - minLat) * paddingRatio);
  const lngDelta = Math.max(minDelta, (maxLng - minLng) * paddingRatio);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

/**
 * Parses viewport from Web URL query parameters if available.
 */
function getRegionFromUrl(): MapRegion | null {
  if (!isWeb) return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get('lat') || '');
    const lng = parseFloat(params.get('lng') || '');
    const latDelta = parseFloat(params.get('latDelta') || '');
    const lngDelta = parseFloat(params.get('lngDelta') || '');
    const zoom = parseFloat(params.get('z') || '');

    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      const calculatedLngDelta =
        !Number.isNaN(lngDelta) && lngDelta > 0
          ? lngDelta
          : !Number.isNaN(zoom) && zoom > 0
            ? 360 / 2 ** zoom
            : 0.01;
      const calculatedLatDelta =
        !Number.isNaN(latDelta) && latDelta > 0 ? latDelta : calculatedLngDelta;

      return {
        latitude: lat,
        longitude: lng,
        latitudeDelta: calculatedLatDelta,
        longitudeDelta: calculatedLngDelta,
      };
    }
  } catch {}

  return null;
}

export function useMapViewport(options: UseMapViewportOptions = {}) {
  const {
    storageKey,
    defaultRegion = defaultFallbackRegion,
    boundaryCoordinates = [],
    debounceMs = 400,
    syncWebUrl = true,
  } = options;

  const [savedRegion, setSavedRegion] = useState<MapRegion | null>(() => getRegionFromUrl());
  const [isRestored, setIsRestored] = useState(false);
  const [hasUserAdjusted, setHasUserAdjusted] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRegionRef = useRef<MapRegion | null>(null);

  // Compute bounding region from coordinates as an initial fallback
  const boundaryRegion = useMemo(() => {
    return calculateRegionFromCoordinates(boundaryCoordinates);
  }, [boundaryCoordinates]);

  // Load saved region from AsyncStorage on mount if not already restored from URL
  useEffect(() => {
    let isMounted = true;

    async function loadSavedRegion() {
      if (!storageKey) {
        if (isMounted) setIsRestored(true);
        return;
      }

      // If already loaded from URL on web, mark as restored
      const urlRegion = getRegionFromUrl();
      if (urlRegion) {
        if (isMounted) {
          setSavedRegion(urlRegion);
          setHasUserAdjusted(true);
          setIsRestored(true);
        }
        return;
      }

      try {
        const key = `${STORAGE_KEY_PREFIX}${storageKey}`;
        const raw = await AsyncStorage.getItem(key);
        if (raw && isMounted) {
          const parsed = JSON.parse(raw);
          if (
            typeof parsed?.latitude === 'number' &&
            typeof parsed?.longitude === 'number' &&
            !Number.isNaN(parsed.latitude) &&
            !Number.isNaN(parsed.longitude)
          ) {
            setSavedRegion(parsed);
            setHasUserAdjusted(true);
          }
        }
      } catch (err) {
        console.warn('Failed to restore map viewport:', err);
      } finally {
        if (isMounted) {
          setIsRestored(true);
        }
      }
    }

    loadSavedRegion();

    return () => {
      isMounted = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [storageKey]);

  // Debounced save callback for region changes
  const handleRegionChangeComplete = useCallback(
    (region: MapRegion) => {
      setHasUserAdjusted(true);
      lastSavedRegionRef.current = region;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        // 1. Save to AsyncStorage
        if (storageKey) {
          try {
            const key = `${STORAGE_KEY_PREFIX}${storageKey}`;
            await AsyncStorage.setItem(key, JSON.stringify(region));
          } catch (err) {
            console.warn('Failed to save map viewport:', err);
          }
        }

        // 2. Sync to Web URL query params (without adding new history entries)
        if (syncWebUrl && isWeb) {
          try {
            const url = new URL(window.location.href);
            const zoom = Math.max(
              1,
              Math.min(20, Math.round(Math.log2(360 / (region.longitudeDelta || 0.01))))
            );
            url.searchParams.set('lat', region.latitude.toFixed(6));
            url.searchParams.set('lng', region.longitude.toFixed(6));
            url.searchParams.set('latDelta', region.latitudeDelta.toFixed(6));
            url.searchParams.set('lngDelta', region.longitudeDelta.toFixed(6));
            url.searchParams.set('z', zoom.toString());

            const newUrl = `${url.pathname}?${url.searchParams.toString()}${url.hash}`;
            window.history.replaceState(null, '', newUrl);
          } catch {}
        }
      }, debounceMs);
    },
    [storageKey, debounceMs, syncWebUrl]
  );

  // Clear saved viewport for this key (e.g. when resetting or returning)
  const clearSavedViewport = useCallback(async () => {
    setSavedRegion(null);
    setHasUserAdjusted(false);

    if (storageKey) {
      try {
        const key = `${STORAGE_KEY_PREFIX}${storageKey}`;
        await AsyncStorage.removeItem(key);
      } catch (err) {
        console.warn('Failed to remove saved map viewport:', err);
      }
    }

    if (syncWebUrl && isWeb) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('lat');
        url.searchParams.delete('lng');
        url.searchParams.delete('latDelta');
        url.searchParams.delete('lngDelta');
        url.searchParams.delete('z');
        const newUrl = `${url.pathname}${url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''}${url.hash}`;
        window.history.replaceState(null, '', newUrl);
      } catch {}
    }
  }, [storageKey, syncWebUrl]);

  // Initial resolved region following the priority hierarchy:
  // 1. Saved / URL Region -> 2. Computed Boundary Region -> 3. Default Fallback Region
  const initialRegion = useMemo(() => {
    if (savedRegion) return savedRegion;
    if (boundaryRegion) return boundaryRegion;
    return defaultRegion;
  }, [savedRegion, boundaryRegion, defaultRegion]);

  return {
    initialRegion,
    isRestored,
    hasSavedState: Boolean(savedRegion),
    hasUserAdjusted,
    handleRegionChangeComplete,
    clearSavedViewport,
    boundaryRegion,
  };
}
