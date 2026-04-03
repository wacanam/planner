'use client';

/**
 * TerritoryMap — production-ready Leaflet map
 *
 * Rendering strategy:
 * - Boundary polygons: SVG (low count, needs crisp strokes)
 * - Household markers: Canvas renderer via L.canvas() for perf at scale
 * - Clustering: supercluster (runs in-thread; swap to Worker if >50k points)
 * - Popups: bound lazily on cluster expand / individual marker click
 *
 * Performance notes:
 * - Canvas renderer batches all marker draws into a single <canvas> per tile
 * - supercluster indexes points in a flat typed-array KD-tree (O(n log n) build)
 * - Cluster circles are also Canvas-rendered CircleMarkers (no DOM per point)
 * - Spotlight mask uses a single inverted Polygon (world ring + territory hole)
 */

import { useEffect, useRef } from 'react';

export interface HouseholdPoint {
  id: string;
  address: string;
  latitude?: string | null;
  longitude?: string | null;
  status?: string | null;
}

export interface TerritoryMapProps {
  /** Active territory boundary GeoJSON string — highlighted + spotlight mask */
  boundary?: string | null;
  /** Other congregation territory boundaries shown as muted context layers */
  allBoundaries?: Array<{ id: string; name: string; boundary: string }>;
  /** Households with lat/lng — clustered + canvas-rendered */
  households?: HouseholdPoint[];
  /** Override map center */
  center?: [number, number];
  className?: string;
}

// Status → dot color
const STATUS_COLOR: Record<string, string> = {
  not_visited:   '#94a3b8', // slate
  not_home:      '#f59e0b', // amber
  return_visit:  '#a855f7', // purple
  do_not_visit:  '#ef4444', // red
  visited:       '#22c55e', // green
  moved:         '#9ca3af', // gray
  inactive:      '#6b7280', // gray
};
const DEFAULT_COLOR = '#94a3b8';

// ─── Cluster appearance ───────────────────────────────────────────────────────
const CLUSTER_COLORS = [
  { max: 10,   fill: '#3b82f6', r: 16 },
  { max: 50,   fill: '#8b5cf6', r: 20 },
  { max: 9999, fill: '#ef4444', r: 26 },
];

function clusterStyle(count: number) {
  return CLUSTER_COLORS.find((c) => count <= c.max) ?? CLUSTER_COLORS[2];
}

