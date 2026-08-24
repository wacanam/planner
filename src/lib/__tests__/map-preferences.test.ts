import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_BASEMAP_MODE,
  getSavedBasemapPreference,
  saveBasemapPreference,
} from '@/lib/map-preferences';

describe('Map Preferences Utilities', () => {
  let mockStorage: Record<string, string> = {};
  const originalWindow = globalThis.window;

  beforeEach(() => {
    mockStorage = {};
    const storageMock = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = String(val);
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    };

    (globalThis as any).window = {
      localStorage: storageMock,
    };
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
  });

  describe('getSavedBasemapPreference & saveBasemapPreference', () => {
    it('defaults to satellite when unset in localStorage', () => {
      expect(DEFAULT_BASEMAP_MODE).toBe('satellite');
      expect(getSavedBasemapPreference()).toBe('satellite');
    });

    it('saves and reads satellite mode preference', () => {
      saveBasemapPreference('satellite');
      expect(getSavedBasemapPreference()).toBe('satellite');
    });

    it('saves and reads street mode preference', () => {
      saveBasemapPreference('street');
      expect(getSavedBasemapPreference()).toBe('street');
    });

    it('falls back to satellite if invalid value is stored in localStorage', () => {
      (globalThis as any).window.localStorage.setItem('planner_preferred_basemap', 'terrain');
      expect(getSavedBasemapPreference()).toBe('satellite');
    });

    it('handles SSR gracefully when window is undefined', () => {
      delete (globalThis as any).window;
      expect(getSavedBasemapPreference()).toBe('satellite');
      expect(() => saveBasemapPreference('street')).not.toThrow();
    });

    it('handles localStorage errors gracefully when throwing', () => {
      (globalThis as any).window.localStorage.getItem = () => {
        throw new Error('QuotaExceeded or SecurityError');
      };
      (globalThis as any).window.localStorage.setItem = () => {
        throw new Error('QuotaExceeded or SecurityError');
      };

      expect(getSavedBasemapPreference()).toBe('satellite');
      expect(() => saveBasemapPreference('street')).not.toThrow();
    });
  });
});
