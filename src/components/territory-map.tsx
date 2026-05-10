'use client';

import { MarkerClusterer } from '@googlemaps/markerclusterer';
import {
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
  address: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  status?: string | null;
  type?: string | null;
  occupantsCount?: number | null;
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
  showDefaultControls?: boolean;
  showPinControl?: boolean;
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

// Soft Google Maps-style teardrop pin with house icon
function markerIcon(api: GoogleApi, color: string): google.maps.Icon {
  // House icon path (simplified home outline)
  const housePath = `M17,8.5 L9,15 L9,24 L14,24 L14,19 L20,19 L20,24 L25,24 L25,15 Z
    M13.5,13 L17,10 L20.5,13`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
      <filter id="ds" x="-20%" y="-10%" width="140%" height="130%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="rgba(0,0,0,0.28)"/>
      </filter>
      <!-- Soft teardrop: round top, tapered bottom point -->
      <path d="M18 3 C9.7 3 4 9.2 4 17 C4 24.5 10 32 14.8 37.8 C16 39.3 16.7 40.5 18 42 C19.3 40.5 20 39.3 21.2 37.8 C26 32 32 24.5 32 17 C32 9.2 26.3 3 18 3 Z"
        fill="white" filter="url(#ds)"/>
      <path d="M18 5 C10.8 5 6 10.6 6 17 C6 23.8 11.5 31 16.1 36.4 C17 37.5 17.5 38.3 18 39.5 C18.5 38.3 19 37.5 19.9 36.4 C24.5 31 30 23.8 30 17 C30 10.6 25.2 5 18 5 Z"
        fill="${color}"/>
      <!-- House icon in white -->
      <g fill="none" stroke="white" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="10,17 18,11 26,17"/>
        <rect x="12" y="17" width="12" height="9" rx="0.5"/>
        <rect x="15.5" y="20" width="5" height="6" rx="0.5"/>
      </g>
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new api.maps.Size(36, 48),
    anchor: new api.maps.Point(18, 46),
  };
}

function tempPinIcon(api: GoogleApi): google.maps.Icon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
      <filter id="ds" x="-20%" y="-10%" width="140%" height="130%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="rgba(0,0,0,0.28)"/>
      </filter>
      <path d="M18 3 C9.7 3 4 9.2 4 17 C4 24.5 10 32 14.8 37.8 C16 39.3 16.7 40.5 18 42 C19.3 40.5 20 39.3 21.2 37.8 C26 32 32 24.5 32 17 C32 9.2 26.3 3 18 3 Z"
        fill="white" filter="url(#ds)"/>
      <path d="M18 5 C10.8 5 6 10.6 6 17 C6 23.8 11.5 31 16.1 36.4 C17 37.5 17.5 38.3 18 39.5 C18.5 38.3 19 37.5 19.9 36.4 C24.5 31 30 23.8 30 17 C30 10.6 25.2 5 18 5 Z"
        fill="#ef4444"/>
      <circle cx="18" cy="17" r="4.5" fill="white" opacity="0.9"/>
      <circle cx="18" cy="17" r="2" fill="#ef4444"/>
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new api.maps.Size(36, 48),
    anchor: new api.maps.Point(18, 46),
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

