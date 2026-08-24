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
