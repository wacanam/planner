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
  type?: string | null;
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

// Status → fill color
const STATUS_COLOR: Record<string, string> = {
  not_visited:   '#94a3b8',
  not_home:      '#f59e0b',
  return_visit:  '#a855f7',
  do_not_visit:  '#ef4444',
  visited:       '#22c55e',
  active:        '#3b82f6',
  moved:         '#6b7280',
  inactive:      '#6b7280',
  new:           '#94a3b8',
};
const DEFAULT_COLOR = '#94a3b8';

// Type → SVG path (24×24 viewBox, centered glyph)
// Each icon is a white-stroked shape on a colored background pin
const TYPE_SVG: Record<string, string> = {
  // Simple house outline
  house: `<path stroke="white" stroke-width="1.5" stroke-linejoin="round" fill="none"
    d="M4 10 L12 3 L20 10 V20 H14 V15 H10 V20 H4 Z"/>`,
  // Apartment / multi-floor building
  apartment: `<rect x="5" y="4" width="14" height="16" rx="1" stroke="white" stroke-width="1.5" fill="none"/>
    <line x1="9" y1="4" x2="9" y2="20" stroke="white" stroke-width="1"/>
    <line x1="15" y1="4" x2="15" y2="20" stroke="white" stroke-width="1"/>
    <line x1="5" y1="10" x2="19" y2="10" stroke="white" stroke-width="1"/>
    <line x1="5" y1="16" x2="19" y2="16" stroke="white" stroke-width="1"/>`,
  // Business / office
  business: `<rect x="4" y="7" width="16" height="13" rx="1" stroke="white" stroke-width="1.5" fill="none"/>
    <path d="M9 7 V5 Q9 4 10 4 H14 Q15 4 15 5 V7" stroke="white" stroke-width="1.5" fill="none"/>
    <line x1="12" y1="11" x2="12" y2="16" stroke="white" stroke-width="1"/>
    <line x1="8" y1="13.5" x2="16" y2="13.5" stroke="white" stroke-width="1"/>`,
  // Condo / high-rise
  condo: `<rect x="6" y="2" width="12" height="20" rx="1" stroke="white" stroke-width="1.5" fill="none"/>
    <rect x="9" y="5" width="2" height="2" fill="white" opacity="0.8"/>
    <rect x="13" y="5" width="2" height="2" fill="white" opacity="0.8"/>
    <rect x="9" y="10" width="2" height="2" fill="white" opacity="0.8"/>
    <rect x="13" y="10" width="2" height="2" fill="white" opacity="0.8"/>
    <rect x="9" y="15" width="2" height="2" fill="white" opacity="0.8"/>
    <rect x="13" y="15" width="2" height="2" fill="white" opacity="0.8"/>`,
  // Do not visit — X circle
  do_not_visit: `<circle cx="12" cy="12" r="8" stroke="white" stroke-width="1.5" fill="none"/>
    <line x1="8" y1="8" x2="16" y2="16" stroke="white" stroke-width="2"/>
    <line x1="16" y1="8" x2="8" y2="16" stroke="white" stroke-width="2"/>`,
};
const DEFAULT_SVG = TYPE_SVG.house;

/**
 * Build a Leaflet DivIcon for a household point.
 * Shape = type, fill color = status.
 * Pin is a 28×34px teardrop with the icon inside.
 */
/**
 * Shared pin+label builder used for both individual and cluster markers.
 * Uses width:0 container + overflow:visible so the label never shifts
 * sibling markers — it floats freely without affecting layout flow.
 * zIndexOffset on the Leaflet marker keeps hovered/active pins on top.
 */