export default function TerritoryMap({
  boundary,
  allBoundaries = [],
  households = [],
  center,
  className = '',
}: TerritoryMapProps) {
  const mapRef       = useRef<HTMLDivElement>(null);
  const mapInstance  = useRef<unknown>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: one-time mount
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    if (typeof window === 'undefined') return;

    let destroyed = false;

    Promise.all([
      import('leaflet'),
      import('supercluster'),
    ]).then(([L, { default: Supercluster }]) => {
      if (destroyed || !mapRef.current) return;

      // ── Fix webpack-broken default icons ──────────────────────────────────
      // @ts-expect-error Leaflet internals
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // ── Canvas renderer (shared across all household markers) ─────────────
      const canvasRenderer = L.canvas({ padding: 0.5, tolerance: 5 });

      // ── Map init ──────────────────────────────────────────────────────────
      const map = L.map(mapRef.current as HTMLElement, {
        zoomControl: true,
        scrollWheelZoom: true,
        preferCanvas: false, // polygons stay SVG; we pass renderer per-layer
      });
      mapInstance.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // ── Determine initial view ────────────────────────────────────────────
      const validPts = households.filter((h) => h.latitude && h.longitude);

      let mapCenter: [number, number] = center ?? [8.37, 124.85]; // fallback: Philippines
      if (validPts.length > 0 && !center) {
        const lats = validPts.map((h) => +h.latitude!);
        const lngs = validPts.map((h) => +h.longitude!);
        mapCenter = [
          (Math.min(...lats) + Math.max(...lats)) / 2,
          (Math.min(...lngs) + Math.max(...lngs)) / 2,
        ];
      }
      map.setView(mapCenter, 15);

      // ── Context territory boundaries (muted dashed outlines) ─────────────
      const contextLayers: ReturnType<typeof L.geoJSON>[] = [];
      for (const tb of allBoundaries) {
        try {
          const geo = JSON.parse(tb.boundary);
          const layer = L.geoJSON(geo, {
            style: {
              color: '#94a3b8', weight: 1.5,
              fillOpacity: 0.04, fillColor: '#94a3b8',
              dashArray: '4 4',
            },
          }).addTo(map);
          layer.bindTooltip(tb.name, { permanent: false, direction: 'center', className: 'text-xs' });
          contextLayers.push(layer);
        } catch { /* skip malformed */ }
      }

      // ── Active territory spotlight ────────────────────────────────────────
      let activeBorderLayer: ReturnType<typeof L.geoJSON> | null = null;
      if (boundary) {
        try {
          const geo = JSON.parse(boundary);
          const outerRing = geo?.geometry?.coordinates?.[0];
          if (outerRing) {
            // World mask with territory as hole → everything outside = gray
            const worldRing = [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]];
            L.geoJSON(
              {
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: [worldRing, [...outerRing].reverse()] },
              } as Parameters<typeof L.geoJSON>[0],
              { style: { color: '#6B9ECC', weight: 0, fillColor: '#64748b', fillOpacity: 0.35, stroke: false } }
            ).addTo(map);

            // Clean border on top
            activeBorderLayer = L.geoJSON(geo, {
              style: { color: '#6B9ECC', weight: 2.5, fillOpacity: 0, stroke: true },
            }).addTo(map);
          }
        } catch { /* skip */ }
      }

      // Fit to active border or all context layers
      const fitTarget = activeBorderLayer ?? (contextLayers.length > 0 ? L.featureGroup(contextLayers) : null);
      if (fitTarget) {
        try { map.fitBounds((fitTarget as ReturnType<typeof L.geoJSON>).getBounds(), { padding: [24, 24] }); }
        catch { /* bounds may be empty */ }
      }

      // ── Supercluster setup ────────────────────────────────────────────────
      if (validPts.length === 0) return;

      const index = new Supercluster<{ id: string; address: string; status: string }>({
        radius: 60,
        maxZoom: 18,
        minPoints: 3,
      });

      index.load(
        validPts.map((h) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [+h.longitude!, +h.latitude!] },
          properties: { id: h.id, address: h.address, status: h.status ?? 'not_visited' },
        }))
      );

      // Layer group holds all rendered cluster/point markers (replaced on each update)
      const clusterGroup = L.layerGroup().addTo(map);

      function renderClusters() {
        clusterGroup.clearLayers();

        const bounds = map.getBounds();
        const bbox: [number, number, number, number] = [
          bounds.getWest(), bounds.getSouth(),
          bounds.getEast(), bounds.getNorth(),
        ];
        const zoom = Math.floor(map.getZoom());
        const clusters = index.getClusters(bbox, zoom);

        for (const feature of clusters) {
          const [lng, lat] = feature.geometry.coordinates;
          const props = feature.properties as Record<string, unknown>;

          if (props.cluster) {
            // ── Cluster circle (canvas) ──────────────────────────────────
            const count = props.point_count as number;
            const style = clusterStyle(count);
            const circle = L.circleMarker([lat, lng], {
              renderer: canvasRenderer,
              radius: style.r,
              fillColor: style.fill,
              fillOpacity: 0.85,
              color: '#fff',
              weight: 2,
            });

            // Label inside circle via tooltip (permanent, no pointer-events)
            circle.bindTooltip(String(count), {
              permanent: true,
              direction: 'center',
              className: 'cluster-label',
              offset: [0, 0],
            });

            circle.on('click', () => {
              const expansionZoom = Math.min(
                index.getClusterExpansionZoom(props.cluster_id as number),
                18
              );
              map.flyTo([lat, lng], expansionZoom, { duration: 0.4 });
            });

            clusterGroup.addLayer(circle);
          } else {
            // ── Individual dot (canvas) ──────────────────────────────────
            const { id, address, status } = props as { id: string; address: string; status: string };
            const color = STATUS_COLOR[status] ?? DEFAULT_COLOR;

            const dot = L.circleMarker([lat, lng], {
              renderer: canvasRenderer,
              radius: 6,
              fillColor: color,
              fillOpacity: 1,
              color: '#fff',
              weight: 1.5,
            });

            dot.bindPopup(
              `<div style="min-width:140px">
                <p style="font-weight:600;margin:0 0 2px">${address}</p>
                <p style="font-size:11px;color:#64748b;margin:0;text-transform:capitalize">
                  ${status.replace(/_/g, ' ')}
                </p>
              </div>`,
              { maxWidth: 220, closeButton: false }
            );

            // Expose id for future click-through navigation
            (dot as unknown as { householdId: string }).householdId = id;

            clusterGroup.addLayer(dot);
          }
        }
      }

      renderClusters();
      map.on('moveend zoomend', renderClusters);
    });

    return () => {
      destroyed = true;
      if (mapInstance.current) {
        (mapInstance.current as { remove: () => void }).remove();
        mapInstance.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`relative ${className}`}>
      {/* Leaflet CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />

      {/* Cluster label style — tiny Leaflet tooltip repurposed as count badge */}
      <style>{`
        .cluster-label {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          pointer-events: none;
          white-space: nowrap;
        }
        .cluster-label::before { display: none; }
      `}</style>

      <div ref={mapRef} className="w-full h-full rounded-2xl overflow-hidden" />

      {!boundary && households.filter((h) => h.latitude && h.longitude).length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/60 rounded-2xl text-center p-4 pointer-events-none">
          <p className="text-xs font-medium text-muted-foreground">Map coming soon</p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            Add household coordinates to see markers
          </p>
        </div>
      )}
    </div>
  );
}
