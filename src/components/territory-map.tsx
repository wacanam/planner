'use client';

import {
  Building2,
  Crosshair,
  Layers,
  LocateFixed,
  MapPinPlus,
  Minus,
  Navigation,
  Plus,
  Route,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface HouseholdPoint {
  id: string;
  address?: string | null;
  streetName?: string | null;
  city?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  status?: string | null;
  type?: string | null;
  occupantsCount?: number | null;
  membersCount?: number | null;
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
  onHouseholdAddEncounter?: (id: string, address: string) => void;
  mapStyle?: StyleId;
  onMapStyleChange?: (style: StyleId) => void;
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
  pinPlacement?: 'instant' | 'confirm';
  pinPreview?: { lat: number; lng: number } | null;
  onPinPreviewChange?: (pin: { lat: number; lng: number } | null) => void;
  directHouseholdClick?: boolean;
  mapInteractionMode?: 'view' | 'add';
  onMapInteractionModeChange?: (mode: 'view' | 'add') => void;
  onHouseholdViewDetails?: (id: string) => void;
  onHouseholdDeleteRequest?: (id: string) => void;
  showDefaultControls?: boolean;
  showPinControl?: boolean;
}

type LngLat = [number, number];
type GoogleApi = typeof google;
type GeoJsonPosition = [number, number, ...number[]];
type ParsedGeometry =
  | { type: 'Polygon'; coordinates: GeoJsonPosition[][] }
  | { type: 'MultiPolygon'; coordinates: GeoJsonPosition[][][] };
type ParsedFeature = { type?: string; geometry?: ParsedGeometry | null };

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
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#4b5563' }],
  },
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
  {
    id: 'dark',
    label: 'Dark',
    mapTypeId: 'roadmap' as google.maps.MapTypeId,
    styles: DARK_MAP_STYLES,
  },
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
  if (typeof window === 'undefined')
    return Promise.reject(new Error('Google Maps is browser-only.'));
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
    const parsed = JSON.parse(boundary) as ParsedFeature | ParsedGeometry;
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

function householdLabel(household: Pick<HouseholdPoint, 'address' | 'streetName' | 'city'>) {
  const address = household.address?.trim();
  if (address) return address;
  const locality = [household.streetName, household.city].filter(Boolean).join(', ');
  return locality || 'Unnamed household';
}

function formatHouseholdType(value?: string | null) {
  return value ? value.replace(/_/g, ' ') : 'Household';
}

function orientationHeading(event: DeviceOrientationEvent & { webkitCompassHeading?: number }) {
  const compassHeading = event.webkitCompassHeading;
  // webkitCompassHeading is already absolute (0=North, clockwise) on iOS.
  // event.alpha on Android is counter-clockwise from the initial orientation — invert it.
  const rawHeading =
    typeof compassHeading === 'number'
      ? compassHeading
      : typeof event.alpha === 'number'
        ? (360 - event.alpha) % 360
        : null;
  if (rawHeading === null) return null;
  const screenAngle =
    window.screen.orientation?.angle ??
    (window as typeof window & { orientation?: number }).orientation ??
    0;
  return (((rawHeading - screenAngle) % 360) + 360) % 360;
}

