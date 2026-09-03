'use client';

import { useCallback, useEffect, useState } from 'react';

export type BasemapMode = 'satellite' | 'street';

export const DEFAULT_BASEMAP_MODE: BasemapMode = 'satellite';

const BASEMAP_STORAGE_KEY = 'planner_preferred_basemap';

/**
 * Retrieve the saved basemap preference from localStorage.
 * Defaults to 'satellite' if unset or invalid.
 */
export function getSavedBasemapPreference(): BasemapMode {
  if (typeof window === 'undefined') return DEFAULT_BASEMAP_MODE;
  try {
    const item = window.localStorage.getItem(BASEMAP_STORAGE_KEY);
    if (item === 'satellite' || item === 'street') {
      return item;
    }
    return DEFAULT_BASEMAP_MODE;
  } catch {
    return DEFAULT_BASEMAP_MODE;
  }
}

/**
 * Save the basemap preference to localStorage.
 */
export function saveBasemapPreference(mode: BasemapMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BASEMAP_STORAGE_KEY, mode);
  } catch (err) {
    console.error('Failed to save basemap preference:', err);
  }
}

/**
 * React hook to manage basemap mode with persistence in localStorage.
 * Defaults to 'satellite' and updates localStorage whenever changed.
 */
export function useBasemapPreference(
  initialFallback: BasemapMode = DEFAULT_BASEMAP_MODE
): [BasemapMode, (mode: BasemapMode) => void] {
  const [mode, setModeState] = useState<BasemapMode>(() => {
    return getSavedBasemapPreference() || initialFallback;
  });

  // Synchronize from localStorage on mount in case of SSR hydration
  useEffect(() => {
    const saved = getSavedBasemapPreference();
    if (saved && saved !== mode) {
      setModeState(saved);
    }
  }, []);

  const setMode = useCallback((newMode: BasemapMode) => {
    setModeState(newMode);
    saveBasemapPreference(newMode);
  }, []);

  return [mode, setMode];
}

export interface MapViewportPreference {
  lat: number;
  lng: number;
  zoom: number;
  heading?: number;
  tilt?: number;
}

const VIEWPORT_STORAGE_PREFIX = 'planner_map_viewport_';

/**
 * Retrieve the saved viewport preference from localStorage for a specific map key.
 */
export function getSavedViewportPreference(storageKey: string): MapViewportPreference | null {
  if (typeof window === 'undefined' || !storageKey) return null;
  try {
    const raw = window.localStorage.getItem(`${VIEWPORT_STORAGE_PREFIX}${storageKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.lat === 'number' &&
      typeof parsed?.lng === 'number' &&
      !Number.isNaN(parsed.lat) &&
      !Number.isNaN(parsed.lng)
    ) {
      return {
        lat: parsed.lat,
        lng: parsed.lng,
        zoom: typeof parsed.zoom === 'number' && !Number.isNaN(parsed.zoom) ? parsed.zoom : 16,
        heading:
          typeof parsed.heading === 'number' && !Number.isNaN(parsed.heading) ? parsed.heading : 0,
        tilt: typeof parsed.tilt === 'number' && !Number.isNaN(parsed.tilt) ? parsed.tilt : 0,
      };
    }
  } catch {}
  return null;
}

/**
 * Save the viewport preference to localStorage for a specific map key.
 */
export function saveViewportPreference(
  storageKey: string,
  viewport: MapViewportPreference
): void {
  if (typeof window === 'undefined' || !storageKey) return;
  try {
    window.localStorage.setItem(
      `${VIEWPORT_STORAGE_PREFIX}${storageKey}`,
      JSON.stringify(viewport)
    );
  } catch (err) {
    console.error('Failed to save viewport preference:', err);
  }
}

/**
 * Parse viewport coordinates and zoom from the URL search query parameters.
 */
export function getViewportFromUrl(): MapViewportPreference | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get('lat') || '');
    const lng = parseFloat(params.get('lng') || '');
    const zoom = parseFloat(params.get('z') || params.get('zoom') || '');
    const heading = parseFloat(params.get('h') || params.get('heading') || '');
    const tilt = parseFloat(params.get('t') || params.get('tilt') || '');

    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      return {
        lat,
        lng,
        zoom: !Number.isNaN(zoom) && zoom > 0 ? zoom : 16,
        heading: !Number.isNaN(heading) ? heading : 0,
        tilt: !Number.isNaN(tilt) ? tilt : 0,
      };
    }
  } catch {}
  return null;
}

/**
 * Synchronize the current map viewport to URL query parameters via replaceState.
 */
export function syncViewportToUrl(viewport: MapViewportPreference): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('lat', viewport.lat.toFixed(6));
    url.searchParams.set('lng', viewport.lng.toFixed(6));
    url.searchParams.set('z', Math.round(viewport.zoom).toString());
    if (viewport.heading && Math.round(viewport.heading) !== 0) {
      url.searchParams.set('h', Math.round(viewport.heading).toString());
    } else {
      url.searchParams.delete('h');
      url.searchParams.delete('heading');
    }
    if (viewport.tilt && Math.round(viewport.tilt) !== 0) {
      url.searchParams.set('t', Math.round(viewport.tilt).toString());
    } else {
      url.searchParams.delete('t');
      url.searchParams.delete('tilt');
    }
    const newUrl = `${url.pathname}?${url.searchParams.toString()}${url.hash}`;
    window.history.replaceState(null, '', newUrl);
  } catch {}
}

