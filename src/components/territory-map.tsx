'use client';

import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface HouseholdPoint {
  id: string;
  address: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  status?: string | null;
  type?: string | null;
  lastVisitDate?: string | null;
  lastVisitOutcome?: string | null;
  notes?: string | null;
}

export interface TerritoryMapProps {
  boundary?: string | null;
  allBoundaries?: Array<{ id: string; name: string; boundary: string }>;
  households?: HouseholdPoint[];
  center?: [number, number];
  className?: string;
  onHouseholdClick?: (id: string, address: string) => void;
  mapStyle?: StyleId;
  isDrawing?: boolean;
  drawMode?: 'add' | 'edit';
  onDrawingComplete?: (geojson: { type: string; coordinates: unknown }) => void;
  onDrawingStateChange?: (rings: number, activePoints: number) => void;
  onDrawingActions?: (actions: {
    closeRing: () => void;
    undoPoint: () => void;
    getGeoJSON: () => { type: string; coordinates: unknown } | null;
    clearRings: () => void;
  }) => void;
  initialDrawingRings?: [number, number][][];
  onLocationDotClick?: () => void;
  onCalibrationNeeded?: (needed: boolean) => void;
  onGeolocateReady?: (fn: () => void) => void;
  locationOn?: boolean;
  pinHouseholdMode?: boolean;
  onHouseholdPinPlaced?: (lat: number, lng: number) => void;
  directHouseholdClick?: boolean;
  mapInteractionMode?: 'view' | 'add' | 'remove';
  onHouseholdRemove?: (id: string) => void;
  onHouseholdViewDetails?: (id: string) => void;
  onHouseholdDeleteRequest?: (id: string) => void;
}

type LngLat = [number, number];
type GoogleApi = typeof google;
type ParsedGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon;

declare global {
  interface Window {
    __plannerGoogleMapsReady?: () => void;
  }
}

const GOOGLE_MAPS_CALLBACK = '__plannerGoogleMapsReady';
let googleMapsPromise: Promise<GoogleApi> | null = null;

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#111827' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#e5e7eb' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#4b5563' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d1d5db' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#064e3b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#374151' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#f3f4f6' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4b5563' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
];

export const MAP_STYLES = [
  { id: 'streets', label: 'Street', mapTypeId: 'roadmap' as google.maps.MapTypeId, styles: null },
  { id: 'bright', label: 'Hybrid', mapTypeId: 'hybrid' as google.maps.MapTypeId, styles: null },
  { id: 'positron', label: 'Terrain', mapTypeId: 'terrain' as google.maps.MapTypeId, styles: null },
  { id: 'dark', label: 'Dark', mapTypeId: 'roadmap' as google.maps.MapTypeId, styles: DARK_MAP_STYLES },
] as const;

export type StyleId = (typeof MAP_STYLES)[number]['id'];

const DEFAULT_STYLE: StyleId = 'streets';
const STATUS_COLOR: Record<string, string> = {
  not_visited: '#64748b',
  not_home: '#f59e0b',
  return_visit: '#8b5cf6',
  do_not_visit: '#ef4444',
  visited: '#22c55e',
  active: '#3b82f6',
  moved: '#6b7280',
  inactive: '#6b7280',
  new: '#64748b',
};
const DEFAULT_COLOR = '#64748b';

