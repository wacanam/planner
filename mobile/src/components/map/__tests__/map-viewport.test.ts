import { describe, expect, it } from 'vitest';
import { calculateRegionFromCoordinates } from '../hooks/useMapViewport';

describe('Map Viewport Utilities', () => {
  describe('calculateRegionFromCoordinates', () => {
    it('returns null for empty coordinate array', () => {
      expect(calculateRegionFromCoordinates([])).toBeNull();
    });

    it('calculates center and delta from boundary points', () => {
      const coords = [
        { latitude: 14.59, longitude: 120.98 },
        { latitude: 14.61, longitude: 121.0 },
      ];

      const region = calculateRegionFromCoordinates(coords, 1.0);
      expect(region).not.toBeNull();
      expect(region?.latitude).toBeCloseTo(14.6, 4);
      expect(region?.longitude).toBeCloseTo(120.99, 4);
      expect(region?.latitudeDelta).toBeCloseTo(0.02, 4);
      expect(region?.longitudeDelta).toBeCloseTo(0.02, 4);
    });

    it('applies minimum delta to avoid extreme zoom-in on single point', () => {
      const coords = [{ latitude: 14.59, longitude: 120.98 }];

      const region = calculateRegionFromCoordinates(coords, 1.4, 0.008);
      expect(region).not.toBeNull();
      expect(region?.latitude).toBe(14.59);
      expect(region?.longitude).toBe(120.98);
      expect(region?.latitudeDelta).toBe(0.008);
      expect(region?.longitudeDelta).toBe(0.008);
    });
  });
});
