import { describe, expect, it } from 'vitest';
import Supercluster from 'supercluster';
import {
  getBoundingBoxFromRegion,
  getLongitudeDeltaFromZoom,
  getZoomFromLongitudeDelta,
} from '../../../mobile/src/components/map/hooks/useSupercluster';

describe('Map Clustering & Spatial Utilities', () => {
  describe('getZoomFromLongitudeDelta', () => {
    it('converts global longitude delta to zoom 0', () => {
      expect(getZoomFromLongitudeDelta(360)).toBe(0);
    });

    it('converts half globe delta to zoom 1', () => {
      expect(getZoomFromLongitudeDelta(180)).toBe(1);
    });

    it('converts typical neighborhood deltas correctly', () => {
      const zoom14 = getZoomFromLongitudeDelta(0.02);
      expect(zoom14).toBe(14);

      const zoom16 = getZoomFromLongitudeDelta(0.005);
      expect(zoom16).toBe(16);
    });

    it('handles zero or negative delta safely', () => {
      expect(getZoomFromLongitudeDelta(0)).toBe(15);
      expect(getZoomFromLongitudeDelta(-1)).toBe(15);
    });
  });

  describe('getLongitudeDeltaFromZoom', () => {
    it('inverts zoom level back to longitude delta', () => {
      expect(getLongitudeDeltaFromZoom(0)).toBe(360);
      expect(getLongitudeDeltaFromZoom(1)).toBe(180);
      expect(getLongitudeDeltaFromZoom(2)).toBe(90);
    });
  });

  describe('getBoundingBoxFromRegion', () => {
    it('calculates bounding box with margin', () => {
      const region = {
        latitude: 14.5995,
        longitude: 120.9842,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };

      const [minLng, minLat, maxLng, maxLat] = getBoundingBoxFromRegion(region, 0.1);
      // Margin = 0.02 * 0.1 = 0.002
      // minLng = 120.9842 - 0.01 - 0.002 = 120.9722
      expect(minLng).toBeCloseTo(120.9722, 4);
      expect(maxLng).toBeCloseTo(120.9962, 4);
      expect(minLat).toBeCloseTo(14.5875, 4);
      expect(maxLat).toBeCloseTo(14.6115, 4);
    });
  });

  describe('Supercluster Spatial Indexing', () => {
    it('clusters multiple close points together at low zoom levels', () => {
      const sc = new Supercluster({
        radius: 40,
        maxZoom: 16,
      });

      // 50 points very close to each other
      const features: GeoJSON.Feature<GeoJSON.Point, { id: string }>[] = Array.from(
        { length: 50 },
        (_, i) => ({
          type: 'Feature',
          properties: { id: `door-${i}` },
          geometry: {
            type: 'Point',
            coordinates: [120.9842 + i * 0.0001, 14.5995 + i * 0.0001],
          },
        })
      );

      sc.load(features);

      // At zoom 10 (city/overview), all 50 should be aggregated into 1 cluster
      const clustersZoom10 = sc.getClusters([120.0, 14.0, 122.0, 15.0], 10);
      expect(clustersZoom10.length).toBe(1);
      expect(clustersZoom10[0].properties.cluster).toBe(true);
      expect(clustersZoom10[0].properties.point_count).toBe(50);

      // At zoom 18 (street level), points should be individual unclustered pins
      const clustersZoom18 = sc.getClusters([120.0, 14.0, 122.0, 15.0], 18);
      expect(clustersZoom18.length).toBe(50);
      expect(clustersZoom18[0].properties.cluster).toBeUndefined();
    });
  });
});
