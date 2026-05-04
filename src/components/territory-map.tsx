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
  getHeadingFromQuaternion,
  getTiltCompensatedHeading,
} from '@/lib/heading-filter';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HouseholdPoint {
  id: string;
  address: string;
  latitude?: string | null;
  longitude?: string | null;
  status?: string | null;
  type?: string | null;
  lastVisitDate?: string | null;
  lastVisitOutcome?: string | null;
  notes?: string | null;
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
  // Drawing mode
  isDrawing?: boolean;
  /** 'add' = tap-to-add-points + vertex drag; 'edit' = vertex drag only */
  drawMode?: 'add' | 'edit';
  onDrawingComplete?: (geojson: { type: string; coordinates: unknown }) => void;
  onDrawingStateChange?: (rings: number, activePoints: number) => void;
  onDrawingActions?: (actions: { closeRing: () => void; undoPoint: () => void; getGeoJSON: () => { type: string; coordinates: unknown } | null; clearRings: () => void }) => void;
  // Pre-seed drawing with existing boundary rings for editing
  initialDrawingRings?: [number, number][][];
  // Location / calibration (kept for callers)
  onLocationDotClick?: () => void;
  onCalibrationNeeded?: (needed: boolean) => void;
  onGeolocateReady?: (fn: () => void) => void;
  locationOn?: boolean;
  // Pin household mode
  pinHouseholdMode?: boolean;
  onHouseholdPinPlaced?: (lat: number, lng: number) => void;
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

// ─── HTML escaping ────────────────────────────────────────────────────────────

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
    escHtml(truncated),
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
  isDrawing = false,
  drawMode = 'add',
  onDrawingComplete,
  onDrawingStateChange,
  onDrawingActions,
  initialDrawingRings,
  pinHouseholdMode = false,
  onHouseholdPinPlaced,
}: TerritoryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<import('maplibre-gl').Map | null>(null);
  const markersRef = useRef<import('maplibre-gl').Marker[]>([]);
  const geolocateRef = useRef<import('maplibre-gl').GeolocateControl | null>(null);
  const onClickRef = useRef(onHouseholdClick);
  onClickRef.current = onHouseholdClick;
  // Track the currently open household popup so only one is shown at a time
  const activePopupRef = useRef<import('maplibre-gl').Popup | null>(null);
  // Pin household mode
  const [pendingPin, setPendingPin] = useState<[number, number] | null>(null);
  const pinMarkerRef = useRef<import('maplibre-gl').Marker | null>(null);
  const onHouseholdPinPlacedRef = useRef(onHouseholdPinPlaced);
  onHouseholdPinPlacedRef.current = onHouseholdPinPlaced;

  // ── Drawing state ─────────────────────────────────────────────────────────
  type LngLat = [number, number];
  const [drawRings, setDrawRings] = useState<LngLat[][]>([]);
  const [activeRing, setActiveRing] = useState<LngLat[]>([]);
  // Refs so imperative callbacks always see current state
  const drawRingsRef  = useRef<LngLat[][]>([]);
  const activeRingRef = useRef<LngLat[]>([]);
  drawRingsRef.current  = drawRings;
  activeRingRef.current = activeRing;
  const drawLastClick = useRef<number>(0);
  // Vertex drag state — shared between mousedown, mousemove, mouseup effects
  const dragVertexRef = useRef<{ ring: number; vertex: number } | null>(null);
  const dragJustEndedRef = useRef(false);
  // Long-press vertex deletion (mobile)
  const longPressHandledRef = useRef(false);
  const onDrawingCompleteRef = useRef(onDrawingComplete);
  onDrawingCompleteRef.current = onDrawingComplete;
  const onDrawingStateChangeRef = useRef(onDrawingStateChange);
  onDrawingStateChangeRef.current = onDrawingStateChange;
  const onDrawingActionsRef = useRef(onDrawingActions);
  onDrawingActionsRef.current = onDrawingActions;

  // Expose imperative drawing actions to parent.
  // onDrawingActions is intentionally NOT in the dep array — we always read it
  // via the ref (kept current above), so the latest callback is always called
  // without re-running the effect each time the parent re-renders and the
  // inline function prop gets a new identity (stable ref prevents churn).
  useEffect(() => {
    if (!isDrawing) return;
    onDrawingActionsRef.current?.({
      closeRing: () => {
        const ring = activeRingRef.current;
        if (ring.length < 3) return;
        setDrawRings((prev) => [...prev, ring]);
        setActiveRing([]);
      },
      undoPoint: () => {
        setActiveRing((prev) => prev.slice(0, -1));
      },
      getGeoJSON: () => {
        const rings = drawRingsRef.current;
        if (rings.length === 0) return null;
        return rings.length === 1
          ? { type: 'Polygon', coordinates: [[...rings[0], rings[0][0]]] }
          : { type: 'MultiPolygon', coordinates: rings.map((r) => [[...r, r[0]]]) };
      },
      clearRings: () => {
        setDrawRings([]);
        setActiveRing([]);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDrawingActions omitted intentionally; latest value read via ref
  }, [isDrawing]);

  const [mapReady, setMapReady] = useState(false);
  const [styleSeq, setStyleSeq] = useState(0); // increments on each styledata event
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

      // Compute initial map view: fit to boundary bbox if available,
      // otherwise center on households or fall back to default coords.
      let mapInit: { center: [number, number]; zoom: number } | { bounds: [[number, number], [number, number]]; fitBoundsOptions: { padding: number; maxZoom: number } };

      const boundaryBbox = (() => {
        if (!boundary) return null;
        try {
          const geo = JSON.parse(boundary);
          const geoData = geo?.geometry ?? geo;
          let allPts: [number, number][] = [];
          if (geoData?.type === 'Polygon') {
            allPts = (geoData.coordinates as [number, number][][]).flat();
          } else if (geoData?.type === 'MultiPolygon') {
            allPts = (geoData.coordinates as [number, number][][][]).flat(2);
          }
          if (!allPts.length) return null;
          let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
          for (const [lng, lat] of allPts) {
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
          }
          return { minLng, maxLng, minLat, maxLat };
        } catch {
          return null;
        }
      })();

      if (boundaryBbox) {
        mapInit = {
          bounds: [[boundaryBbox.minLng, boundaryBbox.minLat], [boundaryBbox.maxLng, boundaryBbox.maxLat]],
          fitBoundsOptions: { padding: 48, maxZoom: 17 },
        };
      } else {
        let lng = center?.[1] ?? 124.85;
        let lat = center?.[0] ?? 8.37;
        if (validPts.length) {
          const lats = validPts.map((h) => Number(h.latitude));
          const lngs = validPts.map((h) => Number(h.longitude));
          lat = (Math.min(...lats) + Math.max(...lats)) / 2;
          lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
        }
        mapInit = { center: [lng, lat], zoom: 14 };
      }

      const style = MAP_STYLES.find((s) => s.id === mapStyle) ?? MAP_STYLES[0];

      const map = new mgl.Map({
        container: mapRef.current as HTMLElement,
        style: style.url,
        ...mapInit,
        attributionControl: false,
      });

      map.addControl(new mgl.AttributionControl({ compact: true }), 'bottom-left');

      // GeolocateControl added before load — ref available immediately on first tap
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

        // ── Context + active boundary: handled by reactive useEffect ─────

        // ── Boundary/spotlight handled by reactive useEffect ─────────────────

        setMapReady(true);

        // ── Drawing layers helper — re-run after every style change ────────
        const addDrawingLayers = (m: import('maplibre-gl').Map) => {
          if (!m.getSource('draw-polygons')) {
            m.addSource('draw-polygons', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
          }
          if (!m.getSource('draw-active')) {
            m.addSource('draw-active', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
          }
          if (!m.getSource('draw-points')) {
            m.addSource('draw-points', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
          }
          if (!m.getSource('draw-completed-vertices')) {
            m.addSource('draw-completed-vertices', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
          }
          if (!m.getLayer('draw-polygons-fill'))
            m.addLayer({ id: 'draw-polygons-fill', type: 'fill',   source: 'draw-polygons',
              paint: { 'fill-color': '#10b981', 'fill-opacity': 0.25 } });
          if (!m.getLayer('draw-polygons-line'))
            m.addLayer({ id: 'draw-polygons-line', type: 'line',   source: 'draw-polygons',
              paint: { 'line-color': '#059669', 'line-width': 2.5 } });
          if (!m.getLayer('draw-active-line'))
            m.addLayer({ id: 'draw-active-line',   type: 'line',   source: 'draw-active',
              paint: { 'line-color': '#3b82f6', 'line-width': 2, 'line-dasharray': [3, 2] } });
          if (!m.getLayer('draw-points-circle'))
            m.addLayer({ id: 'draw-points-circle', type: 'circle', source: 'draw-points',
              filter: ['!=', ['get', 'first'], true],
              paint: { 'circle-radius': 6, 'circle-color': '#3b82f6',
                       'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
          if (!m.getLayer('draw-points-first'))
            m.addLayer({ id: 'draw-points-first',  type: 'circle', source: 'draw-points',
              filter: ['==', ['get', 'first'], true],
              paint: { 'circle-radius': 8, 'circle-color': '#f59e0b',
                       'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
          // Vertices of completed rings (draggable handles)
          if (!m.getLayer('draw-completed-vertices-circle'))
            m.addLayer({ id: 'draw-completed-vertices-circle', type: 'circle', source: 'draw-completed-vertices',
              paint: { 'circle-radius': 7, 'circle-color': '#059669',
                       'circle-stroke-width': 2.5, 'circle-stroke-color': '#fff' } });
        };

        // Add initially
        addDrawingLayers(map);

        // Re-add after every style change (setStyle wipes all sources+layers)
        map.on('styledata', () => {
          addDrawingLayers(map);
          setStyleSeq((n) => n + 1);
        });

        // ── Heading cone — standalone Marker with pitchAlignment:'map' ────────
        // Proper Marker so it tilts natively with map pitch (no CSS hacks)
        let coneMkr: import('maplibre-gl').Marker | null = null;
        let innerCone: HTMLElement | null = null; // rotated element (not the marker root)
        let headingRafId = 0;
        let headingAngle = 0;
        let hasHeading = false;
        let lastHeadingAngle = -1;
        let usingAOS = false;
        let userLng = 0, userLat = 0, hasPos = false;

        const createConeMarker = () => {
          if (coneMkr) return coneMkr;
          // Zero-size marker anchored at center = GPS dot position
          const el = document.createElement('div');
          el.style.cssText = 'position:absolute;width:0;height:0;overflow:visible;pointer-events:none;';

          const cone = document.createElement('div');
          cone.style.cssText = [
            'position:absolute;',
            // Center cone on the anchor point: left = -width/2, bottom = 0 (sits above anchor)
            'width:100px;height:80px;',
            'left:-50px;bottom:0;',
            'transform-origin:50% 100%;', // pivot at base center (= dot center)
            'background:radial-gradient(ellipse 40% 100% at 50% 100%, rgba(59,130,246,0.7) 0%, rgba(59,130,246,0.3) 50%, rgba(59,130,246,0) 80%);',
            'clip-path:polygon(42.5% 100%, 57.5% 100%, 92% 0%, 8% 0%);',
            'pointer-events:none;',
            'will-change:transform;',
          ].join('');

          el.appendChild(cone);
          innerCone = cone;

          // anchor:'center' — marker origin is at GPS coordinate (dot center)
          const mkr = new mgl.Marker({ element: el, anchor: 'center', pitchAlignment: 'map' });
          (mkr.getElement() as HTMLElement).style.zIndex = '1';
          const ctrl = geolocateRef.current as unknown as { _userLocationDotMarker?: import('maplibre-gl').Marker } | null;
          const dotEl = ctrl?._userLocationDotMarker?.getElement() as HTMLElement | undefined;
          if (dotEl) dotEl.style.zIndex = '3';
          coneMkr = mkr;
          return coneMkr;
        };

      const onOrientation = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
        if (usingAOS) return;
        const raw = getTiltCompensatedHeading(e);
        if (raw !== null) {
          headingAngle = raw;
          hasHeading = true;
        }
      };

      type AOSType = {
        new (opts: {
          frequency: number;
          referenceFrame?: string;
        }): {
          start(): void;
          stop(): void;
          onreading: (() => void) | null;
          onerror: ((e: unknown) => void) | null;
          quaternion: readonly [number, number, number, number];
        };
      };
      const AOS = (window as unknown as Record<string, unknown>).AbsoluteOrientationSensor as
        | AOSType
        | undefined;
      let aosSensor: InstanceType<AOSType> | null = null;

      const renderHeading = () => {
        // Only rotate — never add/remove marker in rAF loop
        if (hasHeading && hasPos && coneMkr) {
          const bearing = map.getBearing();
          const angle = (headingAngle - bearing + 360) % 360;
          if (innerCone && Math.abs(angle - lastHeadingAngle) > 0.5) {
            innerCone.style.transformOrigin = '50% 100%';
              innerCone.style.transform = `rotate(${angle}deg)`;
            lastHeadingAngle = angle;
          }
        }
        headingRafId = requestAnimationFrame(renderHeading);
      };

      // Create + add cone marker only on first GPS fix, then just update position
      geolocate.on('geolocate', (e: { coords: GeolocationCoordinates }) => {
        userLng = e.coords.longitude;
        userLat = e.coords.latitude;
        if (!hasPos) {
          // First fix: create marker and add to map
          const mkr = createConeMarker();
          mkr.setLngLat([userLng, userLat]).addTo(map);
          hasPos = true;
        } else {
          // Subsequent fixes: just move it
          coneMkr?.setLngLat([userLng, userLat]);
        }
      });

      const startHeading = () => {
        headingRafId = requestAnimationFrame(renderHeading);
        // Set dot + accuracy circle to tilt with map (pitchAlignment:'map')
        const ctrl = geolocateRef.current as unknown as {
          _userLocationDotMarker?: import('maplibre-gl').Marker;
          _accuracyCircleMarker?: import('maplibre-gl').Marker;
        } | null;
        ctrl?._userLocationDotMarker?.setPitchAlignment('map');
        ctrl?._accuracyCircleMarker?.setPitchAlignment('map');
        window.addEventListener('deviceorientationabsolute', onOrientation as EventListener, true);
        window.addEventListener('deviceorientation', onOrientation as EventListener, true);
        if (AOS) {
          try {
            aosSensor = new AOS({ frequency: 60, referenceFrame: 'screen' });
            aosSensor.onreading = () => {
              if (aosSensor) {
                headingAngle = getHeadingFromQuaternion(aosSensor.quaternion);
                hasHeading = true;
                usingAOS = true;
              }
            };
            aosSensor.onerror = () => {
              usingAOS = false;
              aosSensor = null;
            };
            aosSensor.start();
          } catch {
            aosSensor = null;
          }
        }
        type DOE = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
        const DOE = DeviceOrientationEvent as DOE;
        if (typeof DOE.requestPermission === 'function') DOE.requestPermission().catch(() => {});
      };

      const stopHeading = () => {
        cancelAnimationFrame(headingRafId);
        coneMkr?.remove();
        coneMkr = null;
        innerCone = null;
        lastHeadingAngle = -1;
        hasHeading = false;
        usingAOS = false;
        hasPos = false;
        const ctrl = geolocateRef.current as unknown as {
          _userLocationDotMarker?: import('maplibre-gl').Marker;
          _accuracyCircleMarker?: import('maplibre-gl').Marker;
        } | null;
        ctrl?._userLocationDotMarker?.setPitchAlignment('viewport');
        ctrl?._accuracyCircleMarker?.setPitchAlignment('viewport');
        aosSensor?.stop();
        aosSensor = null;
        window.removeEventListener(
          'deviceorientationabsolute',
          onOrientation as EventListener,
          true
        );
        window.removeEventListener('deviceorientation', onOrientation as EventListener, true);
      };

      geolocate.on('trackuserlocationstart', () => {
        map.easeTo({ pitch: 45, duration: 600 }); // tilt to 3D like Google Maps
        startHeading();
      });
      // userlocationlostfocus = map panned (background state) — keep cone
      // trackuserlocationend = user explicitly turned off — remove cone
      geolocate.on('trackuserlocationend', () => {
        const state = (geolocate as unknown as { _watchState?: string })._watchState;
        if (!state || state === 'OFF') {
          map.easeTo({ pitch: 0, duration: 400 });
          stopHeading();
        }
      });
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
}
, []) // eslint-disable-line react-hooks/exhaustive-deps

// biome-ignore lint/correctness/useExhaustiveDependencies: mapReady is trigger
useEffect(() => {
  const map = mapInstance.current;
  if (!map || !mapReady) return;
  const style = MAP_STYLES.find((s) => s.id === mapStyle) ?? MAP_STYLES[0];
  map.setStyle(style.url);
  // watchPosition continues after style change — markers re-added on next GPS fix
}, [mapStyle, mapReady]);

// ── Reactive boundary rendering ───────────────────────────────────────────
// biome-ignore lint/correctness/useExhaustiveDependencies: mapReady+styleSeq triggers
useEffect(() => {
  const map = mapInstance.current;
  if (!map || !mapReady) return;

  // Helper: upsert a geojson source
  const upsertSource = (id: string, data: object) => {
    const src = map.getSource(id) as import('maplibre-gl').GeoJSONSource | undefined;
    if (src) {
      src.setData(data as any);
    } else {
      map.addSource(id, { type: 'geojson', data: data as any });
    }
  };

  // ── Active territory boundary fill + line ─────────────────────────────
  if (boundary) {
    try {
      const geo = JSON.parse(boundary);

      // Build mask for spotlight (world minus territory interior)
      // Handle both raw geometry and GeoJSON Feature format
      const geoData = geo?.geometry ?? geo;
      let outerRings: [number, number][][] = [];
      if (geoData?.type === 'Polygon') {
        const ring = geoData.coordinates[0] as [number, number][];
        if (ring?.length >= 3) outerRings = [ring];
      } else if (geoData?.type === 'MultiPolygon') {
        outerRings = (geoData.coordinates as [number, number][][][])
          .map((poly) => poly[0])
          .filter((r) => r?.length >= 3);
      }

      if (outerRings.length > 0) {
        // worldOuter is counterclockwise (right-hand rule, exterior).
        // GeoJSON holes must be clockwise; ensure each inner ring is CW
        // so that MapLibre's nonzero fill rule properly punches holes.
        const worldOuter: [number, number][] = [
          [-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90],
        ];
        const ringSignedArea = (ring: [number, number][]) => {
          let area = 0;
          for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            area += ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1];
          }
          return area / 2;
        };
        // Positive signed area = CCW → reverse to CW for hole
        const ensureCW = (ring: [number, number][]): [number, number][] =>
          ringSignedArea(ring) > 0 ? [...ring].reverse() : ring;

        // Each territory ring becomes a CW hole in the spotlight mask so that
        // MapLibre's nonzero winding rule punches through the dimming layer.
        // Using individual holes (one per polygon) keeps each polygon's spotlight
        // exact — no imaginary shapes connecting separate polygons.
        const holeRings: [number, number][][] = outerRings.map(ensureCW);

        const maskGeo = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [worldOuter, ...holeRings],
          },
          properties: {},
        };
        upsertSource('spotlight-mask', maskGeo);
        if (!map.getLayer('spotlight-fill')) {
          map.addLayer({
            id: 'spotlight-fill', type: 'fill', source: 'spotlight-mask',
            paint: { 'fill-color': '#64748b', 'fill-opacity': 0.35 },
          });
        }
      }

      // Active boundary line — reuse the already-resolved geoData
      upsertSource('active-boundary', { type: 'Feature', geometry: geoData, properties: {} });
      if (!map.getLayer('active-boundary-fill')) {
        map.addLayer({
          id: 'active-boundary-fill', type: 'fill', source: 'active-boundary',
          paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.08 },
        });
      }
      if (!map.getLayer('active-boundary-line')) {
        map.addLayer({
          id: 'active-boundary-line', type: 'line', source: 'active-boundary',
          paint: { 'line-color': '#3b82f6', 'line-width': 2.5 },
        });
      }
    } catch {
      // ignore malformed boundary
    }
  } else {
    // No boundary — remove layers if they exist
    for (const id of ['spotlight-fill', 'active-boundary-fill', 'active-boundary-line']) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    for (const id of ['spotlight-mask', 'active-boundary']) {
      if (map.getSource(id)) map.removeSource(id);
    }
  }

  // ── Context (other territory) boundaries ─────────────────────────
  for (const tb of allBoundaries) {
    try {
      const geo = JSON.parse(tb.boundary);
      const geoData = geo?.geometry ?? geo;
      const srcId = `ctx-boundary-${tb.id}`;
      upsertSource(srcId, { type: 'Feature', geometry: geoData, properties: {} });
      if (!map.getLayer(`${srcId}-fill`))
        map.addLayer({ id: `${srcId}-fill`, type: 'fill', source: srcId,
          paint: { 'fill-color': '#94a3b8', 'fill-opacity': 0.05 } });
      if (!map.getLayer(`${srcId}-line`))
        map.addLayer({ id: `${srcId}-line`, type: 'line', source: srcId,
          paint: { 'line-color': '#94a3b8', 'line-width': 1.5, 'line-dasharray': [4, 4] } });
    } catch { /* skip */ }
  }
}, [boundary, allBoundaries, mapReady, styleSeq]);

// ── Hide/show stored boundary layers while in drawing mode ─────────────
useEffect(() => {
  const map = mapInstance.current;
  if (!map || !mapReady) return;
  const vis = isDrawing ? 'none' : 'visible';
  for (const id of ['spotlight-fill', 'active-boundary-fill', 'active-boundary-line']) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis);
  }
}, [isDrawing, mapReady]);

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

    const index = new Supercluster<{ id: string; address: string; status: string; type: string; lastVisitDate: string; lastVisitOutcome: string; notes: string }>({
      radius: 40,
      maxZoom: 18,
      minPoints: 2,
    });

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
          lastVisitDate: h.lastVisitDate ?? '',
          lastVisitOutcome: h.lastVisitOutcome ?? '',
          notes: h.notes ?? '',
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
        el.style.cssText = 'cursor:pointer;touch-action:manipulation;';

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
          const flyToCluster = () => {
            m.flyTo({
              center: [lng, lat],
              zoom: Math.min(index.getClusterExpansionZoom(clusterId), 18),
              duration: 400,
            });
          };
          // Listen for both click (desktop) and touchend (mobile) to handle
          // cases where MapLibre's touch handlers call e.preventDefault(),
          // which blocks the browser's synthesized click from touch.
          // Guard flag prevents double-firing on devices that fire both events.
          let clusterTouchStartX = 0, clusterTouchStartY = 0;
          let clusterTouchHandled = false;
          el.addEventListener('touchstart', (e) => {
            clusterTouchStartX = e.changedTouches[0].clientX;
            clusterTouchStartY = e.changedTouches[0].clientY;
            clusterTouchHandled = false;
          }, { passive: true });
          el.addEventListener('touchend', (e) => {
            const t = e.changedTouches[0];
            if (Math.abs(t.clientX - clusterTouchStartX) < 10 && Math.abs(t.clientY - clusterTouchStartY) < 10) {
              clusterTouchHandled = true;
              flyToCluster();
              requestAnimationFrame(() => requestAnimationFrame(() => { clusterTouchHandled = false; }));
            }
          }, { passive: true });
          el.addEventListener('click', () => {
            if (clusterTouchHandled) return;
            flyToCluster();
          });
        } else {
          const {
            id,
            address,
            status,
            type: hType,
            lastVisitDate,
            lastVisitOutcome,
            notes,
          } = props as { id: string; address: string; status: string; type: string; lastVisitDate: string; lastVisitOutcome: string; notes: string };
          const color = STATUS_COLOR[status] ?? DEFAULT_COLOR;
          const icon = TYPE_SVG[hType] ?? DEFAULT_SVG;
          const label = address.split(' ').slice(0, 3).join(' ');
          el.innerHTML = makePinHtml(color, icon, label, undefined, isDark);

          const showPopup = () => {
            const onHClick = onClickRef.current;
            const fmtEnum = (s: string) => s.replace(/_/g, ' ');
            // Format last visit date
            const visitDateStr = lastVisitDate
              ? (() => {
                  try {
                    const d = new Date(lastVisitDate);
                    if (Number.isNaN(d.getTime())) return '';
                    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                  } catch {
                    return '';
                  }
                })()
              : '';
            const trimmedNotes = notes?.trim() ?? '';
            const notesSnippet = trimmedNotes.length > 80 ? trimmedNotes.slice(0, 80) + '\u2026' : trimmedNotes;

            // Close any existing popup so only one is open at a time
            if (activePopupRef.current) {
              activePopupRef.current.remove();
              activePopupRef.current = null;
            }

            // Show popup — closeOnClick:false prevents the map's click handler
            // from immediately closing it after the marker tap is processed.
            const popup = new mgl.Popup({
              closeButton: true,
              closeOnClick: false,
              className: 'territory-popup',
              offset: [0, -38],
              maxWidth: '300px',
            })
              .setHTML(
                [
                  '<div style="padding:4px 2px;font-family:inherit;min-width:220px">',
                  // Address
                  '<p style="font-weight:700;margin:0 0 8px;font-size:14px;line-height:1.4;color:#0f172a">',
                  escHtml(address),
                  '</p>',
                  // Status badge
                  '<div style="margin-bottom:8px">',
                  '<span style="display:inline-block;font-size:11px;padding:3px 10px;border-radius:9999px;background:' +
                    color + '22;color:' + color + ';text-transform:capitalize;font-weight:600;">' +
                    escHtml(fmtEnum(status)) + '</span>',
                  '</div>',
                  // Last visit
                  visitDateStr
                    ? '<p style="margin:0 0 6px;font-size:12px;color:#64748b">' +
                        '<span style="font-weight:600;color:#475569">Last visit:</span> ' + escHtml(visitDateStr) +
                        (lastVisitOutcome ? ' &mdash; <span style="text-transform:capitalize">' + escHtml(fmtEnum(lastVisitOutcome)) + '</span>' : '') +
                      '</p>'
                    : '',
                  // Notes
                  notesSnippet
                    ? '<p style="margin:0 0 8px;font-size:12px;color:#64748b;font-style:italic;line-height:1.4">' + escHtml(notesSnippet) + '</p>'
                    : '',
                  // Log Visit button
                  onHClick
                    ? [
                        '<button onclick="window.__mapLogVisit(\'' +
                          id +
                          "','" +
                          address.replace(/\\/g, '\\\\').replace(/'/g, "\\'") +
                          '\')"',
                        ' style="margin-top:6px;width:100%;padding:9px 0;background:' + color +
                          ';color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:0.01em;">',
                        'Log Visit</button>',
                      ].join('')
                    : '',
                  '</div>',
                ].join('')
              )
              .setLngLat([lng, lat])
              .addTo(m);

            activePopupRef.current = popup;
            popup.on('close', () => {
              if (activePopupRef.current === popup) activePopupRef.current = null;
            });

            if (onHClick) {
              (window as unknown as Record<string, unknown>).__mapLogVisit = (
                hId: string,
                hAddr: string
              ) => {
                popup.remove();
                onHClick(hId, hAddr);
              };
            }
          };

          // Listen for both click (desktop) and touchend (mobile) because
          // MapLibre's internal touch handlers may call e.preventDefault() on
          // the map canvas touchend, preventing the browser from synthesising a
          // click event for touch taps on HTML marker overlays.
          // The touchHandled flag prevents double-firing when the browser also
          // fires a synthesised click after the touchend.
          let touchStartX = 0, touchStartY = 0;
          let touchHandled = false;
          el.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].clientX;
            touchStartY = e.changedTouches[0].clientY;
            touchHandled = false;
          }, { passive: true });
          el.addEventListener('touchend', (e) => {
            const t = e.changedTouches[0];
            if (Math.abs(t.clientX - touchStartX) < 10 && Math.abs(t.clientY - touchStartY) < 10) {
              touchHandled = true;
              showPopup();
              // Reset after click fires (two rAFs so the click handler can check)
              requestAnimationFrame(() => requestAnimationFrame(() => { touchHandled = false; }));
            }
          }, { passive: true });
          el.addEventListener('click', () => {
            if (touchHandled) return; // already handled by touchend above
            showPopup();
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

  // ─── Drawing: sync layers whenever rings/activeRing change ───────────────
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapReady) return;

    const setData = (src: string, data: GeoJSON.FeatureCollection) => {
      const s = map.getSource(src) as import('maplibre-gl').GeoJSONSource | undefined;
      s?.setData(data);
    };

    setData('draw-polygons', {
      type: 'FeatureCollection',
      features: drawRings.map((ring) => ({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]]] },
        properties: {},
      })),
    });

    setData('draw-active', {
      type: 'FeatureCollection',
      features: activeRing.length >= 2 ? [{
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: activeRing },
        properties: {},
      }] : [],
    });

    setData('draw-points', {
      type: 'FeatureCollection',
      features: activeRing.map((pt, i) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: pt },
        properties: { first: i === 0 },
      })),
    });

    // Draggable vertex handles for completed rings
    setData('draw-completed-vertices', {
      type: 'FeatureCollection',
      features: drawRings.flatMap((ring, ri) =>
        ring.map((pt, vi) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: pt },
          properties: { ringIdx: ri, vertexIdx: vi },
        }))
      ),
    });
  }, [drawRings, activeRing, mapReady, styleSeq]);

  // Fire state change so parent toolbar can reflect ring/point counts
  useEffect(() => {
    onDrawingStateChangeRef.current?.(drawRings.length, activeRing.length);
  }, [drawRings.length, activeRing.length]);

  // ─── Drawing: attach/detach map click + vertex drag handlers ────────────
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapReady) return;

    if (isDrawing) {
      map.getCanvas().style.cursor = drawMode === 'edit' ? 'default' : 'crosshair';
      // Disable zoom on double-tap/click so every tap adds a point (add mode only)
      if (drawMode === 'add') {
        map.doubleClickZoom.disable();
      } else {
        map.doubleClickZoom.enable();
      }
      // Seed rings from existing boundary — both in add and edit mode
      if (initialDrawingRings && initialDrawingRings.length > 0) {
        setDrawRings(initialDrawingRings);
      }
    } else {
      map.getCanvas().style.cursor = '';
      map.doubleClickZoom.enable();
      setDrawRings([]);
      setActiveRing([]);
    }

    if (!isDrawing) return;

    const addPoint = (lngLat: { lng: number; lat: number }) => {
      const pt: [number, number] = [lngLat.lng, lngLat.lat];
      setActiveRing((prev) => [...prev, pt]);
    };

    // ── Edit mode: insert a new vertex on the nearest polygon edge ────────
    const insertVertexOnEdge = (lngLat: { lng: number; lat: number }): boolean => {
      const rings = drawRingsRef.current;
      if (rings.length === 0) return false;

      const clickPx = map.project([lngLat.lng, lngLat.lat]);
      let bestRingIdx = -1;
      let bestSegIdx = -1;
      let bestDist = Infinity;
      let bestPt: [number, number] | null = null;

      for (let ri = 0; ri < rings.length; ri++) {
        const ring = rings[ri];
        const n = ring.length;
        if (n < 2) continue;
        for (let si = 0; si < n; si++) {
          const a = map.project(ring[si]);
          const b = map.project(ring[(si + 1) % n]);
          const dx = b.x - a.x, dy = b.y - a.y;
          const lenSq = dx * dx + dy * dy;
          let t = 0;
          if (lenSq > 0) {
            t = ((clickPx.x - a.x) * dx + (clickPx.y - a.y) * dy) / lenSq;
            t = Math.max(0, Math.min(1, t));
          }
          const cx = a.x + t * dx, cy = a.y + t * dy;
          const dist = Math.sqrt((clickPx.x - cx) ** 2 + (clickPx.y - cy) ** 2);
          if (dist < bestDist) {
            bestDist = dist;
            bestRingIdx = ri;
            bestSegIdx = si;
            const geo = map.unproject([cx, cy]);
            bestPt = [geo.lng, geo.lat];
          }
        }
      }

      // Only insert if the tap is within 18 px of a polygon edge
      if (bestRingIdx >= 0 && bestDist < 18 && bestPt !== null) {
        const insertPt = bestPt; // captured so TypeScript knows it's non-null inside the closure
        setDrawRings((prev) =>
          prev.map((r, ri) => {
            if (ri !== bestRingIdx) return r;
            const next = [...r];
            next.splice(bestSegIdx + 1, 0, insertPt);
            return next;
          })
        );
        return true;
      }
      return false;
    };

    // ── Edit mode: remove a vertex (ring must keep ≥ 3 vertices) ──────────
    const removeVertex = (ringIdx: number, vertexIdx: number) => {
      type LngLatPair = [number, number];
      setDrawRings((prev: LngLatPair[][]) =>
        prev
          .map((r: LngLatPair[], ri: number): LngLatPair[] | null => {
            if (ri !== ringIdx) return r;
            // Keep the ring only if it will still have ≥ 3 vertices after removal
            if (r.length <= 3) return null;
            return r.filter((_: LngLatPair, vi: number) => vi !== vertexIdx);
          })
          .filter((r: LngLatPair[] | null): r is LngLatPair[] => r !== null)
      );
    };

    // ── Desktop: add point on click (add mode) or insert vertex on edge (edit mode) ──
    const onDesktopClick = (e: import('maplibre-gl').MapMouseEvent) => {
      if ((e.originalEvent as any)?.pointerType === 'touch') return;
      if (dragJustEndedRef.current) return;
      if (drawMode === 'add') {
        addPoint(e.lngLat);
      } else if (drawMode === 'edit') {
        insertVertexOnEdge(e.lngLat);
      }
    };

    // ── Desktop: right-click on a vertex handle to delete it (edit mode) ──
    const onContextMenu = (e: MouseEvent) => {
      if (drawMode !== 'edit') return;
      // Prevent the browser context menu from appearing in edit mode
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const point: [number, number] = [e.clientX - rect.left, e.clientY - rect.top];
      const features = map.queryRenderedFeatures(point, { layers: ['draw-completed-vertices-circle'] });
      if (features.length === 0) return;
      const props = features[0].properties as Record<string, unknown>;
      const ringIdx = typeof props?.ringIdx === 'number' ? props.ringIdx : -1;
      const vertexIdx = typeof props?.vertexIdx === 'number' ? props.vertexIdx : -1;
      if (ringIdx < 0 || vertexIdx < 0) return;
      removeVertex(ringIdx, vertexIdx);
    };

    // ── Desktop: vertex drag ──────────────────────────────────────────────
    // Use capture-phase listener so we fire BEFORE MapLibre's internal
    // dragPan mousedown handler — this prevents MapLibre from ever starting
    // a pan on the same mousedown that begins a vertex drag.
    const onCanvasMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // left-click only
      if ((e as any).pointerType === 'touch') return;
      const rect = canvas.getBoundingClientRect();
      const point: [number, number] = [e.clientX - rect.left, e.clientY - rect.top];
      const features = map.queryRenderedFeatures(point, { layers: ['draw-completed-vertices-circle'] });
      if (features.length > 0) {
        const props = features[0].properties as Record<string, unknown>;
        const ringIdx = typeof props?.ringIdx === 'number' ? props.ringIdx : -1;
        const vertexIdx = typeof props?.vertexIdx === 'number' ? props.vertexIdx : -1;
        if (ringIdx < 0 || vertexIdx < 0) return;
        dragVertexRef.current = { ring: ringIdx, vertex: vertexIdx };
        dragJustEndedRef.current = false;
        // Disable dragPan in capture phase, BEFORE MapLibre's internal
        // dragPan mousedown handler fires, so the map never starts panning.
        map.dragPan.disable();
        canvas.style.cursor = 'grabbing';
      }
    };

    const onMouseMove = (e: import('maplibre-gl').MapMouseEvent) => {
      if (dragVertexRef.current) {
        // Move the vertex being dragged
        const { ring, vertex } = dragVertexRef.current;
        const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        setDrawRings((prev) =>
          prev.map((r, ri) => ri === ring ? r.map((v, vi) => vi === vertex ? pt : v) : r)
        );
      } else {
        // Hover cursor change
        const features = map.queryRenderedFeatures(e.point, { layers: ['draw-completed-vertices-circle'] });
        canvas.style.cursor = features.length > 0 ? 'grab' : 'crosshair';
      }
    };

    // rAF IDs used in onMouseUp — tracked here for cleanup on unmount
    let suppressClickRaf1 = 0;
    let suppressClickRaf2 = 0;
    const clearDragJustEnded = () => { dragJustEndedRef.current = false; };

    const onMouseUp = () => {
      if (dragVertexRef.current) {
        dragVertexRef.current = null;
        // Suppress the click that fires on the same frame as mouseup.
        // Cancelling rAF1 in cleanup prevents rAF2 from ever being scheduled.
        dragJustEndedRef.current = true;
        suppressClickRaf1 = requestAnimationFrame(() => {
          suppressClickRaf2 = requestAnimationFrame(clearDragJustEnded);
        });
        map.dragPan.enable();
        canvas.style.cursor = 'crosshair';
      }
    };

    // ── Mobile: touch start (detect vertex) / move (drag vertex) / end (add point) ─
    const canvas = map.getCanvas();
    let touchStartX = 0, touchStartY = 0;
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    const cancelLongPress = () => {
      if (longPressTimer !== null) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };
    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].clientX;
      touchStartY = e.changedTouches[0].clientY;
      // Check if the touch starts on a completed-ring vertex
      const rect = canvas.getBoundingClientRect();
      const x = touchStartX - rect.left;
      const y = touchStartY - rect.top;
      const features = map.queryRenderedFeatures([x, y], { layers: ['draw-completed-vertices-circle'] });
      if (features.length > 0) {
        const props = features[0].properties as Record<string, unknown>;
        const ringIdx = typeof props?.ringIdx === 'number' ? props.ringIdx : -1;
        const vertexIdx = typeof props?.vertexIdx === 'number' ? props.vertexIdx : -1;
        if (ringIdx < 0 || vertexIdx < 0) return;
        dragVertexRef.current = { ring: ringIdx, vertex: vertexIdx };
        // Disable map panning while dragging a vertex.
        // touch-action: none prevents browser scroll/pinch; dragPan.disable()
        // prevents MapLibre from panning on touchmove.
        canvas.style.touchAction = 'none';
        map.dragPan.disable();
        // Long-press (500 ms without move) → delete the vertex (edit mode only)
        if (drawMode === 'edit') {
          longPressTimer = setTimeout(() => {
            longPressTimer = null;
            if (dragVertexRef.current && dragVertexRef.current.ring === ringIdx && dragVertexRef.current.vertex === vertexIdx) {
              removeVertex(ringIdx, vertexIdx);
              longPressHandledRef.current = true;
              dragVertexRef.current = null;
              canvas.style.touchAction = '';
              map.dragPan.enable();
            }
          }, 500);
        }
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      // Cancel long-press if the finger moved
      cancelLongPress();
      if (!dragVertexRef.current) return;
      // touch-action: none (set in onTouchStart) prevents scroll; no need to call e.preventDefault()
      const t = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const lngLat = map.unproject([t.clientX - rect.left, t.clientY - rect.top]);
      const pt: [number, number] = [lngLat.lng, lngLat.lat];
      const { ring, vertex } = dragVertexRef.current;
      setDrawRings((prev) =>
        prev.map((r, ri) => ri === ring ? r.map((v, vi) => vi === vertex ? pt : v) : r)
      );
    };
    const onTouchEnd = (e: TouchEvent) => {
      cancelLongPress();
      // If long-press deletion was handled, skip everything
      if (longPressHandledRef.current) {
        longPressHandledRef.current = false;
        return;
      }
      // If dragging a vertex, finalize — do NOT add a new point
      if (dragVertexRef.current) {
        dragVertexRef.current = null;
        canvas.style.touchAction = ''; // restore scroll
        map.dragPan.enable();          // restore map panning
        return;
      }
      // Otherwise treat as a tap-to-add-point (add mode) or edge vertex insert (edit mode)
      const t = e.changedTouches[0];
      const dx = Math.abs(t.clientX - touchStartX);
      const dy = Math.abs(t.clientY - touchStartY);
      if (dx > 10 || dy > 10) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const lngLat = map.unproject([t.clientX - rect.left, t.clientY - rect.top]);
      if (drawMode === 'add') {
        addPoint(lngLat);
      } else if (drawMode === 'edit') {
        insertVertexOnEdge(lngLat);
      }
    };

    map.on('click', onDesktopClick);
    // Register in capture phase so our handler fires BEFORE MapLibre's
    // internal dragPan mousedown handler — this lets us call
    // map.dragPan.disable() before MapLibre begins tracking a pan.
    canvas.addEventListener('mousedown', onCanvasMouseDown, { capture: true });
    canvas.addEventListener('contextmenu', onContextMenu);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      cancelLongPress();
      // Cancel pending rAFs before they fire (prevents rAF2 from being scheduled)
      cancelAnimationFrame(suppressClickRaf1);
      cancelAnimationFrame(suppressClickRaf2);
      dragJustEndedRef.current = false; // immediate reset if cleanup runs mid-drag
      longPressHandledRef.current = false;
      if (dragVertexRef.current) {
        map.dragPan.enable(); // safety-net: restore pan if effect tears down mid-drag
        dragVertexRef.current = null;
      }
      map.off('click', onDesktopClick);
      canvas.removeEventListener('mousedown', onCanvasMouseDown, { capture: true });
      canvas.removeEventListener('contextmenu', onContextMenu);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDrawing, drawMode, mapReady]);

  // ─── Drawing: fire onDrawingComplete when drawing mode is turned off ─────
  const prevIsDrawing = useRef(isDrawing);
  useEffect(() => {
    if (prevIsDrawing.current && !isDrawing) {
      const rings = drawRingsRef.current;
      if (rings.length > 0) {
        const geojson = rings.length === 1
          ? { type: 'Polygon', coordinates: [[...rings[0], rings[0][0]]] }
          : { type: 'MultiPolygon', coordinates: rings.map((r) => [[...r, r[0]]]) };
        onDrawingCompleteRef.current?.(geojson);
      }
    }
    prevIsDrawing.current = isDrawing;
  }, [isDrawing]);

  // ─── Pin household mode: tap map to drop a pin ───────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: mapReady is trigger
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapReady) return;

    if (!pinHouseholdMode) {
      pinMarkerRef.current?.remove();
      pinMarkerRef.current = null;
      setPendingPin(null);
      if (!isDrawing) map.getCanvas().style.cursor = '';
      return;
    }

    map.getCanvas().style.cursor = 'crosshair';

    const placePinAt = (lat: number, lng: number) => {
      setPendingPin([lat, lng]);
      if (pinMarkerRef.current) {
        pinMarkerRef.current.setLngLat([lng, lat]);
      } else {
        import('maplibre-gl').then((mgl) => {
          if (!mapInstance.current) return;
          const el = document.createElement('div');
          el.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 26 34"' +
            ' style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.35))">' +
            '<path d="M13 2 C6.4 2 2 6.8 2 13 C2 19.5 7 24 11 26 A2.2 2.2 0 0 0 15 26' +
            ' C19 24 24 19.5 24 13 C24 6.8 19.6 2 13 2 Z" fill="#ef4444"/>' +
            '<circle cx="13" cy="13" r="5" fill="white"/>' +
            '</svg>';
          const marker = new mgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([lng, lat])
            .addTo(mapInstance.current);
          pinMarkerRef.current = marker;
        });
      }
    };

    const handleClick = (e: import('maplibre-gl').MapMouseEvent) => {
      if ((e.originalEvent as unknown as { pointerType?: string })?.pointerType === 'touch') return;
      placePinAt(e.lngLat.lat, e.lngLat.lng);
    };

    const canvas = map.getCanvas();
    let pinTouchStartX = 0;
    let pinTouchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      pinTouchStartX = e.changedTouches[0].clientX;
      pinTouchStartY = e.changedTouches[0].clientY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (
        Math.abs(t.clientX - pinTouchStartX) > 10 ||
        Math.abs(t.clientY - pinTouchStartY) > 10
      )
        return;
      const rect = canvas.getBoundingClientRect();
      const lngLat = map.unproject([t.clientX - rect.left, t.clientY - rect.top]);
      placePinAt(lngLat.lat, lngLat.lng);
    };

    map.on('click', handleClick);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      map.off('click', handleClick);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      if (!isDrawing) map.getCanvas().style.cursor = '';
    };
  }, [pinHouseholdMode, mapReady, isDrawing]);

  return (
    <div className={`relative ${className}`}>
      <link
        rel="stylesheet"
        href="https://unpkg.com/maplibre-gl@5.22.0/dist/maplibre-gl.css"
        crossOrigin=""
      />

      <style>{`
        .maplibregl-canvas { outline: none; }
        .territory-popup .maplibregl-popup-content {
          border-radius: 14px !important;
          padding: 14px 16px !important;
          box-shadow: 0 8px 28px rgba(0,0,0,.18) !important;
          min-width: 220px !important;
        }
        .territory-popup .maplibregl-popup-tip { display: none; }
        .territory-popup .maplibregl-popup-close-button {
          font-size: 18px !important;
          padding: 4px 8px !important;
          color: #64748b !important;
          top: 4px !important;
          right: 4px !important;
        }
        .maplibregl-div-icon { background: transparent !important; border: none !important; }
        /* Geolocate — translucent, navigation arrow icon */
        .maplibregl-ctrl-top-right .maplibregl-ctrl-group { background: transparent !important; border: none !important; box-shadow: none !important; }
        .maplibregl-ctrl-geolocate { background: rgba(255,255,255,0.25) !important; backdrop-filter: blur(2px) !important; -webkit-backdrop-filter: blur(2px) !important; border: none !important; border-radius: 8px !important; width: 32px !important; height: 32px !important; box-shadow: 0 1px 4px rgba(0,0,0,0.15) !important; cursor: pointer !important; padding: 0 !important; }
        .maplibregl-ctrl-geolocate:hover { background: rgba(255,255,255,0.35) !important; }
        .maplibregl-ctrl-geolocate .maplibregl-ctrl-icon { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='%231e293b'%3E%3Cpath d='M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z'/%3E%3C/svg%3E") !important; background-size: 18px 18px !important; }
        .maplibregl-ctrl-geolocate-active .maplibregl-ctrl-icon, .maplibregl-ctrl-geolocate-active-error .maplibregl-ctrl-icon { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Cpath d='M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z'/%3E%3C/svg%3E") !important; }
        .maplibregl-ctrl-top-right .maplibregl-ctrl { margin: 10px 10px 0 0 !important; }
        /* Cone marker behind the location dot */
        .loc-cone-wrapper { z-index: 1 !important; }
        .maplibregl-user-location-dot { z-index: 2 !important; }
        /* Accuracy circle — Google Maps style: large soft blue, very transparent */
        .maplibregl-user-location-accuracy-circle {
          background: rgba(59,130,246,0.08) !important;
          border: 1.5px solid rgba(59,130,246,0.2) !important;
          z-index: 0 !important;
        }
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

      {pinHouseholdMode && !pendingPin && (
        <div className="absolute top-4 inset-x-0 flex justify-center z-[100] pointer-events-none">
          <div className="px-4 py-2 bg-black/70 text-white rounded-full text-xs font-medium">
            Tap map to place pin
          </div>
        </div>
      )}

      {pinHouseholdMode && pendingPin && (
        <div className="absolute bottom-6 inset-x-0 flex justify-center z-[100]">
          <button
            type="button"
            onClick={() => {
              const [lat, lng] = pendingPin;
              onHouseholdPinPlacedRef.current?.(lat, lng);
              setPendingPin(null);
              pinMarkerRef.current?.remove();
              pinMarkerRef.current = null;
            }}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold text-sm shadow-lg"
          >
            ✓ Confirm Pin
          </button>
        </div>
      )}
    </div>
  );
}
