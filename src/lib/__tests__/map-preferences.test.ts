import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_BASEMAP_MODE,
  getSavedBasemapPreference,
  getSavedViewportPreference,
  getViewportFromUrl,
  saveBasemapPreference,
  saveViewportPreference,
  syncViewportToUrl,
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

  describe('Viewport Persistence & URL Sync Utilities', () => {
    it('returns null when no viewport saved', () => {
      expect(getSavedViewportPreference('territory_123')).toBeNull();
    });

    it('saves and reads viewport preference', () => {
      const vp = { lat: 14.5995, lng: 120.9842, zoom: 17, heading: 45, tilt: 30 };
      saveViewportPreference('territory_123', vp);

      const restored = getSavedViewportPreference('territory_123');
      expect(restored).not.toBeNull();
      expect(restored?.lat).toBe(14.5995);
      expect(restored?.lng).toBe(120.9842);
      expect(restored?.zoom).toBe(17);
      expect(restored?.heading).toBe(45);
      expect(restored?.tilt).toBe(30);
    });

    it('parses viewport from URL parameters', () => {
      (globalThis as any).window.location = new URL('http://localhost:3000/territories?lat=14.59&lng=120.98&z=16&h=90&t=45');
      const fromUrl = getViewportFromUrl();
      expect(fromUrl).not.toBeNull();
      expect(fromUrl?.lat).toBe(14.59);
      expect(fromUrl?.lng).toBe(120.98);
      expect(fromUrl?.zoom).toBe(16);
      expect(fromUrl?.heading).toBe(90);
      expect(fromUrl?.tilt).toBe(45);
    });

    it('syncs viewport to URL via window.history.replaceState', () => {
      let replacedUrl = '';
      (globalThis as any).window.location = new URL('http://localhost:3000/territories');
      (globalThis as any).window.history = {
        replaceState: (_data: any, _unused: string, url: string) => {
          replacedUrl = url;
        },
      };

      syncViewportToUrl({ lat: 14.5995, lng: 120.9842, zoom: 18, heading: 0, tilt: 0 });
      expect(replacedUrl).toContain('lat=14.599500');
      expect(replacedUrl).toContain('lng=120.984200');
      expect(replacedUrl).toContain('z=18');
    });
  });
});

