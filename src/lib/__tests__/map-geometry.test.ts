import { describe, expect, it } from 'vitest';
import type { MapRoad } from '@/types/api';
import {
  areCoordinatesCoincident,
  computeDistanceMeters,
  findClosestVertexIndex,
  findNearestRoadSnapPoint,
  insertJunctionVertexIntoRoad,
  projectPointOntoSegment,
} from '../map-geometry';

describe('Map Geometry & Road Snapping', () => {
  describe('computeDistanceMeters & areCoordinatesCoincident', () => {
    it('computes distance accurately between two points', () => {
      const p1 = { lat: 8.3683, lng: 124.8644 };
      const p2 = { lat: 8.3683, lng: 124.8644 };
      expect(computeDistanceMeters(p1, p2)).toBe(0);

      // ~111km per degree latitude
      const p3 = { lat: 8.3693, lng: 124.8644 };
      const dist = computeDistanceMeters(p1, p3);
      expect(dist).toBeGreaterThan(100);
      expect(dist).toBeLessThan(120);
    });

    it('identifies coincident coordinates within tolerance', () => {
      const p1 = { lat: 8.3683, lng: 124.8644 };
      const p2 = { lat: 8.36830005, lng: 124.86440005 };
      const p3 = { lat: 8.3693, lng: 124.8644 };

      expect(areCoordinatesCoincident(p1, p2)).toBe(true);
      expect(areCoordinatesCoincident(p1, p3)).toBe(false);
    });
  });

  describe('projectPointOntoSegment', () => {
    const a = { lat: 8.368, lng: 124.864 };
    const b = { lat: 8.37, lng: 124.864 }; // Segment along latitude

    it('projects a midpoint perpendicular to the segment (T / Y junction)', () => {
      const p = { lat: 8.369, lng: 124.865 }; // Off to the right
      const { point, t } = projectPointOntoSegment(p, a, b);

      expect(t).toBeCloseTo(0.5, 2);
      expect(point.lat).toBeCloseTo(8.369, 5);
      expect(point.lng).toBeCloseTo(124.864, 5);
    });

    it('clamps projection to start vertex when beyond A', () => {
      const p = { lat: 8.367, lng: 124.865 };
      const { point, t } = projectPointOntoSegment(p, a, b);

      expect(t).toBe(0);
      expect(point.lat).toBe(a.lat);
      expect(point.lng).toBe(a.lng);
    });

    it('clamps projection to end vertex when beyond B', () => {
      const p = { lat: 8.371, lng: 124.865 };
      const { point, t } = projectPointOntoSegment(p, a, b);

      expect(t).toBe(1);
      expect(point.lat).toBe(b.lat);
      expect(point.lng).toBe(b.lng);
    });
  });

  describe('findNearestRoadSnapPoint', () => {
    const sampleRoads: MapRoad[] = [
      {
        id: 'road-main',
        name: 'Main Boulevard',
        color: '#2563EB',
        points: [
          { lat: 8.368, lng: 124.864 },
          { lat: 8.37, lng: 124.864 },
          { lat: 8.372, lng: 124.866 },
        ],
      },
      {
        id: 'road-side',
        name: 'Side Street',
        color: '#10B981',
        points: [
          { lat: 8.368, lng: 124.864 },
          { lat: 8.368, lng: 124.868 },
        ],
      },
    ];

    it('snaps directly to an existing road vertex when close', () => {
      // Very close to road-main vertex 0 / road-side vertex 0
      const queryPoint = { lat: 8.3680001, lng: 124.8640001 };
      const snap = findNearestRoadSnapPoint({
        point: queryPoint,
        roads: sampleRoads,
        meterTolerance: 25,
      });

      expect(snap).not.toBeNull();
      expect(snap?.isVertex).toBe(true);
      expect(snap?.snappedPoint.lat).toBeCloseTo(8.368, 5);
      expect(snap?.snappedPoint.lng).toBeCloseTo(124.864, 5);
    });

    it('snaps along a road segment creating a T / Y junction point', () => {
      // Close to midpoint of segment 0 on road-main (between 8.368 and 8.370)
      const queryPoint = { lat: 8.369, lng: 124.86405 }; // ~5 meters off segment
      const snap = findNearestRoadSnapPoint({
        point: queryPoint,
        roads: sampleRoads,
        meterTolerance: 25,
      });

      expect(snap).not.toBeNull();
      expect(snap?.road.id).toBe('road-main');
      expect(snap?.segmentIndex).toBe(0);
      expect(snap?.snappedPoint.lat).toBeCloseTo(8.369, 4);
      expect(snap?.snappedPoint.lng).toBeCloseTo(124.864, 5);
    });

    it('returns null if cursor is outside tolerance distance', () => {
      const farPoint = { lat: 8.38, lng: 124.89 };
      const snap = findNearestRoadSnapPoint({
        point: farPoint,
        roads: sampleRoads,
        meterTolerance: 25,
      });

      expect(snap).toBeNull();
    });

    it('respects screen pixel distance when projection function is provided', () => {
      // Mock projection: lat -> y, lng -> x
      const latLngToPixel = (coord: { lat: number; lng: number }) => ({
        x: (coord.lng - 124.86) * 10000,
        y: (coord.lat - 8.36) * 10000,
      });

      const cursorPixel = { x: 40, y: 90 }; // (lng: 124.864, lat: 8.369)
      const queryPoint = { lat: 8.369, lng: 124.864 };

      const snap = findNearestRoadSnapPoint({
        point: queryPoint,
        roads: sampleRoads,
        pixelTolerance: 20,
        latLngToPixel,
        cursorPixel,
      });

      expect(snap).not.toBeNull();
      expect(snap?.distancePixels).toBeLessThanOrEqual(20);
      expect(snap?.road.id).toBe('road-main');
    });
  });

  describe('insertJunctionVertexIntoRoad', () => {
    const road: MapRoad = {
      id: 'road-1',
      name: 'Central Ave',
      points: [
        { lat: 8.368, lng: 124.864 },
        { lat: 8.37, lng: 124.864 },
      ],
    };

    it('inserts a new junction point between existing segment vertices', () => {
      const junctionPt = { lat: 8.369, lng: 124.864 };
      const updated = insertJunctionVertexIntoRoad(road, junctionPt, 0);

      expect(updated.points).toHaveLength(3);
      expect(updated.points[0]).toEqual({ lat: 8.368, lng: 124.864 });
      expect(updated.points[1]).toEqual({ lat: 8.369, lng: 124.864 });
      expect(updated.points[2]).toEqual({ lat: 8.37, lng: 124.864 });
    });

    it('does not insert duplicate vertices if already coincident with endpoint', () => {
      const coincidentPt = { lat: 8.368, lng: 124.864 };
      const updated = insertJunctionVertexIntoRoad(road, coincidentPt, 0);

      expect(updated.points).toHaveLength(2);
      expect(updated.points).toEqual(road.points);
    });
  });

  describe('findClosestVertexIndex', () => {
    const vertices = [
      { lat: 8.368, lng: 124.864 },
      { lat: 8.37, lng: 124.864 },
      { lat: 8.372, lng: 124.866 },
    ];

    it('finds closest vertex index when tapping close to a vertex', () => {
      const query = { lat: 8.370001, lng: 124.864001 };
      const result = findClosestVertexIndex({
        point: query,
        vertices,
        meterTolerance: 20,
      });

      expect(result).not.toBeNull();
      expect(result?.index).toBe(1);
    });

    it('returns null when tapping far from all vertices', () => {
      const query = { lat: 8.38, lng: 124.89 };
      const result = findClosestVertexIndex({
        point: query,
        vertices,
        meterTolerance: 20,
      });

      expect(result).toBeNull();
    });
  });
});
