'use client';

/**
 * TerritoryMap — MapLibre GL JS renderer
 *
 * Features:
 * - HD vector tiles via OpenFreeMap (no API key)
 * - 3D buildings at zoom ≥ 15
 * - Spotlight mask: territory interior clear, outside dimmed
 * - Household markers: supercluster + custom HTML markers
 * - Map style switcher (streets, satellite, topo, dark)
 * - Dark mode responsive
 */

import { useEffect, useRef, useState } from 'react';
import Supercluster from 'supercluster';
import {
  getCompassAccuracy,
  getHeadingFromQuaternion,
  getTiltCompensatedHeading,
  HeadingFilter,
} from '@/lib/heading-filter';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HouseholdPoint {
  id: string;
  address: string;
  latitude?: string | null;
  longitude?: string | null;
  status?: string | null;
  type?: string | null;
}

export type { StyleId };
export { MAP_STYLES };

export interface TerritoryMapProps {
  boundary?: string | null;
  allBoundaries?: Array<{ id: string; name: string; boundary: string }>;
  households?: HouseholdPoint[];
  center?: [number, number];
  className?: string;
  onHouseholdClick?: (id: string, address: string) => void;
  mapStyle?: StyleId;
}

// ─── Map styles ───────────────────────────────────────────────────────────────

const MAP_STYLES = [
  {
    id: 'streets',
    label: 'Street',
    url: 'https://tiles.openfreemap.org/styles/liberty',
  },
  {
    id: 'bright',
    label: 'Bright',
    url: 'https://tiles.openfreemap.org/styles/bright',
  },
  {
    id: 'positron',
    label: 'Light',
    url: 'https://tiles.openfreemap.org/styles/positron',
  },
  {
    id: 'dark',
    label: 'Dark',
    url: 'https://tiles.openfreemap.org/styles/dark',
  },
] as const;

type StyleId = (typeof MAP_STYLES)[number]['id'];
const DEFAULT_STYLE: StyleId = 'streets';

// ─── Status colors ────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  not_visited: '#94a3b8',
  not_home: '#f59e0b',
  return_visit: '#a855f7',
  do_not_visit: '#ef4444',
  visited: '#22c55e',
  active: '#3b82f6',
  moved: '#6b7280',
  inactive: '#6b7280',
  new: '#94a3b8',
};
const DEFAULT_COLOR = '#94a3b8';

// ─── Type icons (SVG paths, 24×24 viewBox) ───────────────────────────────────

const TYPE_SVG: Record<string, string> = {
  house:
    '<path stroke="white" stroke-width="2" stroke-linejoin="round" fill="none" d="M12 4 L22 11 V22 H16 V16 H8 V22 H2 V11 Z"/>',
  apartment:
    '<rect x="4" y="5" width="16" height="17" rx="1" stroke="white" stroke-width="2" fill="none"/><line x1="4" y1="11" x2="20" y2="11" stroke="white" stroke-width="1.5"/><line x1="4" y1="17" x2="20" y2="17" stroke="white" stroke-width="1.5"/><line x1="12" y1="5" x2="12" y2="22" stroke="white" stroke-width="1.5"/>',
  business:
    '<rect x="3" y="8" width="18" height="13" rx="1.5" stroke="white" stroke-width="2" fill="none"/><path d="M8 8 V6 Q8 4 10 4 H14 Q16 4 16 6 V8" stroke="white" stroke-width="2" fill="none"/><line x1="3" y1="14" x2="21" y2="14" stroke="white" stroke-width="1.5"/>',
  condo:
    '<rect x="5" y="2" width="14" height="21" rx="1" stroke="white" stroke-width="2" fill="none"/><rect x="8" y="6" width="3" height="3" fill="white" opacity="0.9"/><rect x="13" y="6" width="3" height="3" fill="white" opacity="0.9"/><rect x="8" y="12" width="3" height="3" fill="white" opacity="0.9"/><rect x="13" y="12" width="3" height="3" fill="white" opacity="0.9"/>',
};
const DEFAULT_SVG = TYPE_SVG.house;