// ─── Heading beam overlay using a CSS cone ────────────────────────────────────
function HeadingBeam({
  map,
  googleApi,
  location,
  heading,
}: {
  map: google.maps.Map | null;
  googleApi: GoogleApi | null;
  location: { lat: number; lng: number };
  heading: number;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<google.maps.OverlayView | null>(null);

  useEffect(() => {
    if (!map || !googleApi) return;

    class BeamOverlay extends googleApi.maps.OverlayView {
      private div: HTMLDivElement | null = null;
      private pos: google.maps.LatLng;

      constructor(pos: google.maps.LatLng) {
        super();
        this.pos = pos;
      }

      onAdd() {
        this.div = document.createElement('div');
        this.div.style.cssText = `
          position: absolute;
          width: 0;
          height: 0;
          pointer-events: none;
        `;
        const panes = this.getPanes();
        panes?.overlayMouseTarget.appendChild(this.div);
      }

      draw() {
        if (!this.div) return;
        const proj = this.getProjection();
        const point = proj.fromLatLngToDivPixel(this.pos);
        if (point) {
          this.div.style.left = `${point.x}px`;
          this.div.style.top = `${point.y}px`;
        }
      }

      onRemove() {
        this.div?.parentNode?.removeChild(this.div);
        this.div = null;
      }

      getDiv() {
        return this.div;
      }

      updatePosition(pos: google.maps.LatLng) {
        this.pos = pos;
        this.draw();
      }
    }

    const latLng = new googleApi.maps.LatLng(location.lat, location.lng);
    const overlay = new BeamOverlay(latLng);
    overlay.setMap(map);
    overlayRef.current = overlay;

    return () => {
      overlay.setMap(null);
      overlayRef.current = null;
    };
  }, [map, googleApi, location.lat, location.lng]);

  // Update beam direction via the DOM div
  useEffect(() => {
    const overlay = overlayRef.current as
      | (google.maps.OverlayView & { getDiv(): HTMLDivElement | null })
      | null;
    if (!overlay) return;
    const div = overlay.getDiv();
    if (!div) return;

    // Remove previous beam
    while (div.firstChild) div.removeChild(div.firstChild);

    const beam = document.createElement('div');
    beam.style.cssText = `
      position: absolute;
      left: -40px;
      top: -80px;
      width: 80px;
      height: 80px;
      transform-origin: 50% 100%;
      transform: rotate(${heading}deg);
      pointer-events: none;
      background: conic-gradient(
        from -20deg at 50% 100%,
        rgba(37,99,235,0.55) 0deg,
        rgba(37,99,235,0.12) 40deg,
        transparent 40deg
      );
      border-radius: 50% 50% 0 0;
    `;
    div.appendChild(beam);
  }, [heading]);

  return null;
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
}) {
  const { household, color, onLogVisit, onAddEncounter, onViewDetails } = params;
  const wrapper = document.createElement('div');
  wrapper.className = 'min-w-60 max-w-72 font-sans';
  wrapper.style.cssText = 'font-family: system-ui, sans-serif;';

  // ── Header row: colored indicator + address ────────────────────────────────
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex; align-items: flex-start; gap: 8px;
    padding: 2px 0 8px;
    border-bottom: 1px solid #f1f5f9;
    margin-bottom: 8px;
  `;

  const dot = document.createElement('div');
  dot.style.cssText = `
    width: 10px; height: 10px; border-radius: 50%;
    background: ${color}; margin-top: 3px; flex-shrink: 0;
  `;
  header.appendChild(dot);

  const titleBlock = document.createElement('div');
  titleBlock.style.cssText = 'min-width: 0; flex: 1;';

  const title = document.createElement('p');
  title.style.cssText =
    'margin: 0; font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.3; word-break: break-word;';
  title.textContent = household.address || 'Unnamed household';
  titleBlock.appendChild(title);

  // Type badge
  if (household.type) {
    const typeBadge = document.createElement('span');
    typeBadge.style.cssText =
      'font-size: 10px; color: #64748b; font-weight: 500; text-transform: capitalize;';
    typeBadge.textContent = household.type.replace(/_/g, ' ');
    titleBlock.appendChild(typeBadge);
  }

  header.appendChild(titleBlock);
  wrapper.appendChild(header);

  // ── Info grid ──────────────────────────────────────────────────────────────
  const grid = document.createElement('div');
  grid.style.cssText = 'display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px;';

  // Status pill
  const statusRow = document.createElement('div');
  statusRow.style.cssText = 'display: flex; align-items: center; gap: 6px;';
  const status = document.createElement('span');
  status.style.cssText = `
    display: inline-flex; align-items: center;
    border-radius: 20px; padding: 3px 10px;
    font-size: 11px; font-weight: 600; text-transform: capitalize;
    background: ${color}1a; color: ${color};
  `;
  status.textContent = statusLabel(household.status);
  statusRow.appendChild(status);
  grid.appendChild(statusRow);

  // Occupants count
  if (household.occupantsCount != null && household.occupantsCount > 0) {
    const row = document.createElement('div');
    row.style.cssText =
      'font-size: 11px; color: #475569; display: flex; align-items: center; gap: 4px;';
    row.innerHTML = `<span style="font-weight:600;color:#0f172a">${household.occupantsCount}</span> occupant${household.occupantsCount !== 1 ? 's' : ''}`;
    grid.appendChild(row);
  }

  // Last visit
  if (household.lastVisitDate) {
    const date = new Date(household.lastVisitDate);
    if (!Number.isNaN(date.getTime())) {
      const row = document.createElement('div');
      row.style.cssText = 'font-size: 11px; color: #475569;';
      const outcome = household.lastVisitOutcome
        ? ` · ${statusLabel(household.lastVisitOutcome)}`
        : '';
      row.innerHTML = `<span style="color:#64748b">Last visit:</span> <strong style="color:#0f172a">${date.toLocaleDateString()}</strong>${outcome ? `<span style="color:#64748b">${outcome}</span>` : ''}`;
      grid.appendChild(row);
    }
  }

  // Notes
  if (household.notes?.trim()) {
    const notes = document.createElement('p');
    notes.style.cssText =
      'margin: 2px 0 0; font-size: 11px; font-style: italic; color: #64748b; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;';
    notes.textContent = household.notes.trim();
    grid.appendChild(notes);
  }

  wrapper.appendChild(grid);

  // ── Actions ────────────────────────────────────────────────────────────────
  const actions = document.createElement('div');
  actions.style.cssText =
    'display: flex; flex-wrap: wrap; gap: 6px; padding-top: 4px; border-top: 1px solid #f1f5f9;';
  wrapper.appendChild(actions);

  if (onLogVisit) {
    const button = document.createElement('button');
    button.type = 'button';
    button.style.cssText = `
      flex: 1; min-width: 0;
      border: none; border-radius: 10px;
      padding: 8px 12px; font-size: 12px; font-weight: 600;
      color: white; background: ${color}; cursor: pointer;
    `;
    button.textContent = 'Log Visit';
    button.addEventListener('click', () => onLogVisit(household.id, household.address));
    actions.appendChild(button);
  }

  if (onAddEncounter) {
    const button = document.createElement('button');
    button.type = 'button';
    button.style.cssText = `
      flex: 1; min-width: 0;
      border: 1px solid #bfdbfe; border-radius: 10px;
      padding: 8px 12px; font-size: 12px; font-weight: 600;
      color: #1d4ed8; background: #eff6ff; cursor: pointer;
    `;
    button.textContent = 'Encounter';
    button.addEventListener('click', () => onAddEncounter(household.id, household.address));
    actions.appendChild(button);
  }

  if (onViewDetails) {
    const button = document.createElement('button');
    button.type = 'button';
    button.style.cssText = `
      width: 100%;
      border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 6px 12px; font-size: 11px; font-weight: 500;
      color: #475569; background: #f8fafc; cursor: pointer; margin-top: 2px;
    `;
    button.textContent = 'View Details';
    button.addEventListener('click', () => onViewDetails(household.id));
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
  showDefaultControls = true,
  showPinControl = true,
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
  const onHouseholdAddEncounterRef = useRef(onHouseholdAddEncounter);
  const onHouseholdViewDetailsRef = useRef(onHouseholdViewDetails);
  const onHouseholdPinPlacedRef = useRef(onHouseholdPinPlaced);
  const directHouseholdClickRef = useRef(directHouseholdClick);
  const onDrawingCompleteRef = useRef(onDrawingComplete);
  const onDrawingStateChangeRef = useRef(onDrawingStateChange);
  const onDrawingActionsRef = useRef(onDrawingActions);
  const onLocationDotClickRef = useRef(onLocationDotClick);
  const onCalibrationNeededRef = useRef(onCalibrationNeeded);

  const headingBeamRef = useRef<HTMLDivElement | null>(null);
  const headingOverlayRef = useRef<google.maps.OverlayView | null>(null);
  const compassHeadingRef = useRef<number | null>(null);
  const orientationListenerRef = useRef<((e: Event) => void) | null>(null);

  const [googleApi, setGoogleApi] = useState<GoogleApi | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [localInteractionMode, setLocalInteractionMode] = useState<'view' | 'add'>('view');
  const [localMapStyle, setLocalMapStyle] = useState<StyleId>(mapStyle);
  const [headingBeamActive, setHeadingBeamActive] = useState(false);
  const [currentHeading, setCurrentHeading] = useState<number | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [drawRings, setDrawRings] = useState<LngLat[][]>([]);
  const [activeRing, setActiveRing] = useState<LngLat[]>([]);

  onHouseholdClickRef.current = onHouseholdClick;
  onHouseholdAddEncounterRef.current = onHouseholdAddEncounter;
  onHouseholdViewDetailsRef.current = onHouseholdViewDetails;
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
  }, [activeMapStyle, center, clearBoundaryOverlays, clearDrawingOverlays, googleApi, validPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const style = MAP_STYLES.find((item) => item.id === activeMapStyle) ?? MAP_STYLES[0];
    map.setMapTypeId(style.mapTypeId);
    map.setOptions({ styles: style.styles });
  }, [activeMapStyle]);

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
                return currentRing.filter(
                  (_, currentVertexIndex) => currentVertexIndex !== vertexIndex
                );
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
        if (directHouseholdClickRef.current && onHouseholdClickRef.current) {
          infoWindowRef.current?.close();
          onHouseholdClickRef.current(household.id, household.address);
          return;
        }

        const content = createInfoWindowContent({
          household,
          color,
          onLogVisit: onHouseholdClickRef.current,
          onAddEncounter: onHouseholdAddEncounterRef.current,
          onViewDetails: onHouseholdViewDetailsRef.current,
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

  const updateLocation = useCallback(
    (position: GeolocationPosition, pan = false) => {
      const api = googleApi;
      const map = mapRef.current;
      if (!api || !map) return;
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      setCurrentLocation(coords);
      if (!locationMarkerRef.current) {
        locationMarkerRef.current = new api.maps.Marker({
          map,
          position: coords,
          title: 'Your location',
          zIndex: 100,
          icon: {
            path: api.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#2563eb',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2.5,
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

  const previousDrawingRef = useRef(isDrawing);
  useEffect(() => {
    if (previousDrawingRef.current && !isDrawing) {
      const geojson = ringsToGeoJSON(drawRingsRef.current);
      if (geojson) onDrawingCompleteRef.current?.(geojson);
    }
    previousDrawingRef.current = isDrawing;
  }, [isDrawing]);

  // Cleanup orientation listener on unmount
  useEffect(() => {
    return () => {
      const listener = orientationListenerRef.current;
      if (listener) {
        const eventTarget = window as unknown as EventTarget;
        eventTarget.removeEventListener('deviceorientationabsolute', listener, true);
        eventTarget.removeEventListener('deviceorientation', listener, true);
        orientationListenerRef.current = null;
      }
    };
  }, []);

  const noMapData = !boundary && validPoints.length === 0 && !onHouseholdPinPlaced;
  const currentStyleLabel = MAP_STYLES.find((style) => style.id === activeMapStyle)?.label ?? 'Map';

  // Toggle heading beam — requests DeviceOrientationEvent permission on iOS 13+
  const toggleHeadingBeam = useCallback(() => {
    if (headingBeamActive) {
      setHeadingBeamActive(false);
      setCurrentHeading(null);
      if (orientationListenerRef.current) {
        const eventTarget = window as unknown as EventTarget;
        eventTarget.removeEventListener(
          'deviceorientationabsolute',
          orientationListenerRef.current,
          true
        );
        eventTarget.removeEventListener('deviceorientation', orientationListenerRef.current, true);
        orientationListenerRef.current = null;
      }
      return;
    }
    const startListening = () => {
      setHeadingBeamActive(true);
      const handler = (e: Event) => {
        const evt = e as DeviceOrientationEvent & {
          webkitCompassHeading?: number;
          alpha: number | null;
        };
        // iOS provides webkitCompassHeading (0=N, clockwise); Android absolute gives alpha
        let heading: number | null = null;
        if (evt.webkitCompassHeading != null) {
          heading = evt.webkitCompassHeading;
        } else if (evt.absolute && evt.alpha != null) {
          heading = (360 - evt.alpha) % 360;
        }
        if (heading !== null) {
          compassHeadingRef.current = heading;
          setCurrentHeading(heading);
        }
      };
      orientationListenerRef.current = handler;
      // Use deviceorientationabsolute when available (Android Chrome), else fall back to deviceorientation
      const eventTarget = window as unknown as EventTarget;
      const useAbsolute = 'ondeviceorientationabsolute' in window;
      eventTarget.addEventListener(
        useAbsolute ? 'deviceorientationabsolute' : 'deviceorientation',
        handler,
        true
      );
    };
    // Request iOS 13+ permission
    const DevOrient = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof DevOrient.requestPermission === 'function') {
      DevOrient.requestPermission()
        .then((state) => {
          if (state === 'granted') startListening();
        })
        .catch(() => {});
    } else {
      startListening();
    }
  }, [headingBeamActive]);

  return (
    <div className={`relative ${className}`}>
      <style>{`
        .gm-style .gm-style-iw-c { border-radius: 14px; padding: 12px !important; }
        .gm-style .gm-style-iw-d { overflow: hidden !important; }
      `}</style>
      <div ref={containerRef} className="h-full w-full" />

      {/* Heading beam — rendered as a CSS cone above the location dot */}
      {headingBeamActive && currentLocation && currentHeading !== null && mapReady && (
        <HeadingBeam
          map={mapRef.current}
          googleApi={googleApi}
          location={currentLocation}
          heading={currentHeading}
        />
      )}

      {showDefaultControls && mapReady && !loadError && (
        <div className="pointer-events-none absolute right-3 bottom-20 z-[1050] flex flex-col items-end gap-2">
          <div className="pointer-events-auto flex flex-col gap-1.5">
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
            <MapControlButton
              title={headingBeamActive ? 'Hide heading' : 'Show heading'}
              active={headingBeamActive}
              onClick={toggleHeadingBeam}
            >
              <Navigation className="h-4 w-4" />
            </MapControlButton>
            <MapControlButton title="My location" onClick={locateOnce}>
              <LocateFixed className="h-4 w-4" />
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
