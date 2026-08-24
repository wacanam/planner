import type { MapRoad } from '@/types/api';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PixelPoint {
  x: number;
  y: number;
}

export interface RoadSnapResult {
  snappedPoint: LatLng;
  road: MapRoad;
  segmentIndex: number;
  isVertex: boolean;
  vertexIndex?: number;
  distancePixels: number;
  distanceMeters: number;
}

const EARTH_RADIUS_METERS = 6371000;
const DEG_TO_RAD = Math.PI / 180;
const COINCIDENT_THRESHOLD_DEG = 1e-6; // ~0.11 meters

/**
 * Calculates equirectangular distance in meters between two lat/lng coordinates.
 * Extremely fast and accurate for neighborhood-scale geometry.
 */
export function computeDistanceMeters(p1: LatLng, p2: LatLng): number {
  const latMid = ((p1.lat + p2.lat) / 2) * DEG_TO_RAD;
  const dx = (p2.lng - p1.lng) * DEG_TO_RAD * Math.cos(latMid) * EARTH_RADIUS_METERS;
  const dy = (p2.lat - p1.lat) * DEG_TO_RAD * EARTH_RADIUS_METERS;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Checks if two coordinates are effectively identical within tolerance.
 */
export function areCoordinatesCoincident(
  p1: LatLng,
  p2: LatLng,
  toleranceDeg: number = COINCIDENT_THRESHOLD_DEG
): boolean {
  return (
    Math.abs(p1.lat - p2.lat) <= toleranceDeg &&
    Math.abs(p1.lng - p2.lng) <= toleranceDeg
  );
}

/**
 * Projects point P onto line segment AB.
 * Returns the projected coordinate and interpolation parameter t (clamped to [0, 1]).
 */
export function projectPointOntoSegment(
  p: LatLng,
  a: LatLng,
  b: LatLng
): { point: LatLng; t: number } {
  const latMid = ((a.lat + b.lat) / 2) * DEG_TO_RAD;
  const cosLat = Math.cos(latMid);

  const ax = a.lng * cosLat;
  const ay = a.lat;
  const bx = b.lng * cosLat;
  const by = b.lat;
  const px = p.lng * cosLat;
  const py = p.lat;

  const abx = bx - ax;
  const aby = by - ay;
  const abLenSq = abx * abx + aby * aby;

  if (abLenSq === 0) {
    return { point: { lat: a.lat, lng: a.lng }, t: 0 };
  }

  const apx = px - ax;
  const apy = py - ay;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));

  const projLat = a.lat + t * (b.lat - a.lat);
  const projLng = a.lng + t * (b.lng - a.lng);

  return {
    point: { lat: projLat, lng: projLng },
    t,
  };
}

export interface FindNearestRoadSnapOptions {
  point: LatLng;
  roads: MapRoad[];
  pixelTolerance?: number;
  meterTolerance?: number;
  latLngToPixel?: (coord: LatLng) => PixelPoint | null;
  cursorPixel?: PixelPoint | null;
  excludedRoadId?: string | null;
}

/**
 * Finds the nearest snap target (road vertex or segment) across all existing roads.
 * Prioritizes pixel distance when projection function is provided, with fallback to meters.
 */