function markerIcon(api: GoogleApi, color: string, label: string): google.maps.Icon {
  const safeLabel = label
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const textWidth = Math.min(280, Math.max(72, safeLabel.length * 9));
  const iconWidth = 44 + textWidth;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${iconWidth}" height="46" viewBox="0 0 ${iconWidth} 46">
      <filter id="shadow" x="-25%" y="-15%" width="150%" height="150%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0f172a" flood-opacity="0.22"/>
      </filter>
      <path filter="url(#shadow)" d="M19 3.25C10.8 3.25 5 9.1 5 17.25c0 9.1 8.1 18.8 12.4 23.4a2.2 2.2 0 0 0 3.2 0C24.9 36.05 33 26.35 33 17.25 33 9.1 27.2 3.25 19 3.25Z" fill="white"/>
      <path d="M19 5.75c-6.75 0-11.5 4.8-11.5 11.5 0 7.25 6.2 15.55 11.5 21.25 5.3-5.7 11.5-14 11.5-21.25 0-6.7-4.75-11.5-11.5-11.5Z" fill="${color}"/>
      <path d="M13.1 17.15 19 12.2l5.9 4.95v6.7c0 .48-.39.88-.88.88h-3.08v-4.35h-3.88v4.35h-3.08a.88.88 0 0 1-.88-.88v-6.7Z" fill="white"/>
      <path d="M11.95 17.55 19 11.65l7.05 5.9" fill="none" stroke="white" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="42" y="20" fill="${color}" font-family="Inter, Arial, sans-serif" font-size="10" font-weight="700"
            stroke="white" stroke-width="3" paint-order="stroke fill"> ${safeLabel} </text>
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new api.maps.Size(iconWidth, 46),
    anchor: new api.maps.Point(19, 43),
  };
}

function tempPinIcon(api: GoogleApi): google.maps.Icon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="38" height="46" viewBox="0 0 38 46">
      <filter id="shadow" x="-25%" y="-15%" width="150%" height="150%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0f172a" flood-opacity="0.25"/>
      </filter>
      <path filter="url(#shadow)" d="M19 3.25C10.8 3.25 5 9.1 5 17.25c0 9.1 8.1 18.8 12.4 23.4a2.2 2.2 0 0 0 3.2 0C24.9 36.05 33 26.35 33 17.25 33 9.1 27.2 3.25 19 3.25Z" fill="#ef4444"/>
      <path d="M13.1 17.15 19 12.2l5.9 4.95v6.7c0 .48-.39.88-.88.88h-3.08v-4.35h-3.88v4.35h-3.08a.88.88 0 0 1-.88-.88v-6.7Z" fill="white"/>
      <path d="M11.95 17.55 19 11.65l7.05 5.9" fill="none" stroke="white" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new api.maps.Size(38, 46),
    anchor: new api.maps.Point(19, 43),
  };
}