// ─── Pin HTML builder ─────────────────────────────────────────────────────────

function makePinHtml(
  color: string,
  iconSvg: string,
  label: string,
  badge?: number,
  dark = false
): string {
  const truncated = label.length > 20 ? label.slice(0, 20) + '\u2026' : label;
  const labelColor = dark ? '#f1f5f9' : '#1e293b';
  const strokeColor = dark ? '#0f172a' : 'white';

  const badgeHtml =
    badge !== undefined
      ? [
          '<div style="position:absolute;top:-5px;right:-7px;min-width:16px;height:16px;',
          'background:#1e293b;color:white;font-size:9px;font-weight:700;border-radius:9999px;',
          'display:flex;align-items:center;justify-content:center;border:2px solid white;',
          'padding:0 3px;box-shadow:0 1px 4px rgba(0,0,0,.35);">',
          String(badge),
          '</div>',
        ].join('')
      : '';

  const pinSvg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="28" viewBox="0 0 26 28"',
    ' style="display:block;filter:drop-shadow(0 1px 5px rgba(0,0,0,0.28))">',
    '<path d="M13 2 C6.4 2 2 6.8 2 13 C2 19.5 7 24 11 26',
    ' A2.2 2.2 0 0 0 15 26 C19 24 24 19.5 24 13 C24 6.8 19.6 2 13 2 Z" fill="white"/>',
    '<circle cx="13" cy="13" r="9" fill="',
    color,
    '"/>',
    '<g transform="translate(7,7)"><svg width="12" height="12" viewBox="0 0 24 24">',
    iconSvg,
    '</svg></g>',
    '</svg>',
  ].join('');

  return [
    '<div style="position:relative;width:0;height:0;overflow:visible;pointer-events:none">',
    '<div style="position:absolute;left:-13px;top:-27px;pointer-events:auto;">',
    pinSvg,
    badgeHtml,
    '</div>',
    '<div style="position:absolute;left:15px;top:-19px;color:' + labelColor + ';',
    'font-size:10px;font-weight:500;line-height:1.3;white-space:nowrap;pointer-events:none;',
    '-webkit-text-stroke:2px ' + strokeColor + ';paint-order:stroke fill;">',
    truncated,
    '</div>',
    '</div>',
  ].join('');
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TerritoryMap({
  boundary,
  allBoundaries = [],
  households = [],
  center,
  className = '',
  onHouseholdClick,
  mapStyle = DEFAULT_STYLE,
}: TerritoryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<import('maplibre-gl').Map | null>(null);
  const markersRef = useRef<import('maplibre-gl').Marker[]>([]);
  const geolocateRef = useRef<import('maplibre-gl').GeolocateControl | null>(null);
  const headingAngleRef = useRef<number>(0);
  const onClickRef = useRef(onHouseholdClick);
  onClickRef.current = onHouseholdClick;

  const [mapReady, setMapReady] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const update = () => setIsDark(document.documentElement.classList.contains('dark'));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // ── Init map ──────────────────────────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: one-time mount
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    if (typeof window === 'undefined') return;

    let destroyed = false;

    import('maplibre-gl').then((mgl) => {
      if (destroyed || !mapRef.current) return;

      const validPts = households.filter((h) => h.latitude && h.longitude);
      let lng = center?.[1] ?? 124.85;
      let lat = center?.[0] ?? 8.37;
      const zoom = 14;

      // Center on boundary if available
      if (boundary) {
        try {
          const geo = JSON.parse(boundary);
          const coords: [number, number][] = geo?.geometry?.coordinates?.[0] ?? [];
          if (coords.length) {
            const lngs = coords.map(([x]) => x);
            const lats = coords.map(([, y]) => y);
            lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
            lat = (Math.min(...lats) + Math.max(...lats)) / 2;
          }
        } catch {
          /* skip */
        }
      } else if (validPts.length) {
        const lats = validPts.map((h) => Number(h.latitude));
        const lngs = validPts.map((h) => Number(h.longitude));
        lat = (Math.min(...lats) + Math.max(...lats)) / 2;
        lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      }

      const style = MAP_STYLES.find((s) => s.id === mapStyle) ?? MAP_STYLES[0];

      const map = new mgl.Map({
        container: mapRef.current as HTMLElement,
        style: style.url,
        center: [lng, lat],
        zoom,
        attributionControl: false,
      });

      map.addControl(new mgl.AttributionControl({ compact: true }), 'bottom-left');

      // GeolocateControl added BEFORE load so ref is available on first button tap
      const geolocate = new mgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showAccuracyCircle: true,
        showUserLocation: true,
        fitBoundsOptions: { zoom: 16 },
      });
      map.addControl(geolocate, 'top-right');
      geolocateRef.current = geolocate;

      mapInstance.current = map;

      map.on('load', () => {
        if (destroyed) return;

        // ── 3D buildings ────────────────────────────────────────────────────
        const layers = map.getStyle().layers;
        let labelLayerId: string | undefined;
        for (const layer of layers) {
          if (
            layer.type === 'symbol' &&
            (layer.layout as Record<string, unknown>)?.['text-field']
          ) {
            labelLayerId = layer.id;
            break;
          }
        }

        if (map.getSource('composite') || map.getSource('openmaptiles')) {
          map.addLayer(
            {
              id: '3d-buildings',
              source: map.getSource('composite') ? 'composite' : 'openmaptiles',
              'source-layer': 'building',
              type: 'fill-extrusion',
              minzoom: 15,
              paint: {
                'fill-extrusion-color': '#d4d4d4',
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-base': ['get', 'min_height'],
                'fill-extrusion-opacity': 0.6,
              },
            },
            labelLayerId
          );
        }

        // ── Context territory polygons ───────────────────────────────────────
        for (const tb of allBoundaries) {
          try {
            const geo = JSON.parse(tb.boundary);
            const sourceId = `boundary-${tb.id}`;
            map.addSource(sourceId, { type: 'geojson', data: geo });
            map.addLayer({
              id: `boundary-fill-${tb.id}`,
              type: 'fill',
              source: sourceId,
              paint: { 'fill-color': '#94a3b8', 'fill-opacity': 0.05 },
            });
            map.addLayer({
              id: `boundary-line-${tb.id}`,
              type: 'line',
              source: sourceId,
              paint: { 'line-color': '#94a3b8', 'line-width': 1.5, 'line-dasharray': [4, 4] },
            });
          } catch {
            /* skip */
          }
        }

        // ── Active territory spotlight ───────────────────────────────────────
        if (boundary) {
          try {
            const geo = JSON.parse(boundary);
            const outerRing: [number, number][] = geo?.geometry?.coordinates?.[0] ?? [];
            if (outerRing.length) {
              const worldOuter: [number, number][] = [
                [-180, -90],
                [180, -90],
                [180, 90],
                [-180, 90],
                [-180, -90],
              ];
              const maskGeo = {
                type: 'Feature',
                geometry: {
                  type: 'Polygon',
                  coordinates: [worldOuter, outerRing],
                },
              };
              map.addSource('spotlight-mask', {
                type: 'geojson',
                data: maskGeo as Parameters<typeof map.addSource>[1] extends { data: infer D }
                  ? D
                  : never,
              });
              map.addLayer({
                id: 'spotlight-fill',
                type: 'fill',
                source: 'spotlight-mask',
                paint: { 'fill-color': '#64748b', 'fill-opacity': 0.35 },
              });
              // Border
              map.addSource('active-boundary', { type: 'geojson', data: geo });
              map.addLayer({
                id: 'active-boundary-line',
                type: 'line',
                source: 'active-boundary',
                paint: { 'line-color': '#6B9ECC', 'line-width': 2.5 },
              });

              // Fit map to territory
              const lngs = outerRing.map(([x]) => x);
              const lats = outerRing.map(([, y]) => y);
              map.fitBounds(
                [
                  [Math.min(...lngs), Math.min(...lats)],
                  [Math.max(...lngs), Math.max(...lats)],
                ],
                { padding: 60, duration: 0 }
              );
            }
          } catch {
            /* skip */
          }
        }

        // Tap dot → calibration
        geolocate.on('geolocate', () => {
          const dot = map.getContainer().querySelector('.maplibregl-user-location-dot');
          if (dot && !dot.getAttribute('data-calib-listener')) {
            dot.setAttribute('data-calib-listener', '1');
          }
        });

        setMapReady(true);
      });
    });

    return () => {
      destroyed = true;
      for (const m of markersRef.current) m.remove();
      markersRef.current = [];
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // biome-ignore lint/correctness/useExhaustiveDependencies: mapReady is trigger
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapReady) return;
    const style = MAP_STYLES.find((s) => s.id === mapStyle) ?? MAP_STYLES[0];
    map.setStyle(style.url);
    // watchPosition continues after style change — markers re-added on next GPS fix
  }, [mapStyle, mapReady]);

  // ── Household markers effect ──────────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: mapReady is trigger
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapReady) return;

    // Clear existing markers
    for (const m of markersRef.current) m.remove();
    markersRef.current = [];

    const validPts = households.filter((h) => h.latitude && h.longitude);
    if (!validPts.length) return;

    import('maplibre-gl').then((mgl) => {
      if (!mapInstance.current) return;

      const index = new Supercluster<{ id: string; address: string; status: string; type: string }>(
        {
          radius: 128,
          maxZoom: 18,
          minPoints: 2,
        }
      );

      index.load(
        validPts.map((h) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [Number(h.longitude), Number(h.latitude)],
          },
          properties: {
            id: h.id,
            address: h.address,
            status: h.status ?? 'not_visited',
            type: h.type ?? 'house',
          },
        }))
      );

      function renderMarkers() {
        const m = mapInstance.current;
        if (!m) return;

        // Clear
        for (const mk of markersRef.current) mk.remove();
        markersRef.current = [];

        const bounds = m.getBounds();
        const bbox: [number, number, number, number] = [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth(),
        ];
        const zoom = Math.floor(m.getZoom());
        const clusters = index.getClusters(bbox, zoom);

        for (const feature of clusters) {
          const [lng, lat] = feature.geometry.coordinates;
          const props = feature.properties as Record<string, unknown>;

          const el = document.createElement('div');
          el.style.cssText = 'cursor:pointer;';

          if (props.cluster) {
            const count = props.point_count as number;
            const clusterId = props.cluster_id as number;
            const leaves = index.getLeaves(clusterId, 1);
            const rep = leaves[0]?.properties as
              | { status: string; type: string; address: string }
              | undefined;
            const color = STATUS_COLOR[rep?.status ?? 'not_visited'] ?? DEFAULT_COLOR;
            const icon = TYPE_SVG[rep?.type ?? 'house'] ?? DEFAULT_SVG;
            const label = (rep?.address ?? '').split(' ').slice(0, 3).join(' ');
            el.innerHTML = makePinHtml(color, icon, label, count, isDark);
            el.addEventListener('click', () => {
              m.flyTo({
                center: [lng, lat],
                zoom: Math.min(index.getClusterExpansionZoom(clusterId), 18),
                duration: 400,
              });
            });
          } else {
            const {
              id,
              address,
              status,
              type: hType,
            } = props as { id: string; address: string; status: string; type: string };
            const color = STATUS_COLOR[status] ?? DEFAULT_COLOR;
            const icon = TYPE_SVG[hType] ?? DEFAULT_SVG;
            const label = address.split(' ').slice(0, 3).join(' ');
            el.innerHTML = makePinHtml(color, icon, label, undefined, isDark);

            el.addEventListener('click', () => {
              const onHClick = onClickRef.current;
              // Show popup
              const popup = new mgl.Popup({
                closeButton: false,
                className: 'territory-popup',
                offset: [0, -30],
              })
                .setHTML(
                  [
                    '<div style="min-width:150px;padding:2px 0">',
                    '<p style="font-weight:600;margin:0 0 4px;font-size:13px">',
                    address,
                    '</p>',
                    '<span style="display:inline-block;font-size:10px;padding:2px 8px;border-radius:9999px;',
                    'background:',
                    color,
                    '22;color:',
                    color,
                    ';text-transform:capitalize;font-weight:600;">',
                    status.replace(/_/g, ' '),
                    '</span>',
                    onHClick
                      ? [
                          '<button onclick="window.__mapLogVisit(\'' +
                            id +
                            "','" +
                            address.replace(/'/g, "\\'") +
                            '\')"',
                          ' style="margin-top:8px;width:100%;padding:5px 0;background:',
                          color,
                          ';color:white;border:none;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;">',
                          'Log Visit</button>',
                        ].join('')
                      : '',
                    '</div>',
                  ].join('')
                )
                .setLngLat([lng, lat])
                .addTo(m);

              if (onHClick) {
                (window as unknown as Record<string, unknown>).__mapLogVisit = (
                  hId: string,
                  hAddr: string
                ) => {
                  popup.remove();
                  onHClick(hId, hAddr);
                };
              }
            });
          }

          const marker = new mgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([lng, lat])
            .addTo(m);
          markersRef.current.push(marker);
        }
      }

      renderMarkers();
      map?.off('moveend', renderMarkers);
      map?.on('moveend', renderMarkers);
    });
  }, [households, mapReady, isDark]);

  return (
    <div className={`relative ${className}`}>
      {/* MapLibre GL CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/maplibre-gl@5.22.0/dist/maplibre-gl.css"
        crossOrigin=""
      />

      <style>{`
        .maplibregl-canvas { outline: none; }
        .territory-popup .maplibregl-popup-content {
          border-radius: 12px !important;
          padding: 10px 12px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,.15) !important;
        }
        .territory-popup .maplibregl-popup-tip { display: none; }
        .maplibregl-div-icon { background: transparent !important; border: none !important; }
        /* Geolocate button — translucent pill matching other overlays */
        .maplibregl-ctrl-geolocate {
          background: rgba(255,255,255,0.25) !important;
          backdrop-filter: blur(2px) !important;
          -webkit-backdrop-filter: blur(2px) !important;
          border: none !important;
          border-radius: 8px !important;
          width: 32px !important;
          height: 32px !important;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15) !important;
          cursor: pointer !important;
          padding: 0 !important;
        }
        .maplibregl-ctrl-geolocate:hover { background: rgba(255,255,255,0.35) !important; }
        /* Replace icon with navigation arrow */
        .maplibregl-ctrl-geolocate .maplibregl-ctrl-icon {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='%231e293b'%3E%3Cpath d='M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z'/%3E%3C/svg%3E") !important;
          background-size: 18px 18px !important;
        }
        /* Active state — blue arrow */
        .maplibregl-ctrl-geolocate-active .maplibregl-ctrl-icon,
        .maplibregl-ctrl-geolocate-active-error .maplibregl-ctrl-icon {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Cpath d='M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z'/%3E%3C/svg%3E") !important;
        }
        .maplibregl-ctrl-top-right .maplibregl-ctrl { margin: 10px 10px 0 0 !important; }
        /* Cone marker behind the location dot */
        .loc-cone-wrapper { z-index: 1 !important; }
        .maplibregl-user-location-dot { z-index: 2 !important; }
        .maplibregl-user-location-accuracy-circle { z-index: 0 !important; }
        @keyframes location-pulse {
          0%   { transform: scale(1);   opacity: 0.7; }
          70%  { transform: scale(2.2); opacity: 0;   }
          100% { transform: scale(2.2); opacity: 0;   }
        }
      `}</style>

      <div ref={mapRef} className="w-full h-full" />

      {!boundary && households.filter((h) => h.latitude && h.longitude).length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/60 text-center p-4 pointer-events-none">
          <p className="text-xs font-medium text-muted-foreground">No map data</p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            Add a boundary or household coordinates
          </p>
        </div>
      )}
    </div>
  );
}
