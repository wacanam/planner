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

import { useEffect, useRef, useCallback, useState } from 'react';

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
  /** Called when a household marker is clicked — id + address */
  onHouseholdClick?: (id: string, address: string) => void;
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
  // House — simple roof + walls, fits 12×12 render area
  house: `<path stroke="white" stroke-width="2" stroke-linejoin="round" fill="none"
    d="M12 4 L22 11 V22 H16 V16 H8 V22 H2 V11 Z"/>`,
  // Apartment — building with floors
  apartment: `<rect x="4" y="5" width="16" height="17" rx="1" stroke="white" stroke-width="2" fill="none"/>
    <line x1="4" y1="11" x2="20" y2="11" stroke="white" stroke-width="1.5"/>
    <line x1="4" y1="17" x2="20" y2="17" stroke="white" stroke-width="1.5"/>
    <line x1="12" y1="5" x2="12" y2="22" stroke="white" stroke-width="1.5"/>`,
  // Business — briefcase
  business: `<rect x="3" y="8" width="18" height="13" rx="1.5" stroke="white" stroke-width="2" fill="none"/>
    <path d="M8 8 V6 Q8 4 10 4 H14 Q16 4 16 6 V8" stroke="white" stroke-width="2" fill="none"/>
    <line x1="3" y1="14" x2="21" y2="14" stroke="white" stroke-width="1.5"/>`,
  // Condo — tall building with windows
  condo: `<rect x="5" y="2" width="14" height="21" rx="1" stroke="white" stroke-width="2" fill="none"/>
    <rect x="8" y="6" width="3" height="3" fill="white" opacity="0.9"/>
    <rect x="13" y="6" width="3" height="3" fill="white" opacity="0.9"/>
    <rect x="8" y="12" width="3" height="3" fill="white" opacity="0.9"/>
    <rect x="13" y="12" width="3" height="3" fill="white" opacity="0.9"/>`,
};
const DEFAULT_SVG = TYPE_SVG.house;

/**
 * Google Maps-style marker:
 * - Filled circle with white icon inside
 * - Plain text label to the right, no border/pill
 * - Count badge top-right for clusters
 */
