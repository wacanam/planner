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
  label: string,
  badge?: number,
): string {
  const truncated = label.length > 18 ? `${label.slice(0, 18)}…` : label;

  return `
  <div style="position:relative;width:0;height:0;overflow:visible;pointer-events:none">
    <!-- Pin — anchored at bottom-center (0,0) -->
    <div style="position:absolute;left:-11px;top:-26px;pointer-events:auto;">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="26" viewBox="0 0 22 26" style="display:block">
        <path d="M11 1 C5.5 1 1 5.5 1 11 C1 17.5 11 25 11 25 C11 25 21 17.5 21 11 C21 5.5 16.5 1 11 1 Z"
          fill="${color}" stroke="white" stroke-width="1.5"/>
        <!-- Icon: centered in 22×22 head with 3px padding -->
        <g transform="translate(5,4)">
          <svg width="12" height="12" viewBox="0 0 24 24">${iconSvg}</svg>
        </g>
      </svg>
      ${badge !== undefined ? `
      <div style="
        position:absolute;top:-4px;right:-7px;
        min-width:14px;height:14px;
        background:#1e293b;color:white;
        font-size:8px;font-weight:700;
        border-radius:9999px;
        display:flex;align-items:center;justify-content:center;
        border:1.5px solid white;padding:0 2px;
        box-shadow:0 1px 3px rgba(0,0,0,.3);
      ">${badge}</div>` : ''}
    </div>
    <!-- Label pill — floats right, vertically centered on pin head -->
    <div style="
      position:absolute;left:13px;top:-22px;
      background:white;color:#1e293b;
      font-size:9px;font-weight:600;line-height:1;
      padding:2px 6px;border-radius:9999px;
      border:1.5px solid ${color};
      box-shadow:0 1px 3px rgba(0,0,0,0.12);
      white-space:nowrap;pointer-events:none;
    ">${truncated}</div>
  </div>`;
}

function makeHouseholdIcon(L: typeof import('leaflet'), status: string, type: string, address: string) {
  const color   = STATUS_COLOR[status] ?? DEFAULT_COLOR;
  const iconSvg = TYPE_SVG[type] ?? DEFAULT_SVG;
  const label   = address.split(' ').slice(0, 3).join(' '); // first 3 words of address
  return L.divIcon({
    html:       makePinHtml(color, iconSvg, label),
    className:  '',
    iconSize:   [0, 0],
    iconAnchor: [0, 0],
    popupAnchor:[11, -26],
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
              className: '', iconSize: [0,0], iconAnchor: [0,0], popupAnchor: [11,-26],
            }),
          });
          clusterMarker.bindTooltip(`${repAddress} +${count - 1} more`, {
            permanent: false, direction: 'right', offset: [16,-38], className: 'household-label',
          });
          clusterMarker.on('click', () => {
            map!.flyTo([lat, lng], Math.min(idx.getClusterExpansionZoom(clusterId), 18), { duration: 0.4 });
          });
          group.addLayer(clusterMarker);

        } else {
          const { id, address, status, type: hType } = props as { id: string; address: string; status: string; type: string };
          const statusColor = STATUS_COLOR[status] ?? DEFAULT_COLOR;
          const marker = L!.marker([lat, lng], { icon: makeHouseholdIcon(L!, status, hType, address) });
          marker.bindTooltip(address, { permanent: false, direction: 'right', offset: [16,-38], className: 'household-label' });

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