function MapControlButton({
  title,
  active,
  children,
  onClick,
}: {
  title: string;
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm shadow-md transition active:scale-95 ${
        active
          ? 'border-blue-500 bg-blue-600 text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
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
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const closestX = ax + t * dx;
  const closestY = ay + t * dy;
  return {
    distance: Math.hypot(px - closestX, py - closestY),
    point: [closestX / metersPerLng, closestY / metersPerLat] as LngLat,
  };
}

function nearestRingSegment(rings: LngLat[][], point: LngLat) {
  let nearest: { ringIndex: number; segmentIndex: number; point: LngLat; distance: number } | null =
    null;
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
  onAddEncounter?: (id: string, address: string) => void;
  onViewDetails?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const { household, color, onLogVisit, onAddEncounter, onViewDetails, onDelete } = params;
  const wrapper = document.createElement('div');
  wrapper.className = 'min-w-64 max-w-80 space-y-3 p-1 font-sans';

  const label = householdLabel(household);
  const occupants = household.occupantsCount ?? household.membersCount;

  const title = document.createElement('p');
  title.className = 'text-sm font-bold leading-snug text-slate-950';
  title.textContent = label;
  wrapper.appendChild(title);

  const detailGrid = document.createElement('div');
  detailGrid.className = 'grid grid-cols-2 gap-1.5 text-[11px]';
  wrapper.appendChild(detailGrid);

  const addDetail = (labelText: string, valueText: string, accent?: boolean) => {
    const item = document.createElement('div');
    item.className = 'rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2';
    const itemLabel = document.createElement('p');
    itemLabel.className = 'text-[10px] font-medium uppercase text-slate-500';
    itemLabel.textContent = labelText;
    const itemValue = document.createElement('p');
    itemValue.className = 'mt-0.5 truncate font-semibold capitalize text-slate-900';
    if (accent) {
      itemValue.style.color = color;
    }
    itemValue.textContent = valueText;
    item.append(itemLabel, itemValue);
    detailGrid.appendChild(item);
  };

  addDetail('Status', statusLabel(household.status), true);
  addDetail('Type', formatHouseholdType(household.type));
  if (typeof occupants === 'number') addDetail('Occupants', String(occupants));
  if (household.city?.trim()) addDetail('Area', household.city.trim());

  if (household.lastVisitDate) {
    const visit = document.createElement('p');
    visit.className = 'rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900';
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
    button.textContent = 'Visit';
    button.addEventListener('click', () => onLogVisit(household.id, label));
    actions.appendChild(button);
  }

  if (onAddEncounter) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className =
      'rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700';
    button.textContent = 'Encounter';
    button.addEventListener('click', () => onAddEncounter(household.id, label));
    actions.appendChild(button);
  }

  if (onViewDetails) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className =
      'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-950';
    button.textContent = 'View Full Details';
    button.addEventListener('click', () => onViewDetails(household.id));
    actions.appendChild(button);
  }

  if (onDelete) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className =
      'rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700';
    button.textContent = 'Delete';
    button.addEventListener('click', () => onDelete(household.id));
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
  onHouseholdAddEncounter,
  mapStyle = DEFAULT_STYLE,
  onMapStyleChange,
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
  pinPlacement = 'instant',
  pinPreview,
  onPinPreviewChange,
  directHouseholdClick = false,
  mapInteractionMode,
  onMapInteractionModeChange,
  onHouseholdViewDetails,
  onHouseholdDeleteRequest,
  showDefaultControls = true,
  showPinControl = true,
}: TerritoryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const markerMapRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const boundaryOverlaysRef = useRef<google.maps.MVCObject[]>([]);
  const drawingOverlaysRef = useRef<google.maps.MVCObject[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const tempPinMarkerRef = useRef<google.maps.Marker | null>(null);
  const locationMarkerRef = useRef<google.maps.Marker | null>(null);
  const locationCircleRef = useRef<google.maps.Circle | null>(null);
  const headingBeamRef = useRef<google.maps.Polygon | null>(null);
  const locationWatchRef = useRef<number | null>(null);
  const headingLocationWatchRef = useRef<number | null>(null);
  const lastLocationRef = useRef<google.maps.LatLngLiteral | null>(null);
  const headingRef = useRef<number | null>(null);
  const drawRingsRef = useRef<LngLat[][]>([]);
  const activeRingRef = useRef<LngLat[]>([]);
  const onHouseholdClickRef = useRef(onHouseholdClick);
  const onHouseholdAddEncounterRef = useRef(onHouseholdAddEncounter);
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
  const [localInteractionMode, setLocalInteractionMode] = useState<'view' | 'add'>('view');
  const [localMapStyle, setLocalMapStyle] = useState<StyleId>(mapStyle);
  const [headingBeamActive, setHeadingBeamActive] = useState(false);
  const [tiltActive, setTiltActive] = useState(false);
  const [drawRings, setDrawRings] = useState<LngLat[][]>([]);
  const [activeRing, setActiveRing] = useState<LngLat[]>([]);

  onHouseholdClickRef.current = onHouseholdClick;
  onHouseholdAddEncounterRef.current = onHouseholdAddEncounter;
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

  const activeMapStyle = onMapStyleChange ? mapStyle : localMapStyle;
  const effectiveInteractionMode =
    mapInteractionMode ?? (pinHouseholdMode ? 'add' : localInteractionMode);
  const pinPreviewIsControlled = pinPreview !== undefined;
  const visiblePin = pinPreviewIsControlled ? pinPreview : pendingPin;
  const validPoints = useMemo(() => validHouseholdPoints(households), [households]);
  const initialRingsSignature = useMemo(
    () => JSON.stringify(initialDrawingRings ?? []),
    [initialDrawingRings]
  );
  const stableInitialDrawingRings = useMemo(
    () => JSON.parse(initialRingsSignature) as LngLat[][],
    [initialRingsSignature]
  );

  const setVisiblePin = useCallback(
    (pin: { lat: number; lng: number } | null) => {
      if (pinPreviewIsControlled) {
        onPinPreviewChange?.(pin);
        return;
      }
      setPendingPin(pin);
    },
    [onPinPreviewChange, pinPreviewIsControlled]
  );

  const setInteractionMode = useCallback(
    (mode: 'view' | 'add') => {
      if (onMapInteractionModeChange) {
        onMapInteractionModeChange(mode);
        return;
      }
      setLocalInteractionMode(mode);
    },
    [onMapInteractionModeChange]
  );

  const setStyle = useCallback(
    (style: StyleId) => {
      if (onMapStyleChange) {
        onMapStyleChange(style);
        return;
      }
      setLocalMapStyle(style);
    },
    [onMapStyleChange]
  );

  useEffect(() => {
    setLocalMapStyle(mapStyle);
  }, [mapStyle]);

  const clearBoundaryOverlays = useCallback(() => {
    for (const overlay of boundaryOverlaysRef.current) {
      if ('setMap' in overlay) (overlay as google.maps.Polygon | google.maps.Polyline).setMap(null);
    }
    boundaryOverlaysRef.current = [];
  }, []);

  const clearDrawingOverlays = useCallback(() => {
    for (const overlay of drawingOverlaysRef.current) {
      if ('setMap' in overlay)
        (overlay as google.maps.Polygon | google.maps.Polyline | google.maps.Marker).setMap(null);
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
          paths: polygonRings.map((ring) =>
            ringToLatLng(ring.map(([lng, lat]) => [lng, lat] as LngLat))
          ),
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

    const style = MAP_STYLES.find((item) => item.id === activeMapStyle) ?? MAP_STYLES[0];
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
      if (locationWatchRef.current !== null)
        navigator.geolocation.clearWatch(locationWatchRef.current);
      if (headingLocationWatchRef.current !== null)
        navigator.geolocation.clearWatch(headingLocationWatchRef.current);
      for (const marker of markerMapRef.current.values()) {
        marker.setMap(null);
      }
      markerMapRef.current.clear();
      tempPinMarkerRef.current?.setMap(null);
      locationMarkerRef.current?.setMap(null);
      locationCircleRef.current?.setMap(null);
      headingBeamRef.current?.setMap(null);
      clearBoundaryOverlays();
      clearDrawingOverlays();
      infoWindowRef.current?.close();
      mapRef.current = null;
    };
  }, [activeMapStyle, center, clearBoundaryOverlays, clearDrawingOverlays, googleApi, validPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const style = MAP_STYLES.find((item) => item.id === activeMapStyle) ?? MAP_STYLES[0];
    map.setMapTypeId(style.mapTypeId);
    map.setOptions({ styles: style.styles });
  }, [activeMapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.setTilt(tiltActive ? 45 : 0);
    if (tiltActive) {
      map.setHeading(20);
    } else {
      map.setHeading(0);
    }
  }, [mapReady, tiltActive]);

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
    if (activeGeometry && !isDrawing) {
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
  }, [
    allBoundaries,
    boundary,
    clearBoundaryOverlays,
    googleApi,
    isDrawing,
    mapReady,
    renderGeometry,
  ]);

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

    const ringPolygons: Array<google.maps.Polygon | undefined> = [];

    drawRings.forEach((ring, ringIndex) => {
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
      ringPolygons[ringIndex] = polygon;
      drawingOverlaysRef.current.push(polygon);
    });

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
          const polygon = ringPolygons[ringIndex];
          if (!polygon) return;
          const nextPath = ring.map((point, currentVertexIndex) =>
            currentVertexIndex === vertexIndex
              ? { lat: position.lat(), lng: position.lng() }
              : { lat: point[1], lng: point[0] }
          );
          polygon.setPath([...nextPath, nextPath[0]]);
        });
        marker.addListener('dragend', () => {
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
                return currentRing.filter(
                  (_, currentVertexIndex) => currentVertexIndex !== vertexIndex
                );
              })
              .filter((ringValue): ringValue is LngLat[] => Boolean(ringValue))
          );
        });

        // Mobile long-press to delete vertex (>= 500 ms)
        const markerDiv = marker as google.maps.Marker & {
          __longPressTimer?: ReturnType<typeof setTimeout>;
        };
        api.maps.event.addDomListener(marker as unknown as Element, 'touchstart', () => {
          markerDiv.__longPressTimer = setTimeout(() => {
            setDrawRings((current) =>
              current
                .map((currentRing, currentRingIndex) => {
                  if (currentRingIndex !== ringIndex) return currentRing;
                  if (currentRing.length <= 3) return null;
                  return currentRing.filter(
                    (_, currentVertexIndex) => currentVertexIndex !== vertexIndex
                  );
                })
                .filter((ringValue): ringValue is LngLat[] => Boolean(ringValue))
            );
          }, 500);
        });
        api.maps.event.addDomListener(marker as unknown as Element, 'touchend', () => {
          clearTimeout(markerDiv.__longPressTimer);
        });
        api.maps.event.addDomListener(marker as unknown as Element, 'touchmove', () => {
          clearTimeout(markerDiv.__longPressTimer);
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

    const nextIds = new Set(validPoints.map((h) => h.id));
    const currentMap = markerMapRef.current;

    // Remove markers for households no longer in the list
    for (const [id, marker] of currentMap) {
      if (!nextIds.has(id)) {
        marker.setMap(null);
        currentMap.delete(id);
      }
    }
    infoWindowRef.current?.close();

    // Add or update markers
    validPoints.forEach((household, index) => {
      const color = STATUS_COLOR[household.status ?? 'not_visited'] ?? DEFAULT_COLOR;
      const label = householdLabel(household);

      const existing = currentMap.get(household.id);
      if (existing) {
        // Update position and icon in case data changed
        existing.setPosition({ lat: household.lat, lng: household.lng });
        existing.setIcon(markerIcon(api, color, label));
        existing.setTitle(label);
        // Re-register click with current household snapshot
        api.maps.event.clearListeners(existing, 'click');
        existing.addListener('click', () => {
          if (directHouseholdClickRef.current && onHouseholdClickRef.current) {
            infoWindowRef.current?.close();
            onHouseholdClickRef.current(household.id, label);
            return;
          }
          const content = createInfoWindowContent({
            household,
            color,
            onLogVisit: onHouseholdClickRef.current,
            onAddEncounter: onHouseholdAddEncounterRef.current,
            onViewDetails: onHouseholdViewDetailsRef.current,
            onDelete: onHouseholdDeleteRequestRef.current,
          });
          infoWindowRef.current?.setContent(content);
          infoWindowRef.current?.open({ map, anchor: existing });
        });
        return;
      }

      const marker = new api.maps.Marker({
        map,
        position: { lat: household.lat, lng: household.lng },
        icon: markerIcon(api, color, label),
        title: label,
        optimized: true,
        zIndex: 100 + index,
        collisionBehavior: api.maps.CollisionBehavior.OPTIONAL_AND_HIDES_LOWER_PRIORITY,
      });

      marker.addListener('click', () => {
        if (directHouseholdClickRef.current && onHouseholdClickRef.current) {
          infoWindowRef.current?.close();
          onHouseholdClickRef.current(household.id, label);
          return;
        }
        const content = createInfoWindowContent({
          household,
          color,
          onLogVisit: onHouseholdClickRef.current,
          onAddEncounter: onHouseholdAddEncounterRef.current,
          onViewDetails: onHouseholdViewDetailsRef.current,
          onDelete: onHouseholdDeleteRequestRef.current,
        });
        infoWindowRef.current?.setContent(content);
        infoWindowRef.current?.open({ map, anchor: marker });
      });

      currentMap.set(household.id, marker);
    });

    // keep markersRef in sync for cleanup
    markersRef.current = [...currentMap.values()];

    return () => {
      // cleanup is managed by the diff above; full cleanup on unmount is in the map init effect
    };
  }, [googleApi, mapReady, validPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || isDrawing || effectiveInteractionMode !== 'add') return;
    map.setOptions({ draggableCursor: 'crosshair' });
    const listener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
      const position = event.latLng;
      if (!position) return;
      const pin = { lat: position.lat(), lng: position.lng() };
      setVisiblePin(pin);
      if (pinPlacement === 'instant') onHouseholdPinPlacedRef.current?.(pin.lat, pin.lng);
    });
    return () => {
      listener.remove();
      map.setOptions({ draggableCursor: null });
    };
  }, [effectiveInteractionMode, isDrawing, mapReady, pinPlacement, setVisiblePin]);

  useEffect(() => {
    const api = googleApi;
    const map = mapRef.current;
    if (!api || !map) return;
    tempPinMarkerRef.current?.setMap(null);
    tempPinMarkerRef.current = null;
    if (!visiblePin) return;
    tempPinMarkerRef.current = new api.maps.Marker({
      map,
      position: visiblePin,
      icon: tempPinIcon(api),
      zIndex: 50,
    });
  }, [googleApi, visiblePin]);

  useEffect(() => {
    if (!visiblePin) return;
    const hasSavedHousehold = validPoints.some(
      (point) =>
        Math.abs(point.lat - visiblePin.lat) < 0.00001 &&
        Math.abs(point.lng - visiblePin.lng) < 0.00001
    );
    if (hasSavedHousehold) setVisiblePin(null);
  }, [setVisiblePin, validPoints, visiblePin]);

  const updateHeadingBeam = useCallback(
    (
      coords: google.maps.LatLngLiteral | null = lastLocationRef.current,
      nextHeading: number | null = headingRef.current
    ) => {
      const api = googleApi;
      const map = mapRef.current;
      if (!api || !map || !coords || nextHeading === null || !headingBeamActive) {
        headingBeamRef.current?.setMap(null);
        return;
      }

      const origin = new api.maps.LatLng(coords.lat, coords.lng);
      const zoom = map.getZoom() ?? 16;
      const beamLengthMeters = Math.max(80, Math.min(200, 280 - zoom * 8));
      // Narrow flashlight beam: wide half-angle of ~10°
      const halfAngle = 10;
      const left = api.maps.geometry.spherical.computeOffset(
        origin,
        beamLengthMeters,
        nextHeading - halfAngle
      );
      const tip = api.maps.geometry.spherical.computeOffset(origin, beamLengthMeters, nextHeading);
      const right = api.maps.geometry.spherical.computeOffset(
        origin,
        beamLengthMeters,
        nextHeading + halfAngle
      );
      const path = [coords, left.toJSON(), tip.toJSON(), right.toJSON()];

      if (!headingBeamRef.current) {
        headingBeamRef.current = new api.maps.Polygon({
          map,
          paths: path,
          clickable: false,
          strokeColor: '#2563eb',
          strokeOpacity: 0.34,
          strokeWeight: 1,
          fillColor: '#2563eb',
          fillOpacity: 0.2,
          zIndex: 90,
        });
        return;
      }

      headingBeamRef.current.setMap(map);
      headingBeamRef.current.setPath(path);
    },
    [googleApi, headingBeamActive]
  );

  const updateLocation = useCallback(
    (position: GeolocationPosition, pan = false) => {
      const api = googleApi;
      const map = mapRef.current;
      if (!api || !map) return;
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      lastLocationRef.current = coords;
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
      updateHeadingBeam(coords);
      onCalibrationNeededRef.current?.(false);
    },
    [googleApi, updateHeadingBeam]
  );

  const locateOnce = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => updateLocation(position, true),
      () => onCalibrationNeededRef.current?.(true),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 }
    );
  }, [updateLocation]);

  const requestHeadingPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return false;
    const OrientationEvent = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof OrientationEvent.requestPermission !== 'function') return true;
    try {
      return (await OrientationEvent.requestPermission()) === 'granted';
    } catch {
      return false;
    }
  }, []);

  const toggleHeadingBeam = useCallback(() => {
    if (headingBeamActive) {
      setHeadingBeamActive(false);
      headingBeamRef.current?.setMap(null);
      return;
    }

    void requestHeadingPermission().then((granted) => {
      if (!granted) {
        onCalibrationNeededRef.current?.(true);
        return;
      }
      setHeadingBeamActive(true);
      locateOnce();
    });
  }, [headingBeamActive, locateOnce, requestHeadingPermission]);

  const fitMapToContent = useCallback(() => {
    const api = googleApi;
    const map = mapRef.current;
    if (!api || !map) return;

    const activeBoundary = geometryBounds(api, parseBoundary(boundary));
    if (activeBoundary && !activeBoundary.isEmpty()) {
      map.fitBounds(activeBoundary, 56);
      return;
    }

    if (validPoints.length > 0) {
      const bounds = new api.maps.LatLngBounds();
      for (const point of validPoints) bounds.extend({ lat: point.lat, lng: point.lng });
      if (!bounds.isEmpty()) map.fitBounds(bounds, 56);
    }
  }, [boundary, googleApi, validPoints]);

  const cycleMapStyle = useCallback(() => {
    const currentIndex = Math.max(
      0,
      MAP_STYLES.findIndex((style) => style.id === activeMapStyle)
    );
    setStyle(MAP_STYLES[(currentIndex + 1) % MAP_STYLES.length].id);
  }, [activeMapStyle, setStyle]);

  const zoomBy = useCallback((delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom((map.getZoom() ?? 14) + delta);
  }, []);

  useEffect(() => {
    onGeolocateReady?.(locateOnce);
  }, [locateOnce, onGeolocateReady]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    if (!locationOn) {
      if (locationWatchRef.current !== null)
        navigator.geolocation.clearWatch(locationWatchRef.current);
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
      if (locationWatchRef.current !== null)
        navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    };
  }, [locateOnce, locationOn, updateLocation]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    if (!headingBeamActive || locationOn) {
      if (headingLocationWatchRef.current !== null)
        navigator.geolocation.clearWatch(headingLocationWatchRef.current);
      headingLocationWatchRef.current = null;
      return;
    }

    locateOnce();
    headingLocationWatchRef.current = navigator.geolocation.watchPosition(
      (position) => updateLocation(position),
      () => onCalibrationNeededRef.current?.(true),
      { enableHighAccuracy: true, maximumAge: 3_000 }
    );

    return () => {
      if (headingLocationWatchRef.current !== null)
        navigator.geolocation.clearWatch(headingLocationWatchRef.current);
      headingLocationWatchRef.current = null;
    };
  }, [headingBeamActive, locateOnce, locationOn, updateLocation]);

  useEffect(() => {
    if (!headingBeamActive) {
      headingBeamRef.current?.setMap(null);
      return;
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const nextHeading = orientationHeading(event);
      if (nextHeading === null) return;
      headingRef.current = nextHeading;
      updateHeadingBeam(lastLocationRef.current, nextHeading);
    };

    window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
    window.addEventListener('deviceorientation', handleOrientation as EventListener, true);
    return () => {
      window.removeEventListener(
        'deviceorientationabsolute',
        handleOrientation as EventListener,
        true
      );
      window.removeEventListener('deviceorientation', handleOrientation as EventListener, true);
    };
  }, [headingBeamActive, updateHeadingBeam]);

  const previousDrawingRef = useRef(isDrawing);
  useEffect(() => {
    if (previousDrawingRef.current && !isDrawing) {
      const geojson = ringsToGeoJSON(drawRingsRef.current);
      if (geojson) onDrawingCompleteRef.current?.(geojson);
    }
    previousDrawingRef.current = isDrawing;
  }, [isDrawing]);

  const noMapData = !boundary && validPoints.length === 0 && !onHouseholdPinPlaced;
  const currentStyleLabel = MAP_STYLES.find((style) => style.id === activeMapStyle)?.label ?? 'Map';

  return (
    <div className={`relative ${className}`}>
      <style>{`
        .gm-style .gm-style-iw-c { border-radius: 14px; padding: 12px !important; }
        .gm-style .gm-style-iw-d { overflow: hidden !important; }
      `}</style>
      <div ref={containerRef} className="h-full w-full" />

      {showDefaultControls && mapReady && !loadError && (
        <div className="pointer-events-none absolute right-3 bottom-24 z-50 flex flex-col items-end gap-2 sm:right-4 sm:bottom-6">
          <div className="pointer-events-auto flex flex-col gap-2">
            {showPinControl && onHouseholdPinPlaced && !isDrawing ? (
              <MapControlButton
                title={effectiveInteractionMode === 'add' ? 'Stop pinning' : 'Pin household'}
                active={effectiveInteractionMode === 'add'}
                onClick={() =>
                  setInteractionMode(effectiveInteractionMode === 'add' ? 'view' : 'add')
                }
              >
                <MapPinPlus className="h-4 w-4" />
              </MapControlButton>
            ) : null}
            <MapControlButton title="My location" active={locationOn} onClick={locateOnce}>
              <LocateFixed className="h-4 w-4" />
            </MapControlButton>
            <MapControlButton
              title="Heading beam"
              active={headingBeamActive}
              onClick={toggleHeadingBeam}
            >
              <Navigation className="h-4 w-4" />
            </MapControlButton>
            <MapControlButton
              title={tiltActive ? 'Disable 3D tilt' : 'Enable 3D tilt'}
              active={tiltActive}
              onClick={() => setTiltActive((current) => !current)}
            >
              <Building2 className="h-4 w-4" />
            </MapControlButton>
            <MapControlButton title={`Map style: ${currentStyleLabel}`} onClick={cycleMapStyle}>
              <Layers className="h-4 w-4" />
            </MapControlButton>
            <MapControlButton title="Fit territory" onClick={fitMapToContent}>
              <Route className="h-4 w-4" />
            </MapControlButton>
          </div>
          <div className="pointer-events-auto overflow-hidden rounded-full border border-slate-200 bg-white shadow-md">
            <button
              type="button"
              title="Zoom in"
              aria-label="Zoom in"
              onClick={() => zoomBy(1)}
              className="flex h-10 w-10 items-center justify-center text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="mx-2 h-px bg-slate-200" />
            <button
              type="button"
              title="Zoom out"
              aria-label="Zoom out"
              onClick={() => zoomBy(-1)}
              className="flex h-10 w-10 items-center justify-center text-slate-700 hover:bg-slate-50"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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

      {effectiveInteractionMode === 'add' && !visiblePin && !isDrawing && (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 z-100 flex justify-center">
          <div className="flex items-center gap-2 rounded-full bg-slate-950/80 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur">
            <Crosshair className="h-3.5 w-3.5" />
            Tap map to place a household
          </div>
        </div>
      )}

      {effectiveInteractionMode === 'add' &&
        visiblePin &&
        pinPlacement === 'confirm' &&
        !isDrawing && (
          <div className="absolute inset-x-0 bottom-16 z-100 flex justify-center">
            <button
              type="button"
              onClick={() => {
                onHouseholdPinPlacedRef.current?.(visiblePin.lat, visiblePin.lng);
                setVisiblePin(null);
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