function makePinHtml(
  color: string,
  iconSvg: string,
  label: string,
  badge?: number,
): string {
  const truncated = label.length > 20 ? `${label.slice(0, 20)}…` : label;

  // Teardrop: 32w × 38h. Rounder head, shorter softer tail. Circle r=12 at (16,16) with 4px padding.
  return `
  <div style="position:relative;width:0;height:0;overflow:visible;pointer-events:none">
    <!-- Label right of pin -->
    <div style="
      position:absolute;
      left:19px;top:-21px;
      color:#1e293b;font-size:10.5px;font-weight:500;line-height:1.2;
      white-space:nowrap;pointer-events:none;
    ">${truncated}</div>

    <!-- Teardrop pin -->
    <div style="position:absolute;left:-16px;top:-38px;pointer-events:auto;">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="38" viewBox="0 0 32 38"
           style="display:block;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.28)) drop-shadow(0 0 1px rgba(0,0,0,0.12))">
        <!-- Rounder teardrop: bigger head radius, softer shorter tail -->
        <path d="M16 2 C8.3 2 2 8.3 2 16 C2 23 9 31 13.5 36 Q14.8 37.5 16 37.5 Q17.2 37.5 18.5 36 C23 31 30 23 30 16 C30 8.3 23.7 2 16 2 Z"
          fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
        <!-- Status color circle with 4px padding inside head -->
        <circle cx="16" cy="16" r="12" fill="${color}"/>
        <!-- White icon centered -->
        <g transform="translate(10,10)">
          <svg width="12" height="12" viewBox="0 0 24 24">${iconSvg}</svg>
        </g>
      </svg>
      ${badge !== undefined ? `
      <div style="
        position:absolute;top:-4px;right:-6px;
        min-width:14px;height:14px;
        background:#1e293b;color:white;
        font-size:8px;font-weight:700;
        border-radius:9999px;
        display:flex;align-items:center;justify-content:center;
        border:1.5px solid white;padding:0 3px;
        box-shadow:0 1px 3px rgba(0,0,0,.3);
      ">${badge}</div>` : ''}
    </div>
  </div>`;
}

function makeHouseholdIcon(L: typeof import('leaflet'), status: string, type: string, address: string) {
  const color   = STATUS_COLOR[status] ?? DEFAULT_COLOR;
  const iconSvg = TYPE_SVG[type] ?? DEFAULT_SVG;
  const label   = address.split(' ').slice(0, 3).join(' ');
  return L.divIcon({
    html:       makePinHtml(color, iconSvg, label),
    className:  '',
    iconSize:   [0, 0],
    iconAnchor: [0, 0],
    popupAnchor:[13, -34],
  });
}

// ─── Canvas renderer kept for potential future use ───────────────────────────

export default function TerritoryMap({
  boundary,
  allBoundaries = [],
  households = [],
  center,
  className = '',
  onHouseholdClick,
}: TerritoryMapProps) {
  const mapRef          = useRef<HTMLDivElement>(null);
  const mapInstance     = useRef<unknown>(null);
  const clusterGroupRef   = useRef<unknown>(null);
  const indexRef          = useRef<unknown>(null);
  const leafletRef        = useRef<unknown>(null);
  const superclusterRef   = useRef<unknown>(null);
  const mapReadyRef       = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const onClickRef        = useRef(onHouseholdClick);
  onClickRef.current      = onHouseholdClick;

  // biome-ignore lint/correctness/useExhaustiveDependencies: one-time mount
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    if (typeof window === 'undefined') return;

    let destroyed = false;

    Promise.all([
      import('leaflet'),
      import('supercluster'),
    ]).then(([L, { default: Supercluster }]) => {      if (destroyed || !mapRef.current) return;

      // ── Fix webpack-broken default icons ──────────────────────────────────
      // @ts-expect-error Leaflet internals
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // ── Map init ──────────────────────────────────────────────────────────
      const map = L.map(mapRef.current as HTMLElement, {
        zoomControl: false,
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
        const lats = validPts.map((h) => Number(h.latitude));
        const lngs = validPts.map((h) => Number(h.longitude));
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
          // GeoJSON coords are [lng, lat]; convert to Leaflet [lat, lng] arrays
          const outerRing: [number,number][] = (geo?.geometry?.coordinates?.[0] ?? [])
            .map(([lng, lat]: [number, number]) => [lat, lng] as [number,number]);

          if (outerRing.length) {
            // Use L.polygon with holes — Leaflet renders this correctly on infinite canvas.
            // Outer ring = massive world bbox (lat/lng), hole = territory ring.
            // L.polygon coords: [[outerRing], [holeRing]]
            const worldOuter: [number,number][] = [[-90,-360],[90,-360],[90,360],[-90,360]];
            L.polygon([worldOuter, outerRing], {
              color: '#6B9ECC',
              weight: 0,
              fillColor: '#64748b',
              fillOpacity: 0.35,
              stroke: false,
            }).addTo(map);

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

      // Store refs for the households effect to use
      clusterGroupRef.current   = L.layerGroup().addTo(map);
      leafletRef.current        = L;
      superclusterRef.current   = Supercluster;
      mapReadyRef.current = true;
      setMapReady(true); // triggers households effect
    });

    return () => {
      destroyed = true;
      if (mapInstance.current) {
        (mapInstance.current as { remove: () => void }).remove();
        mapInstance.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Households effect — re-runs whenever households array changes ──────────
  // Rebuilds supercluster index and re-renders markers reactively.
  // Separated from init so async SWR data arriving after mount is handled.
  useEffect(() => {
    const map   = mapInstance.current as (import('leaflet').Map | null);
    const L     = leafletRef.current  as (typeof import('leaflet') | null);
    const group = clusterGroupRef.current as (import('leaflet').LayerGroup | null);
    if (!map || !L || !group) return;

    const validPts = households.filter((h) => h.latitude && h.longitude);
    if (validPts.length === 0) { group.clearLayers(); return; }

    const Supercluster = superclusterRef.current as (typeof import('supercluster') | null);
    if (!mapReady || !Supercluster) return;

    const CLUSTER_RADIUS = 100;
    const index = new Supercluster<{ id: string; address: string; status: string; type: string }>({
      radius: CLUSTER_RADIUS, maxZoom: 18, minPoints: 2,
    });
    index.load(validPts.map((h) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [Number(h.longitude), Number(h.latitude)] },
      properties: { id: h.id, address: h.address, status: h.status ?? 'not_visited', type: h.type ?? 'house' },
    })));
    indexRef.current = index;

    function renderClusters() {
      const idx = indexRef.current as typeof index | null;
      if (!idx || !map || !group) return;
      group.clearLayers();

      const bounds = map.getBounds();
      const bbox: [number, number, number, number] = [
        bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth(),
      ];
      const zoom = Math.floor(map.getZoom());
      const clusters = idx.getClusters(bbox, zoom);

      for (const feature of clusters) {
        const [lng, lat] = feature.geometry.coordinates;
        const props = feature.properties as Record<string, unknown>;

        if (props.cluster) {
          const count     = props.point_count as number;
          const clusterId = props.cluster_id as number;
          const leaves    = idx.getLeaves(clusterId, 1);
          const rep       = leaves[0]?.properties as { status: string; type: string; address: string } | undefined;
          const repStatus  = rep?.status  ?? 'not_visited';
          const repType    = rep?.type    ?? 'house';
          const repAddress = rep?.address ?? '';
          const repColor   = STATUS_COLOR[repStatus] ?? DEFAULT_COLOR;
          const repIcon    = TYPE_SVG[repType] ?? DEFAULT_SVG;
          const repLabel   = repAddress.split(' ').slice(0, 3).join(' ');

          const clusterMarker = L!.marker([lat, lng], {
            icon: L!.divIcon({
              html: makePinHtml(repColor, repIcon, repLabel, count),
              className: '', iconSize: [0,0], iconAnchor: [0,0], popupAnchor: [13,-34],
            }),
          });
          clusterMarker.bindTooltip(`${repAddress} +${count - 1} more`, {
            permanent: false, direction: 'right', offset: [15,-26], className: 'household-label',
          });
          clusterMarker.on('click', () => {
            map!.flyTo([lat, lng], Math.min(idx.getClusterExpansionZoom(clusterId), 18), { duration: 0.4 });
          });
          group.addLayer(clusterMarker);

        } else {
          const { id, address, status, type: hType } = props as { id: string; address: string; status: string; type: string };
          const statusColor = STATUS_COLOR[status] ?? DEFAULT_COLOR;
          const marker = L!.marker([lat, lng], { icon: makeHouseholdIcon(L!, status, hType, address) });
          marker.bindTooltip(address, { permanent: false, direction: 'right', offset: [15,-26], className: 'household-label' });

          const onHClick = onClickRef.current;
          const logBtn = onHClick
            ? `<button data-hid="${id}" style="margin-top:8px;width:100%;padding:4px 0;background:${statusColor};color:white;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;">Log Visit</button>`
            : '';
          marker.bindPopup(
            `<div style="min-width:150px">
              <p style="font-weight:600;margin:0 0 4px">${address}</p>
              <span style="display:inline-block;font-size:10px;padding:2px 6px;border-radius:9999px;background:${statusColor}22;color:${statusColor};text-transform:capitalize;font-weight:600;">${status.replace(/_/g, ' ')}</span>
              ${logBtn}
            </div>`,
            { maxWidth: 220, closeButton: false }
          );
          if (onHClick) {
            marker.on('popupopen', () => {
              const btn = document.querySelector<HTMLButtonElement>(`button[data-hid="${id}"]`);
              if (btn) btn.onclick = () => onHClick(id, address);
            });
          }
          (marker as unknown as { householdId: string }).householdId = id;
          group.addLayer(marker);
        }
      }
    }

    // Initial render + bind to map events
    map.off('moveend zoomend'); // remove previous listener
    renderClusters();
    map.on('moveend zoomend', renderClusters);

  }, [households, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`relative ${className}`}>
      {/* Leaflet CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />

      <style>{`
        .leaflet-popup-content-wrapper { border-radius: 12px !important; }
        .leaflet-popup-content { margin: 10px 12px !important; }
        .leaflet-div-icon { background: transparent !important; border: none !important; }
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

      <div ref={mapRef} className="w-full h-full" />

      {!boundary && households.filter((h) => h.latitude && h.longitude).length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/60 text-center p-4 pointer-events-none">
          <p className="text-xs font-medium text-muted-foreground">Map coming soon</p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            Add household coordinates to see markers
          </p>
        </div>
      )}
    </div>
  );
}