function loadGoogleMaps(): Promise<GoogleApi> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Maps is browser-only.'));
  if (window.google?.maps) return Promise.resolve(window.google);
  if (googleMapsPromise) return googleMapsPromise;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured.'));
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-planner-google-maps]');
    const timeoutId = window.setTimeout(() => {
      reject(new Error('Google Maps took too long to load.'));
    }, 20_000);

    window[GOOGLE_MAPS_CALLBACK] = () => {
      window.clearTimeout(timeoutId);
      resolve(window.google);
    };

    if (existing) return;

    const script = document.createElement('script');
    script.dataset.plannerGoogleMaps = 'true';
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      googleMapsPromise = null;
      reject(new Error('Unable to load Google Maps.'));
    };
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&libraries=geometry&callback=${GOOGLE_MAPS_CALLBACK}`;
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

function parseBoundary(boundary?: string | null): ParsedGeometry | null {
  if (!boundary) return null;
  try {
    const parsed = JSON.parse(boundary) as GeoJSON.Feature | ParsedGeometry;
    const geometry = 'geometry' in parsed ? parsed.geometry : parsed;
    if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) return null;
    return geometry as ParsedGeometry;
  } catch {
    return null;
  }
}

function geometryToRings(geometry: ParsedGeometry | null): LngLat[][] {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map((ring) => ring.map(([lng, lat]) => [lng, lat] as LngLat));
  }
  return geometry.coordinates.flatMap((polygon) =>
    polygon.map((ring) => ring.map(([lng, lat]) => [lng, lat] as LngLat))
  );
}

function ringToLatLng(ring: LngLat[]): google.maps.LatLngLiteral[] {
  return ring.map(([lng, lat]) => ({ lat, lng }));
}

function validHouseholdPoints(households: HouseholdPoint[]) {
  return households
    .map((household) => ({
      ...household,
      lat: Number(household.latitude),
      lng: Number(household.longitude),
    }))
    .filter((household) => Number.isFinite(household.lat) && Number.isFinite(household.lng));
}

function geometryBounds(api: GoogleApi, geometry: ParsedGeometry | null) {
  const rings = geometryToRings(geometry);
  if (rings.length === 0) return null;
  const bounds = new api.maps.LatLngBounds();
  for (const ring of rings) {
    for (const [lng, lat] of ring) bounds.extend({ lat, lng });
  }
  return bounds;
}

function ringsToGeoJSON(rings: LngLat[][]) {
  if (rings.length === 0) return null;
  return rings.length === 1
    ? { type: 'Polygon', coordinates: [[...rings[0], rings[0][0]]] }
    : { type: 'MultiPolygon', coordinates: rings.map((ring) => [[...ring, ring[0]]]) };
}

function statusLabel(value?: string | null) {
  return (value ?? 'not_visited').replace(/_/g, ' ');
}

function markerIcon(api: GoogleApi, color: string): google.maps.Icon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
      <path d="M17 2C8.7 2 3 8 3 16.2c0 9.8 9.5 20.6 13 24.1.6.6 1.4.6 2 0 3.5-3.5 13-14.3 13-24.1C31 8 25.3 2 17 2z" fill="white" opacity=".96"/>
      <path d="M17 4.5C10.2 4.5 5.5 9.4 5.5 16.2c0 8 7.4 17.3 11.5 21.8 4.1-4.5 11.5-13.8 11.5-21.8C28.5 9.4 23.8 4.5 17 4.5z" fill="${color}"/>
      <circle cx="17" cy="16.5" r="6.2" fill="white" opacity=".94"/>
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new api.maps.Size(34, 44),
    anchor: new api.maps.Point(17, 42),
  };
}

function tempPinIcon(api: GoogleApi): google.maps.Icon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
      <path d="M17 2C8.7 2 3 8 3 16.2c0 9.8 9.5 20.6 13 24.1.6.6 1.4.6 2 0 3.5-3.5 13-14.3 13-24.1C31 8 25.3 2 17 2z" fill="#ef4444"/>
      <circle cx="17" cy="16.5" r="6.2" fill="white"/>
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new api.maps.Size(34, 44),
    anchor: new api.maps.Point(17, 42),
  };
}

function pointToSegmentDistanceMeters(point: LngLat, start: LngLat, end: LngLat) {
  const averageLat = ((point[1] + start[1] + end[1]) / 3) * (Math.PI / 180);
  const metersPerLng = Math.cos(averageLat) * 111_320;
  const metersPerLat = 110_540;
  const px = point[0] * metersPerLng;
  const py = point[1] * metersPerLat;
  const ax = start[0] * metersPerLng;
  const ay = start[1] * metersPerLat;
  const bx = end[0] * metersPerLng;
  const by = end[1] * metersPerLat;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const closestX = ax + t * dx;
  const closestY = ay + t * dy;
  return {
    distance: Math.hypot(px - closestX, py - closestY),
    point: [closestX / metersPerLng, closestY / metersPerLat] as LngLat,
  };
}

function nearestRingSegment(rings: LngLat[][], point: LngLat) {
  let nearest: { ringIndex: number; segmentIndex: number; point: LngLat; distance: number } | null = null;
  for (let ringIndex = 0; ringIndex < rings.length; ringIndex++) {
    const ring = rings[ringIndex];
    for (let segmentIndex = 0; segmentIndex < ring.length; segmentIndex++) {
      const start = ring[segmentIndex];
      const end = ring[(segmentIndex + 1) % ring.length];
      const candidate = pointToSegmentDistanceMeters(point, start, end);
      if (!nearest || candidate.distance < nearest.distance) {
        nearest = { ringIndex, segmentIndex, point: candidate.point, distance: candidate.distance };
      }
    }
  }
  return nearest;
}

function createInfoWindowContent(params: {
  household: HouseholdPoint & { lat: number; lng: number };
  color: string;
  onLogVisit?: (id: string, address: string) => void;
  onViewDetails?: (id: string) => void;
  onDeleteRequest?: (id: string) => void;
}) {
  const { household, color, onLogVisit, onViewDetails, onDeleteRequest } = params;
  const wrapper = document.createElement('div');
  wrapper.className = 'min-w-55 max-w-70 space-y-2 p-1 font-sans';

  const title = document.createElement('p');
  title.className = 'text-sm font-bold leading-snug text-slate-950';
  title.textContent = household.address || 'Unnamed household';
  wrapper.appendChild(title);

  const status = document.createElement('span');
  status.className = 'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize';
  status.style.background = `${color}22`;
  status.style.color = color;
  status.textContent = statusLabel(household.status);
  wrapper.appendChild(status);

  if (household.lastVisitDate) {
    const visit = document.createElement('p');
    visit.className = 'text-xs text-slate-600';
    const date = new Date(household.lastVisitDate);
    visit.textContent = Number.isNaN(date.getTime())
      ? ''
      : `Last visit: ${date.toLocaleDateString()}${household.lastVisitOutcome ? ` - ${statusLabel(household.lastVisitOutcome)}` : ''}`;
    if (visit.textContent) wrapper.appendChild(visit);
  }

  if (household.notes?.trim()) {
    const notes = document.createElement('p');
    notes.className = 'line-clamp-3 text-xs italic leading-relaxed text-slate-600';
    notes.textContent = household.notes.trim();
    wrapper.appendChild(notes);
  }

  const actions = document.createElement('div');
  actions.className = 'flex flex-wrap gap-1.5 pt-1';
  wrapper.appendChild(actions);

  if (onLogVisit) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rounded-lg px-3 py-2 text-xs font-semibold text-white';
    button.style.background = color;
    button.textContent = 'Log Visit';
    button.addEventListener('click', () => onLogVisit(household.id, household.address));
    actions.appendChild(button);
  }

  if (onViewDetails) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-950';
    button.textContent = 'View Details';
    button.addEventListener('click', () => onViewDetails(household.id));
    actions.appendChild(button);
  }

  if (onDeleteRequest) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600';
    button.textContent = 'Delete';
    button.addEventListener('click', () => onDeleteRequest(household.id));
    actions.appendChild(button);
  }

  return wrapper;
}

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
  onLocationDotClick,
  onCalibrationNeeded,
  onGeolocateReady,
  locationOn = false,
  pinHouseholdMode = false,
  onHouseholdPinPlaced,
  directHouseholdClick = false,
  mapInteractionMode,
  onHouseholdRemove,
  onHouseholdViewDetails,
  onHouseholdDeleteRequest,
}: TerritoryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const boundaryOverlaysRef = useRef<google.maps.MVCObject[]>([]);
  const drawingOverlaysRef = useRef<google.maps.MVCObject[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const tempPinMarkerRef = useRef<google.maps.Marker | null>(null);
  const locationMarkerRef = useRef<google.maps.Marker | null>(null);
  const locationCircleRef = useRef<google.maps.Circle | null>(null);
  const locationWatchRef = useRef<number | null>(null);
  const drawRingsRef = useRef<LngLat[][]>([]);
  const activeRingRef = useRef<LngLat[]>([]);
  const onHouseholdClickRef = useRef(onHouseholdClick);
  const onHouseholdRemoveRef = useRef(onHouseholdRemove);
  const onHouseholdViewDetailsRef = useRef(onHouseholdViewDetails);
  const onHouseholdDeleteRequestRef = useRef(onHouseholdDeleteRequest);
  const onHouseholdPinPlacedRef = useRef(onHouseholdPinPlaced);
  const directHouseholdClickRef = useRef(directHouseholdClick);
  const onDrawingCompleteRef = useRef(onDrawingComplete);
  const onDrawingStateChangeRef = useRef(onDrawingStateChange);
  const onDrawingActionsRef = useRef(onDrawingActions);
  const onLocationDotClickRef = useRef(onLocationDotClick);
  const onCalibrationNeededRef = useRef(onCalibrationNeeded);

  const [googleApi, setGoogleApi] = useState<GoogleApi | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [drawRings, setDrawRings] = useState<LngLat[][]>([]);
  const [activeRing, setActiveRing] = useState<LngLat[]>([]);

  onHouseholdClickRef.current = onHouseholdClick;
  onHouseholdRemoveRef.current = onHouseholdRemove;
  onHouseholdViewDetailsRef.current = onHouseholdViewDetails;
  onHouseholdDeleteRequestRef.current = onHouseholdDeleteRequest;
  onHouseholdPinPlacedRef.current = onHouseholdPinPlaced;
  directHouseholdClickRef.current = directHouseholdClick;
  onDrawingCompleteRef.current = onDrawingComplete;
  onDrawingStateChangeRef.current = onDrawingStateChange;
  onDrawingActionsRef.current = onDrawingActions;
  onLocationDotClickRef.current = onLocationDotClick;
  onCalibrationNeededRef.current = onCalibrationNeeded;
  drawRingsRef.current = drawRings;
  activeRingRef.current = activeRing;

  const effectiveInteractionMode = mapInteractionMode ?? (pinHouseholdMode ? 'add' : 'view');
  const effectiveInteractionModeRef = useRef(effectiveInteractionMode);
  effectiveInteractionModeRef.current = effectiveInteractionMode;
  const validPoints = useMemo(() => validHouseholdPoints(households), [households]);
  const initialRingsSignature = useMemo(() => JSON.stringify(initialDrawingRings ?? []), [initialDrawingRings]);
  const stableInitialDrawingRings = useMemo(
    () => JSON.parse(initialRingsSignature) as LngLat[][],
    [initialRingsSignature]
  );

  const clearBoundaryOverlays = useCallback(() => {
    for (const overlay of boundaryOverlaysRef.current) {
      if ('setMap' in overlay) (overlay as google.maps.Polygon | google.maps.Polyline).setMap(null);
    }
    boundaryOverlaysRef.current = [];
  }, []);

  const clearDrawingOverlays = useCallback(() => {
    for (const overlay of drawingOverlaysRef.current) {
      if ('setMap' in overlay) (overlay as google.maps.Polygon | google.maps.Polyline | google.maps.Marker).setMap(null);
    }
    drawingOverlaysRef.current = [];
  }, []);

  const renderGeometry = useCallback(
    (geometry: ParsedGeometry, options: google.maps.PolygonOptions) => {
      const api = googleApi;
      const map = mapRef.current;
      if (!api || !map) return;

      const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
      for (const polygonRings of polygons) {
        const polygon = new api.maps.Polygon({
          map,
          paths: polygonRings.map((ring) => ringToLatLng(ring.map(([lng, lat]) => [lng, lat] as LngLat))),
          clickable: false,
          ...options,
        });
        boundaryOverlaysRef.current.push(polygon);
      }
    },
    [googleApi]
  );

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((api) => {
        if (!cancelled) setGoogleApi(api);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!googleApi || !containerRef.current || mapRef.current) return;

    const style = MAP_STYLES.find((item) => item.id === mapStyle) ?? MAP_STYLES[0];
    const firstPoint = validPoints[0];
    const initialCenter = center
      ? { lat: center[0], lng: center[1] }
      : firstPoint
        ? { lat: firstPoint.lat, lng: firstPoint.lng }
        : { lat: 8.37, lng: 124.85 };

    const map = new googleApi.maps.Map(containerRef.current, {
      center: initialCenter,
      zoom: 14,
      mapTypeId: style.mapTypeId,
      styles: style.styles,
      clickableIcons: false,
      fullscreenControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      gestureHandling: 'greedy',
      controlSize: 30,
    });

    mapRef.current = map;
    infoWindowRef.current = new googleApi.maps.InfoWindow({ maxWidth: 320 });
    setMapReady(true);

    return () => {
      if (locationWatchRef.current !== null) navigator.geolocation.clearWatch(locationWatchRef.current);
      clustererRef.current?.clearMarkers();
      markersRef.current.forEach((marker) => {
        marker.setMap(null);
      });
      tempPinMarkerRef.current?.setMap(null);
      locationMarkerRef.current?.setMap(null);
      locationCircleRef.current?.setMap(null);
      clearBoundaryOverlays();
      clearDrawingOverlays();
      infoWindowRef.current?.close();
      mapRef.current = null;
    };
  }, [center, clearBoundaryOverlays, clearDrawingOverlays, googleApi, mapStyle, validPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const style = MAP_STYLES.find((item) => item.id === mapStyle) ?? MAP_STYLES[0];
    map.setMapTypeId(style.mapTypeId);
    map.setOptions({ styles: style.styles });
  }, [mapStyle]);

  useEffect(() => {
    const api = googleApi;
    const map = mapRef.current;
    if (!api || !map || !mapReady) return;
    const activeBoundary = geometryBounds(api, parseBoundary(boundary));
    if (activeBoundary && !activeBoundary.isEmpty()) {
      map.fitBounds(activeBoundary, 48);
      return;
    }
    if (validPoints.length > 1) {
      const bounds = new api.maps.LatLngBounds();
      validPoints.forEach((point) => {
        bounds.extend({ lat: point.lat, lng: point.lng });
      });
      map.fitBounds(bounds, 48);
    }
  }, [boundary, googleApi, mapReady, validPoints]);

  useEffect(() => {
    const api = googleApi;
    if (!api || !mapReady) return;
    clearBoundaryOverlays();

    for (const item of allBoundaries) {
      const geometry = parseBoundary(item.boundary);
      if (!geometry) continue;
      renderGeometry(geometry, {
        strokeColor: '#94a3b8',
        strokeOpacity: 0.7,
        strokeWeight: 1.5,
        fillColor: '#94a3b8',
        fillOpacity: 0.08,
        zIndex: 1,
      });
    }

    const activeGeometry = parseBoundary(boundary);
    if (activeGeometry) {
      renderGeometry(activeGeometry, {
        strokeColor: '#2563eb',
        strokeOpacity: 0.95,
        strokeWeight: 2.5,
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
        zIndex: 2,
      });
    }

    return clearBoundaryOverlays;
  }, [allBoundaries, boundary, clearBoundaryOverlays, googleApi, mapReady, renderGeometry]);

  useEffect(() => {
    if (!isDrawing) {
      setDrawRings([]);
      setActiveRing([]);
      return;
    }
    setDrawRings(stableInitialDrawingRings);
    setActiveRing([]);
  }, [isDrawing, stableInitialDrawingRings]);

  useEffect(() => {
    if (!isDrawing) return;
    onDrawingActionsRef.current?.({
      closeRing: () => {
        const ring = activeRingRef.current;
        if (ring.length < 3) return;
        setDrawRings((current) => [...current, ring]);
        setActiveRing([]);
      },
      undoPoint: () => setActiveRing((current) => current.slice(0, -1)),
      getGeoJSON: () => ringsToGeoJSON(drawRingsRef.current),
      clearRings: () => {
        setDrawRings([]);
        setActiveRing([]);
      },
    });
  }, [isDrawing]);

  useEffect(() => {
    onDrawingStateChangeRef.current?.(drawRings.length, activeRing.length);
  }, [activeRing.length, drawRings.length]);

  useEffect(() => {
    const api = googleApi;
    const map = mapRef.current;
    if (!api || !map || !mapReady) return;
    clearDrawingOverlays();

    for (const ring of drawRings) {
      const polygon = new api.maps.Polygon({
        map,
        paths: ringToLatLng([...ring, ring[0]]),
        strokeColor: '#059669',
        strokeWeight: 2.5,
        strokeOpacity: 0.95,
        fillColor: '#10b981',
        fillOpacity: 0.24,
        zIndex: 5,
      });
      drawingOverlaysRef.current.push(polygon);
    }

    if (activeRing.length > 0) {
      const activeLine = new api.maps.Polyline({
        map,
        path: ringToLatLng(activeRing),
        strokeColor: '#2563eb',
        strokeWeight: 2,
        strokeOpacity: 0.95,
        zIndex: 6,
      });
      drawingOverlaysRef.current.push(activeLine);
    }

    activeRing.forEach(([lng, lat], index) => {
      const marker = new api.maps.Marker({
        map,
        position: { lat, lng },
        clickable: false,
        zIndex: 20,
        icon: {
          path: api.maps.SymbolPath.CIRCLE,
          scale: index === 0 ? 7 : 5,
          fillColor: index === 0 ? '#f59e0b' : '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      drawingOverlaysRef.current.push(marker);
    });

    drawRings.forEach((ring, ringIndex) => {
      ring.forEach(([lng, lat], vertexIndex) => {
        const marker = new api.maps.Marker({
          map,
          position: { lat, lng },
          draggable: isDrawing,
          zIndex: 30,
          icon: {
            path: api.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: '#059669',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });
        marker.addListener('drag', () => {
          const position = marker.getPosition();
          if (!position) return;
          setDrawRings((current) =>
            current.map((currentRing, currentRingIndex) =>
              currentRingIndex === ringIndex
                ? currentRing.map((point, currentVertexIndex) =>
                    currentVertexIndex === vertexIndex ? [position.lng(), position.lat()] : point
                  )
                : currentRing
            )
          );
        });
        marker.addListener('rightclick', () => {
          setDrawRings((current) =>
            current
              .map((currentRing, currentRingIndex) => {
                if (currentRingIndex !== ringIndex) return currentRing;
                if (currentRing.length <= 3) return null;
                return currentRing.filter((_, currentVertexIndex) => currentVertexIndex !== vertexIndex);
              })
              .filter((ringValue): ringValue is LngLat[] => Boolean(ringValue))
          );
        });
        drawingOverlaysRef.current.push(marker);
      });
    });

    return clearDrawingOverlays;
  }, [activeRing, clearDrawingOverlays, drawRings, googleApi, isDrawing, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !isDrawing) return;
    map.setOptions({ draggableCursor: drawMode === 'add' ? 'crosshair' : 'default' });

    const listener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
      const position = event.latLng;
      if (!position) return;
      const point: LngLat = [position.lng(), position.lat()];
      if (drawMode === 'add') {
        setActiveRing((current) => [...current, point]);
        return;
      }

      const nearest = nearestRingSegment(drawRingsRef.current, point);
      if (!nearest || nearest.distance > 25) return;
      setDrawRings((current) =>
        current.map((ring, ringIndex) => {
          if (ringIndex !== nearest.ringIndex) return ring;
          const next = [...ring];
          next.splice(nearest.segmentIndex + 1, 0, nearest.point);
          return next;
        })
      );
    });

    return () => {
      listener.remove();
      map.setOptions({ draggableCursor: null });
    };
  }, [drawMode, isDrawing, mapReady]);

  useEffect(() => {
    const api = googleApi;
    const map = mapRef.current;
    if (!api || !map || !mapReady) return;
    clustererRef.current?.clearMarkers();
    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    markersRef.current = [];
    infoWindowRef.current?.close();

    const markers = validPoints.map((household) => {
      const color = STATUS_COLOR[household.status ?? 'not_visited'] ?? DEFAULT_COLOR;
      const marker = new api.maps.Marker({
        position: { lat: household.lat, lng: household.lng },
        icon: markerIcon(api, color),
        title: household.address,
        optimized: true,
      });

      marker.addListener('click', () => {
        const mode = effectiveInteractionModeRef.current;
        if (mode === 'remove' && onHouseholdRemoveRef.current) {
          infoWindowRef.current?.close();
          onHouseholdRemoveRef.current(household.id);
          return;
        }
        if (directHouseholdClickRef.current && onHouseholdClickRef.current) {
          infoWindowRef.current?.close();
          onHouseholdClickRef.current(household.id, household.address);
          return;
        }

        const content = createInfoWindowContent({
          household,
          color,
          onLogVisit: onHouseholdClickRef.current,
          onViewDetails: onHouseholdViewDetailsRef.current,
          onDeleteRequest: onHouseholdDeleteRequestRef.current,
        });
        infoWindowRef.current?.setContent(content);
        infoWindowRef.current?.open({ map, anchor: marker });
      });

      return marker;
    });

    markersRef.current = markers;
    clustererRef.current = new MarkerClusterer({ map, markers });

    return () => {
      clustererRef.current?.clearMarkers();
      markers.forEach((marker) => {
        marker.setMap(null);
      });
    };
  }, [googleApi, mapReady, validPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || isDrawing || effectiveInteractionMode !== 'add') return;
    map.setOptions({ draggableCursor: 'crosshair' });
    const listener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
      const position = event.latLng;
      if (!position) return;
      setPendingPin({ lat: position.lat(), lng: position.lng() });
    });
    return () => {
      listener.remove();
      map.setOptions({ draggableCursor: null });
    };
  }, [effectiveInteractionMode, isDrawing, mapReady]);

  useEffect(() => {
    const api = googleApi;
    const map = mapRef.current;
    if (!api || !map) return;
    tempPinMarkerRef.current?.setMap(null);
    tempPinMarkerRef.current = null;
    if (!pendingPin) return;
    tempPinMarkerRef.current = new api.maps.Marker({
      map,
      position: pendingPin,
      icon: tempPinIcon(api),
      zIndex: 50,
    });
  }, [googleApi, pendingPin]);

  const updateLocation = useCallback(
    (position: GeolocationPosition, pan = false) => {
      const api = googleApi;
      const map = mapRef.current;
      if (!api || !map) return;
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      if (!locationMarkerRef.current) {
        locationMarkerRef.current = new api.maps.Marker({
          map,
          position: coords,
          title: 'Your location',
          zIndex: 100,
          icon: {
            path: api.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: '#2563eb',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
        });
        locationMarkerRef.current.addListener('click', () => onLocationDotClickRef.current?.());
      } else {
        locationMarkerRef.current.setPosition(coords);
      }

      if (!locationCircleRef.current) {
        locationCircleRef.current = new api.maps.Circle({
          map,
          center: coords,
          radius: position.coords.accuracy,
          strokeColor: '#2563eb',
          strokeOpacity: 0.25,
          strokeWeight: 1,
          fillColor: '#2563eb',
          fillOpacity: 0.08,
        });
      } else {
        locationCircleRef.current.setCenter(coords);
        locationCircleRef.current.setRadius(position.coords.accuracy);
      }

      if (pan) map.panTo(coords);
      onCalibrationNeededRef.current?.(false);
    },
    [googleApi]
  );

  const locateOnce = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => updateLocation(position, true),
      () => onCalibrationNeededRef.current?.(true),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 }
    );
  }, [updateLocation]);

  useEffect(() => {
    onGeolocateReady?.(locateOnce);
  }, [locateOnce, onGeolocateReady]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    if (!locationOn) {
      if (locationWatchRef.current !== null) navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
      locationMarkerRef.current?.setMap(null);
      locationMarkerRef.current = null;
      locationCircleRef.current?.setMap(null);
      locationCircleRef.current = null;
      return;
    }
    locateOnce();
    locationWatchRef.current = navigator.geolocation.watchPosition(
      (position) => updateLocation(position),
      () => onCalibrationNeededRef.current?.(true),
      { enableHighAccuracy: true, maximumAge: 5_000 }
    );
    return () => {
      if (locationWatchRef.current !== null) navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    };
  }, [locateOnce, locationOn, updateLocation]);

  const previousDrawingRef = useRef(isDrawing);
  useEffect(() => {
    if (previousDrawingRef.current && !isDrawing) {
      const geojson = ringsToGeoJSON(drawRingsRef.current);
      if (geojson) onDrawingCompleteRef.current?.(geojson);
    }
    previousDrawingRef.current = isDrawing;
  }, [isDrawing]);

  const noMapData = !boundary && validPoints.length === 0;

  return (
    <div className={`relative ${className}`}>
      <style>{`
        .gm-style .gm-style-iw-c { border-radius: 14px; padding: 12px !important; }
        .gm-style .gm-style-iw-d { overflow: hidden !important; }
      `}</style>
      <div ref={containerRef} className="h-full w-full" />

      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80 p-4 text-center">
          <p className="text-sm font-semibold text-foreground">Google Maps is not ready</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">{loadError}</p>
        </div>
      )}

      {!loadError && noMapData && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-muted/50 p-4 text-center">
          <p className="text-xs font-medium text-muted-foreground">No map data</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/70">
            Add a boundary or household coordinates
          </p>
        </div>
      )}

      {effectiveInteractionMode === 'add' && !pendingPin && !isDrawing && (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 z-100 flex justify-center">
          <div className="rounded-full bg-black/70 px-4 py-2 text-xs font-medium text-white">
            Tap map to place a household
          </div>
        </div>
      )}

      {effectiveInteractionMode === 'add' && pendingPin && !isDrawing && (
        <div className="absolute inset-x-0 bottom-16 z-100 flex justify-center">
          <button
            type="button"
            onClick={() => {
              onHouseholdPinPlacedRef.current?.(pendingPin.lat, pendingPin.lng);
              setPendingPin(null);
              tempPinMarkerRef.current?.setMap(null);
              tempPinMarkerRef.current = null;
            }}
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg"
          >
            Confirm Pin
          </button>
        </div>
      )}
    </div>
  );
}