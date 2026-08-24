import { useMemo } from 'react';
import Supercluster from 'supercluster';
import type { ClusterProperties, MapMarkerItem, MapRegion } from '../types';


export interface PointFeatureProperties {
  id: string;
  marker: MapMarkerItem;
  cluster: false;
}

export type SuperclusterPointFeature = GeoJSON.Feature<GeoJSON.Point, PointFeatureProperties>;
export type SuperclusterClusterFeature = Supercluster.ClusterFeature<ClusterProperties>;
export type SuperclusterItem = SuperclusterPointFeature | SuperclusterClusterFeature;

export interface UseSuperclusterOptions {
  radius?: number;
  maxZoom?: number;
  minPoints?: number;
  enabled?: boolean;
  marginRatio?: number;
}

/**
 * Calculates Mercator zoom level from longitude delta
 */
export function getZoomFromLongitudeDelta(longitudeDelta: number): number {
  if (!longitudeDelta || longitudeDelta <= 0) return 15;
  const zoom = Math.log2(360 / longitudeDelta);
  return Math.max(0, Math.min(20, Math.round(zoom)));
}

/**
 * Calculates longitude delta from Mercator zoom level
 */
export function getLongitudeDeltaFromZoom(zoom: number): number {
  return 360 / 2 ** zoom;
}

/**
 * Converts a MapRegion to a padded GeoJSON Bounding Box [westLng, southLat, eastLng, northLat]
 */
export function getBoundingBoxFromRegion(
  region: MapRegion,
  marginRatio = 0.15
): [number, number, number, number] {
  const latDelta = region.latitudeDelta;
  const lngDelta = region.longitudeDelta;
  const marginLat = latDelta * marginRatio;
  const marginLng = lngDelta * marginRatio;

  const minLng = Math.max(-180, region.longitude - lngDelta / 2 - marginLng);
  const minLat = Math.max(-85, region.latitude - latDelta / 2 - marginLat);
  const maxLng = Math.min(180, region.longitude + lngDelta / 2 + marginLng);
  const maxLat = Math.min(85, region.latitude + latDelta / 2 + marginLat);

  return [minLng, minLat, maxLng, maxLat];
}

export function useSupercluster(
  markers: MapMarkerItem[],
  region: MapRegion | undefined,
  options: UseSuperclusterOptions = {}
) {
  const {
    radius = 45,
    maxZoom = 16,
    minPoints = 2,
    enabled = true,
    marginRatio = 0.15,
  } = options;

  // 1. Build Supercluster spatial index from markers
  const supercluster = useMemo(() => {
    if (!enabled || markers.length === 0) return null;

    const sc = new Supercluster<PointFeatureProperties, ClusterProperties>({
      radius,
      maxZoom,
      minPoints,
    });

    const validFeatures: SuperclusterPointFeature[] = [];

    for (const marker of markers) {
      const lat = Number(marker.coordinate?.latitude);
      const lng = Number(marker.coordinate?.longitude);

      if (!Number.isNaN(lat) && !Number.isNaN(lng) && (lat !== 0 || lng !== 0)) {
        validFeatures.push({
          type: 'Feature',
          properties: {
            id: marker.id,
            marker,
            cluster: false,
          },
          geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
        });
      }
    }

    sc.load(validFeatures);
    return sc;
  }, [markers, radius, maxZoom, minPoints, enabled]);

  // 2. Query visible clusters and points within the current region
  const clusters = useMemo<SuperclusterItem[]>(() => {
    if (!enabled || !supercluster || !region) {
      // If clustering disabled or not ready, return raw points as individual features
      return markers
        .filter((m) => {
          const lat = Number(m.coordinate?.latitude);
          const lng = Number(m.coordinate?.longitude);
          return !Number.isNaN(lat) && !Number.isNaN(lng) && (lat !== 0 || lng !== 0);
        })
        .map((m) => ({
          type: 'Feature' as const,
          properties: {
            id: m.id,
            marker: m,
            cluster: false as const,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [Number(m.coordinate.longitude), Number(m.coordinate.latitude)],
          },
        }));
    }

    const bbox = getBoundingBoxFromRegion(region, marginRatio);
    const zoom = getZoomFromLongitudeDelta(region.longitudeDelta);

    try {
      return supercluster.getClusters(bbox, zoom);
    } catch {
      return [];
    }
  }, [enabled, supercluster, region, marginRatio, markers]);

  // Helper to get expansion zoom for a cluster
  const getClusterExpansionZoom = (clusterId: number): number => {
    if (!supercluster) return 17;
    try {
      return supercluster.getClusterExpansionZoom(clusterId);
    } catch {
      return 17;
    }
  };

  return {
    supercluster,
    clusters,
    getClusterExpansionZoom,
  };
}