export function findNearestRoadSnapPoint({
  point,
  roads,
  pixelTolerance = 22,
  meterTolerance = 20,
  latLngToPixel,
  cursorPixel,
  excludedRoadId,
}: FindNearestRoadSnapOptions): RoadSnapResult | null {
  if (!roads || roads.length === 0) return null;

  let bestResult: RoadSnapResult | null = null;
  let bestDistancePixels = Number.POSITIVE_INFINITY;
  let bestDistanceMeters = Number.POSITIVE_INFINITY;

  const curPixel = cursorPixel || (latLngToPixel ? latLngToPixel(point) : null);

  for (const road of roads) {
    if (excludedRoadId && road.id === excludedRoadId) continue;
    if (!road.points || road.points.length < 2) continue;

    for (let i = 0; i < road.points.length - 1; i++) {
      const a = road.points[i];
      const b = road.points[i + 1];

      // 1. Check vertex A
      const vDistMetersA = computeDistanceMeters(point, a);
      let vDistPixelsA = Number.POSITIVE_INFINITY;
      if (curPixel && latLngToPixel) {
        const pixA = latLngToPixel(a);
        if (pixA) {
          const dx = curPixel.x - pixA.x;
          const dy = curPixel.y - pixA.y;
          vDistPixelsA = Math.sqrt(dx * dx + dy * dy);
        }
      }

      const isVertexMatchA =
        vDistPixelsA <= pixelTolerance ||
        (!curPixel && vDistMetersA <= meterTolerance);

      if (isVertexMatchA) {
        const score = curPixel ? vDistPixelsA : vDistMetersA;
        const currentBest = curPixel ? bestDistancePixels : bestDistanceMeters;
        if (score < currentBest) {
          bestDistancePixels = vDistPixelsA;
          bestDistanceMeters = vDistMetersA;
          bestResult = {
            snappedPoint: { lat: a.lat, lng: a.lng },
            road,
            segmentIndex: i,
            isVertex: true,
            vertexIndex: i,
            distancePixels: vDistPixelsA,
            distanceMeters: vDistMetersA,
          };
        }
      }

      // 2. Check vertex B
      const vDistMetersB = computeDistanceMeters(point, b);
      let vDistPixelsB = Number.POSITIVE_INFINITY;
      if (curPixel && latLngToPixel) {
        const pixB = latLngToPixel(b);
        if (pixB) {
          const dx = curPixel.x - pixB.x;
          const dy = curPixel.y - pixB.y;
          vDistPixelsB = Math.sqrt(dx * dx + dy * dy);
        }
      }

      const isVertexMatchB =
        vDistPixelsB <= pixelTolerance ||
        (!curPixel && vDistMetersB <= meterTolerance);

      if (isVertexMatchB) {
        const score = curPixel ? vDistPixelsB : vDistMetersB;
        const currentBest = curPixel ? bestDistancePixels : bestDistanceMeters;
        if (score < currentBest) {
          bestDistancePixels = vDistPixelsB;
          bestDistanceMeters = vDistMetersB;
          bestResult = {
            snappedPoint: { lat: b.lat, lng: b.lng },
            road,
            segmentIndex: i,
            isVertex: true,
            vertexIndex: i + 1,
            distancePixels: vDistPixelsB,
            distanceMeters: vDistMetersB,
          };
        }
      }

      // 3. Check segment projection (T / Y / X junction along segment)
      const { point: projPoint, t } = projectPointOntoSegment(point, a, b);
      const segDistMeters = computeDistanceMeters(point, projPoint);
      let segDistPixels = Number.POSITIVE_INFINITY;

      if (curPixel && latLngToPixel) {
        const pixProj = latLngToPixel(projPoint);
        if (pixProj) {
          const dx = curPixel.x - pixProj.x;
          const dy = curPixel.y - pixProj.y;
          segDistPixels = Math.sqrt(dx * dx + dy * dy);
        }
      }

      const isSegMatch =
        segDistPixels <= pixelTolerance ||
        (!curPixel && segDistMeters <= meterTolerance);

      if (isSegMatch) {
        const isNearVertex = t < 0.05 || t > 0.95;
        const vertexIndex = t < 0.05 ? i : i + 1;
        const snappedTarget = isNearVertex
          ? t < 0.05
            ? a
            : b
          : projPoint;

        const score = curPixel ? segDistPixels : segDistMeters;
        const currentBest = curPixel ? bestDistancePixels : bestDistanceMeters;

        if (score < currentBest) {
          bestDistancePixels = segDistPixels;
          bestDistanceMeters = segDistMeters;
          bestResult = {
            snappedPoint: { lat: snappedTarget.lat, lng: snappedTarget.lng },
            road,
            segmentIndex: i,
            isVertex: isNearVertex,
            vertexIndex: isNearVertex ? vertexIndex : undefined,
            distancePixels: segDistPixels,
            distanceMeters: segDistMeters,
          };
        }
      }
    }
  }

  return bestResult;
}

/**
 * Inserts a junction point into a road's path if it is not already coincident with an existing vertex.
 * Returns a new MapRoad with updated points.
 */
export function insertJunctionVertexIntoRoad(
  road: MapRoad,
  junctionPoint: LatLng,
  segmentIndex: number
): MapRoad {
  if (!road.points || road.points.length === 0) return road;

  // Check if coincident with segmentIndex or segmentIndex + 1
  const ptA = road.points[segmentIndex];
  const ptB = road.points[segmentIndex + 1];

  if (ptA && areCoordinatesCoincident(ptA, junctionPoint)) {
    return road;
  }
  if (ptB && areCoordinatesCoincident(ptB, junctionPoint)) {
    return road;
  }

  // Also check all points to prevent duplicate vertices
  const alreadyExists = road.points.some((p) =>
    areCoordinatesCoincident(p, junctionPoint)
  );
  if (alreadyExists) {
    return road;
  }

  const nextPoints = [...road.points];
  const insertAt = Math.min(Math.max(0, segmentIndex + 1), nextPoints.length);
  nextPoints.splice(insertAt, 0, {
    lat: junctionPoint.lat,
    lng: junctionPoint.lng,
  });

  return {
    ...road,
    points: nextPoints,
  };
}

export interface FindClosestVertexOptions {
  point: LatLng;
  vertices: LatLng[];
  pixelTolerance?: number;
  meterTolerance?: number;
  latLngToPixel?: (coord: LatLng) => PixelPoint | null;
  cursorPixel?: PixelPoint | null;
}

/**
 * Finds the index of the closest vertex within tolerance (pixels or meters).
 */
export function findClosestVertexIndex({
  point,
  vertices,
  pixelTolerance = 24,
  meterTolerance = 20,
  latLngToPixel,
  cursorPixel,
}: FindClosestVertexOptions): { index: number; distance: number; isPixel: boolean } | null {
  if (!vertices || vertices.length === 0) return null;

  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  const curPixel = cursorPixel || (latLngToPixel ? latLngToPixel(point) : null);

  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i];
    if (curPixel && latLngToPixel) {
      const vPixel = latLngToPixel(v);
      if (vPixel) {
        const dPixels = Math.hypot(curPixel.x - vPixel.x, curPixel.y - vPixel.y);
        if (dPixels <= pixelTolerance && dPixels < bestDistance) {
          bestDistance = dPixels;
          bestIndex = i;
        }
      }
    } else {
      const dMeters = computeDistanceMeters(point, v);
      if (dMeters <= meterTolerance && dMeters < bestDistance) {
        bestDistance = dMeters;
        bestIndex = i;
      }
    }
  }

  if (bestIndex !== -1) {
    return {
      index: bestIndex,
      distance: bestDistance,
      isPixel: Boolean(curPixel),
    };
  }
  return null;
}

