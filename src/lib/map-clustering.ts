import type Supercluster from 'supercluster';

export interface PointFeatureProperties<T = unknown> {
  id: string;
  data: T;
  cluster: false;
}

export interface ClusterProperties {
  cluster: boolean;
  cluster_id: number;
  point_count: number;
  point_count_abbreviated: string | number;
}

export type SuperclusterPointFeature<T = unknown> = GeoJSON.Feature<
  GeoJSON.Point,
  PointFeatureProperties<T>
>;
export type SuperclusterClusterFeature = Supercluster.ClusterFeature<ClusterProperties>;
export type SuperclusterItem<T = unknown> =
  | SuperclusterPointFeature<T>
  | SuperclusterClusterFeature;

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
 * Converts a Google Maps LatLngBounds to a GeoJSON Bounding Box [westLng, southLat, eastLng, northLat]
 */
export function getBoundingBoxFromGoogleBounds(
  bounds: google.maps.LatLngBounds,
  marginRatio = 0.1
): [number, number, number, number] {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  const latSpan = ne.lat() - sw.lat();
  const lngSpan = ne.lng() - sw.lng();

  const marginLat = latSpan * marginRatio;
  const marginLng = lngSpan * marginRatio;

  const minLng = Math.max(-180, sw.lng() - marginLng);
  const minLat = Math.max(-85, sw.lat() - marginLat);
  const maxLng = Math.min(180, ne.lng() + marginLng);
  const maxLat = Math.min(85, ne.lat() + marginLat);

  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Creates an interactive DOM badge for a Google Maps cluster
 */
export function createClusterBadgeElement(
  pointCount: number,
  options: {
    color?: string;
    textColor?: string;
    onClick?: () => void;
  } = {}
): HTMLDivElement {
  const { color = '#2563EB', textColor = '#FFFFFF', onClick } = options;

  let size = 26;
  let fontSize = 11;
  if (pointCount >= 100) {
    size = 34;
    fontSize = 12.5;
  } else if (pointCount >= 10) {
    size = 30;
    fontSize = 11.5;
  }

  const displayCount = pointCount > 999 ? `${(pointCount / 1000).toFixed(1)}k` : `${pointCount}`;

  const container = document.createElement('div');
  container.style.position = 'relative';
  container.style.width = `${size}px`;
  container.style.height = `${size}px`;
  container.style.borderRadius = '50%';
  container.style.backgroundColor = color;
  container.style.color = textColor;
  container.style.border = '2px solid #FFFFFF';

  container.style.boxShadow =
    '0 4px 6px -1px rgba(0, 0, 0, 0.25), 0 2px 4px -2px rgba(0, 0, 0, 0.2)';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.fontWeight = '700';
  container.style.fontSize = `${fontSize}px`;
  container.style.cursor = 'pointer';
  container.style.userSelect = 'none';
  container.style.transform = 'translate(-50%, -50%)';
  container.style.transition = 'transform 0.15s ease-out, box-shadow 0.15s ease-out';
  container.title = `${pointCount} households (click to zoom)`;
  container.textContent = displayCount;

  container.addEventListener('mouseenter', () => {
    container.style.transform = 'translate(-50%, -50%) scale(1.1)';
    container.style.boxShadow =
      '0 8px 12px -2px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.25)';
  });

  container.addEventListener('mouseleave', () => {
    container.style.transform = 'translate(-50%, -50%) scale(1)';
    container.style.boxShadow =
      '0 4px 6px -1px rgba(0, 0, 0, 0.25), 0 2px 4px -2px rgba(0, 0, 0, 0.2)';
  });

  if (onClick) {
    container.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
  }

  return container;
}