function makePinHtml(
  color: string,
  iconSvg: string,
  badge?: number,
): string {
  const badgeSize = badge !== undefined ? (badge > 99 ? 20 : 16) : 0;

  return `
  <div style="position:relative;width:0;height:0;overflow:visible;pointer-events:none">
    <!-- Pin — anchored at bottom-center (0,0) -->
    <div style="position:absolute;left:-16px;top:-38px;pointer-events:auto;">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="38" viewBox="0 0 32 38" style="display:block">
        <path d="M16 1 C8.3 1 2 7.3 2 15 C2 24 16 37 16 37 C16 37 30 24 30 15 C30 7.3 23.7 1 16 1 Z"
          fill="${color}" stroke="white" stroke-width="1.8"/>
        <!-- Icon with generous padding: 8px on all sides inside 32×32 head -->
        <g transform="translate(6,4)">
          <svg width="20" height="20" viewBox="0 0 24 24">${iconSvg}</svg>
        </g>
      </svg>
      ${badge !== undefined ? `
      <div style="
        position:absolute;top:-5px;right:-9px;
        min-width:${badgeSize}px;height:${badgeSize}px;
        background:#1e293b;color:white;
        font-size:9px;font-weight:700;
        border-radius:9999px;
        display:flex;align-items:center;justify-content:center;
        border:1.5px solid white;padding:0 3px;
        box-shadow:0 1px 3px rgba(0,0,0,.3);
      ">${badge}</div>` : ''}
    </div>
  </div>`;
}

function makeHouseholdIcon(L: typeof import('leaflet'), status: string, type: string) {
  const color   = STATUS_COLOR[status] ?? DEFAULT_COLOR;
  const iconSvg = TYPE_SVG[type] ?? DEFAULT_SVG;
  return L.divIcon({
    html:       makePinHtml(color, iconSvg),
    className:  '',
    iconSize:   [0, 0],
    iconAnchor: [0, 0],
    popupAnchor:[16, -38],
  });
}

// ─── Canvas renderer kept for potential future use ───────────────────────────

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

      // ── Canvas renderer (available for future canvas layers) ─────────────
      const canvasRenderer = L.canvas({ padding: 0.5, tolerance: 5 }); // eslint-disable-line @typescript-eslint/no-unused-vars

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

      /**
       * Buffer-based clustering radius.
       *
       * supercluster radius is in pixels at zoom 256-tile space (tile size = 256px).
       * The visual footprint of each marker is:
       *   - Pin:   32px wide
       *   - Label: ~140px wide (10px font, ~14 chars avg, + padding)
       *   - Total: ~172px at screen resolution
       *
       * Convert screen px → supercluster radius:
       *   supercluster_radius = screen_px * (256 / tileSize)
       * Leaflet default tileSize = 256, so ratio = 1.
       * We add 20% breathing room to avoid tight packing.
       *
       * At high zoom (18+) markers are far apart; at low zoom they cluster.
       * radius: 170 means two markers must be >170px apart at the current zoom
       * to render individually — matching their combined visual footprint.
       */
      const PIN_WIDTH_PX    = 32;
      const LABEL_WIDTH_PX  = 145; // ~14 chars × 10px + padding
      const BUFFER_PX       = 20;  // breathing room
      const CLUSTER_RADIUS  = PIN_WIDTH_PX + LABEL_WIDTH_PX + BUFFER_PX; // ≈ 197

      const index = new Supercluster<{ id: string; address: string; status: string; type: string }>({
        radius:    CLUSTER_RADIUS,
        maxZoom:   18,
        minPoints: 2, // even 2 overlapping markers should cluster
      });

      index.load(
        validPts.map((h) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [+h.longitude!, +h.latitude!] },
          properties: { id: h.id, address: h.address, status: h.status ?? 'not_visited', type: h.type ?? 'house' },
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
            // ── Representative pin + count badge ─────────────────────────
            // Pick one real leaf to get type/status for the icon
            const count = props.point_count as number;
            const clusterId = props.cluster_id as number;
            const leaves = index.getLeaves(clusterId, 1);
            const rep = leaves[0]?.properties as { status: string; type: string; address: string } | undefined;
            const repStatus  = rep?.status  ?? 'not_visited';
            const repType    = rep?.type    ?? 'house';
            const repAddress = rep?.address ?? '';

            // Build icon HTML: representative pin + count badge
            const repColor = STATUS_COLOR[repStatus] ?? DEFAULT_COLOR;
            const repIcon  = TYPE_SVG[repType] ?? DEFAULT_SVG;

            const html = makePinHtml(repColor, repIcon, count);

            const clusterMarker = L.marker([lat, lng], {
              icon: L.divIcon({
                html,
                className:  '',
                iconSize:   [0, 0],
                iconAnchor: [0, 0],
                popupAnchor:[16, -38],
              }),
            });

            // Label on hover
            clusterMarker.bindTooltip(`${repAddress} +${count - 1} more`, {
              permanent: false,
              direction: 'right',
              offset: [16, -38],
              className: 'household-label',
            });

            clusterMarker.on('click', () => {
              const expansionZoom = Math.min(
                index.getClusterExpansionZoom(clusterId),
                18
              );
              map.flyTo([lat, lng], expansionZoom, { duration: 0.4 });
            });

            clusterGroup.addLayer(clusterMarker);
          } else {
            // ── Individual icon marker (DivIcon, type-shaped + status-colored) ──
            const { id, address, status, type: hType } = props as { id: string; address: string; status: string; type: string };

            const marker = L.marker([lat, lng], {
              icon: makeHouseholdIcon(L, status, hType),
            });

            // Label as hover tooltip — no overlap between markers
            marker.bindTooltip(address, {
              permanent: false,
              direction: 'right',
              offset: [16, -38],
              className: 'household-label',
            });

            marker.bindPopup(
              `<div style="min-width:150px">
                <p style="font-weight:600;margin:0 0 4px">${address}</p>
                <span style="
                  display:inline-block;
                  font-size:10px;
                  padding:2px 6px;
                  border-radius:9999px;
                  background:${STATUS_COLOR[status] ?? DEFAULT_COLOR}22;
                  color:${STATUS_COLOR[status] ?? DEFAULT_COLOR};
                  text-transform:capitalize;
                  font-weight:600;
                ">
                  ${status.replace(/_/g, ' ')}
                </span>
              </div>`,
              { maxWidth: 220, closeButton: false }
            );

            (marker as unknown as { householdId: string }).householdId = id;
            clusterGroup.addLayer(marker);
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

      <style>{`
        .leaflet-popup-content-wrapper { border-radius: 12px !important; }
        .leaflet-popup-content { margin: 10px 12px !important; }
        .household-label {
          background: white !important;
          border: none !important;
          box-shadow: 0 1px 6px rgba(0,0,0,0.15) !important;
          border-radius: 9999px !important;
          padding: 2px 8px !important;
          font-size: 10px !important;
          font-weight: 600 !important;
          color: #1e293b !important;
          white-space: nowrap !important;
        }
        .household-label::before { display: none !important; }
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
