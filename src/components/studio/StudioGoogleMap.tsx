'use client';

import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Congregation, Household, MapBoundaryPolygon, MapLandmark, MapRoad, Territory } from '@/types/api';
import {
  type BasemapMode,
  type BoundaryDisplaySettings,
  DEFAULT_BOUNDARY_DISPLAY,
  resolveBoundaryDisplay,
  type StudioLayerSettings,
} from './StudioBasemapPopup';
import type { StudioTool } from './StudioTopBar';

interface StudioGoogleMapProps {
  territory: Territory | null;
  congregation?: Congregation | null;
  households: Household[];
  activeTool: StudioTool;
  drawnPoints: Array<{ lat: number; lng: number }>;
  onAddPoint: (point: { lat: number; lng: number }) => void;
  onSelectHousehold: (household: Household) => void;
  onMoveHousehold?: (id: string, lat: number, lng: number) => void;
  onSelectLandmark?: (landmark: MapLandmark) => void;
  onMoveLandmark?: (id: string, lat: number, lng: number) => void;
  onSelectRoad?: (road: MapRoad) => void;
  onUpdateRoadPoints?: (roadId: string, points: Array<{ lat: number; lng: number }>) => void;
  onSelectBoundary?: (boundary: MapBoundaryPolygon) => void;
  onUpdateBoundaryPolygon?: (boundaryId: string, points: Array<{ lat: number; lng: number }>) => void;
  onUpdateBoundary?: (
    polygons: Array<Array<{ lat: number; lng: number }>> | Array<{ lat: number; lng: number }>
  ) => void;
  onSelectStartFlag?: () => void;
  onMoveStartFlag?: (lat: number, lng: number) => void;
  onDeselectAll?: () => void;
  onPinAtLocation: (coords: { lat: number; lng: number }) => void;
  onPlaceLandmark?: (coords: { lat: number; lng: number }) => void;
  onSetStartFlag?: (coords: { lat: number; lng: number }) => void;
  basemapMode: BasemapMode;
  layerSettings: StudioLayerSettings;
  boundaryDisplay?: BoundaryDisplaySettings;
  searchedLocation?: { lat: number; lng: number; zoom?: number; timestamp: number } | null;
  targetCamera?: { heading?: number; tilt?: number; timestamp: number } | null;
  onCameraChange?: (camera: { heading: number; tilt: number }) => void;
  currentCamera?: { heading: number; tilt: number };
  selectedHouseholdId?: string | null;
  selectedLandmarkId?: string | null;
  selectedRoadId?: string | null;
  userLocation?: { lat: number; lng: number; accuracy?: number } | null;
  userHeading?: number | null;
}

// Fallback default coordinates if not configured on congregation
const HARDCODED_FALLBACK_CENTER = { lat: 8.3683, lng: 124.8644 };

export function normalizePolygons(
  coords:
    | Array<{ lat: number; lng: number; polygonIndex?: number }>
    | Array<Array<{ lat: number; lng: number }>>
    | null
    | undefined
): Array<Array<{ lat: number; lng: number }>> {
  if (!coords || !Array.isArray(coords) || coords.length === 0) return [];
  if (Array.isArray(coords[0])) {
    return coords as Array<Array<{ lat: number; lng: number }>>;
  }
  if (typeof coords[0] === 'object' && coords[0] !== null && 'polygonIndex' in coords[0]) {
    const polysMap = new Map<number, Array<{ lat: number; lng: number }>>();
    for (const item of coords as Array<{ lat: number; lng: number; polygonIndex?: number }>) {
      const idx = Number(item.polygonIndex ?? 0);
      if (!polysMap.has(idx)) polysMap.set(idx, []);
      polysMap.get(idx)!.push({ lat: Number(item.lat), lng: Number(item.lng) });
    }
    return Array.from(polysMap.values());
  }
  return [coords as Array<{ lat: number; lng: number }>];
}

export function getTerritoryBoundaries(
  territory: Territory | null | undefined
): MapBoundaryPolygon[] {
  if (!territory) return [];
  if (territory.annotations?.boundaries && territory.annotations.boundaries.length > 0) {
    return territory.annotations.boundaries;
  }
  if (territory.boundaryCoordinates) {
    const polys = normalizePolygons(territory.boundaryCoordinates);
    return polys.map((points, idx) => ({
      id: `default-boundary-${idx}`,
      name: polys.length > 1 ? `Zone ${idx + 1}` : 'Boundary',
      points,
    }));
  }
  return [];
}

// Guard against setOptions multiple-call warning in React StrictMode / Fast Refresh
function configureGoogleMapsOnce(apiKey: string) {
  const g = globalThis as unknown as { __GMP_INITIALIZED__?: boolean };
  if (!g.__GMP_INITIALIZED__ && apiKey) {
    try {
      setOptions({
        key: apiKey,
        v: 'weekly',
      });
      g.__GMP_INITIALIZED__ = true;
    } catch {
      // Ignored if already set by prior module load
    }
  }
}

function computeCentroidFromPolygons(
  polygons: Array<Array<{ lat: number; lng: number }>>
): { lat: number; lng: number } {
  if (polygons.length === 0) return HARDCODED_FALLBACK_CENTER;
  let latSum = 0;
  let lngSum = 0;
  let totalPts = 0;
  for (const poly of polygons) {
    for (const pt of poly) {
      latSum += pt.lat;
      lngSum += pt.lng;
      totalPts++;
    }
  }
  if (totalPts === 0) return HARDCODED_FALLBACK_CENTER;
  return { lat: latSum / totalPts, lng: lngSum / totalPts };
}

// Full outer world polygon ring spanning the Mercator projection in Clockwise order
const WORLD_MASK_RING: Array<{ lat: number; lng: number }> = [
  { lat: 85.0, lng: -180.0 },
  { lat: 85.0, lng: 0.0 },
  { lat: 85.0, lng: 180.0 },
  { lat: -85.0, lng: 180.0 },
  { lat: -85.0, lng: 0.0 },
  { lat: -85.0, lng: -180.0 },
  { lat: 85.0, lng: -180.0 },
];

// Computes planar signed area in Mercator projection coordinates (Shoelace formula).
// Returns positive for Clockwise (CW), negative for Counter-Clockwise (CCW).
function getPlanarSignedArea(pts: Array<{ lat: number; lng: number }>): number {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    sum += (p2.lng - p1.lng) * (p2.lat + p1.lat);
  }
  return sum;
}

// In Google Maps JavaScript API, a hole in a polygon MUST have the OPPOSITE winding sign
// of the outer ring so the outer world is filled and the inner boundary is cut out transparently.
function ensureOppositeWinding(
  holePts: Array<{ lat: number; lng: number }>,
  outerRingPts: Array<{ lat: number; lng: number }>
): Array<{ lat: number; lng: number }> {
  const outerArea = getPlanarSignedArea(outerRingPts);
  const holeArea = getPlanarSignedArea(holePts);
  if ((outerArea > 0 && holeArea > 0) || (outerArea < 0 && holeArea < 0)) {
    return [...holePts].reverse();
  }
  return holePts;
}

function getLandmarkIconConfig(type: string): { bg: string; svg: string } {
  switch (type) {
    case 'tree':
      return {
        bg: '#10B981', // Emerald
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="currentColor" style="display: block; margin: auto;">
          <path d="M12 2C9.24 2 7 4.24 7 7c0 .52.08 1.02.24 1.49C5.35 9.38 4 11.03 4 13c0 2.76 2.24 5 5 5h6c2.76 0 5-2.24 5-5 0-1.97-1.35-3.62-3.24-4.51.16-.47.24-.97.24-1.49 0-2.76-2.24-5-5-5z"/>
          <path d="M10.5 18H13.5V22H10.5z"/>
        </svg>`,
      };
    case 'school':
      return {
        bg: '#3B82F6', // Blue
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c3 3 9 3 12 0v-5"/>
        </svg>`,
      };
    case 'church':
      return {
        bg: '#8B5CF6', // Purple
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M12 2v5"/>
          <path d="M9.5 4.5h5"/>
          <path d="m18 10-6-4-6 4v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2Z"/>
          <path d="M10 21v-4a2 2 0 0 1 4 0v4"/>
        </svg>`,
      };
    case 'store':
      return {
        bg: '#F59E0B', // Amber
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
          <path d="M2 7h20"/>
        </svg>`,
      };
    case 'gate':
      return {
        bg: '#64748B', // Slate
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M3 21h18"/>
          <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>
          <circle cx="14" cy="12" r="1"/>
        </svg>`,
      };
    case 'hazard':
      return {
        bg: '#EF4444', // Rose
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>`,
      };
    case 'landmark':
      return {
        bg: '#6366F1', // Indigo
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <line x1="2" x2="22" y1="20" y2="20"/>
          <path d="M4 16v-6"/>
          <path d="M9 16v-6"/>
          <path d="M15 16v-6"/>
          <path d="M20 16v-6"/>
          <path d="M2 10l10-6 10 6"/>
        </svg>`,
      };
    default:
      return {
        bg: '#F97316', // Orange
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <circle cx="12" cy="10" r="3"/>
          <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/>
        </svg>`,
      };
  }
}

export function StudioGoogleMap({
  territory,
  congregation,
  households,
  activeTool,
  drawnPoints,
  onAddPoint,
  onSelectHousehold,
  onMoveHousehold,
  onSelectLandmark,
  onMoveLandmark,
  onSelectRoad,
  onUpdateRoadPoints,
  onSelectBoundary,
  onUpdateBoundaryPolygon,
  onUpdateBoundary,
  onSelectStartFlag,
  onMoveStartFlag,
  onDeselectAll,
  onPinAtLocation,
  onPlaceLandmark,
  onSetStartFlag,
  basemapMode,
  layerSettings,
  boundaryDisplay,
  searchedLocation,
  targetCamera,
  onCameraChange,
  selectedHouseholdId,
  selectedLandmarkId,
  selectedRoadId,
  userLocation,
  userHeading,
}: StudioGoogleMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const polygonsRef = useRef<google.maps.Polygon[]>([]);
  const maskPolygonRef = useRef<google.maps.Polygon | null>(null);
  const drawingPolysRef = useRef<(google.maps.Polyline | google.maps.Polygon)[]>([]);
  const drawingMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const householdMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  // Annotations refs
  const roadPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const roadLabelMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const landmarkMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const startFlagMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  // User Live Location & Heading Cone refs
  const userLocationMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const userLocationAccuracyCircleRef = useRef<google.maps.Circle | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const initialBoundsFittedRef = useRef<string | null>(null);
  const isProgrammaticCameraUpdateRef = useRef(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // Stable string keys to prevent object reference thrashing in effects
  const boundariesKey = useMemo(() => {
    const boundaries = getTerritoryBoundaries(territory);
    return boundaries
      .map(
        (b) =>
          `${b.id}:${b.points.length}:${b.points.map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join(',')}`
      )
      .join('|');
  }, [territory]);

  const roadsAndLandmarksKey = useMemo(() => {
    const ann = territory?.annotations;
    if (!ann) return '';
    const roadsPart =
      ann.roads
        ?.map(
          (r) =>
            `${r.id}:${r.name}:${r.color}:${r.points.map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join(',')}`
        )
        .join(';') ?? '';
    const lmPart =
      ann.landmarks
        ?.map((l) => `${l.id}:${l.type}:${l.label}:${l.lat.toFixed(6)}:${l.lng.toFixed(6)}`)
        .join(';') ?? '';
    const sfPart = ann.startFlag
      ? `${ann.startFlag.label}:${ann.startFlag.lat.toFixed(6)}:${ann.startFlag.lng.toFixed(6)}`
      : '';
    return `${roadsPart}__${lmPart}__${sfPart}`;
  }, [territory?.annotations]);

  const householdsKey = useMemo(
    () =>
      households
        .map((h) => `${h.id}:${h.latitude}:${h.longitude}:${h.status}:${h.address}`)
        .join('|'),
    [households]
  );

  const drawnPointsKey = useMemo(
    () => drawnPoints.map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join('|'),
    [drawnPoints]
  );

  // Determine the default center based on congregation settings or fallback
  const resolvedDefaultCenter = useMemo(() => {
    if (
      typeof congregation?.defaultLatitude === 'number' &&
      typeof congregation?.defaultLongitude === 'number'
    ) {
      return {
        lat: congregation.defaultLatitude,
        lng: congregation.defaultLongitude,
      };
    }
    return HARDCODED_FALLBACK_CENTER;
  }, [congregation?.defaultLatitude, congregation?.defaultLongitude]);

  // Determine territory center: if boundary polygons exist, calculate centroid, else congregation default
  const resolvedCenter = useMemo(() => {
    const boundaries = getTerritoryBoundaries(territory);
    if (boundaries.length > 0 && boundaries[0].points.length > 0) {
      const allPolys = boundaries.map((b) => b.points);
      return computeCentroidFromPolygons(allPolys);
    }
    return resolvedDefaultCenter;
  }, [territory?.boundaryCoordinates, territory?.annotations?.boundaries, resolvedDefaultCenter]);

  // Keep references to callback handlers so event listeners are always attached to latest handlers
  const handlePinRef = useRef(onPinAtLocation);
  handlePinRef.current = onPinAtLocation;

  const handlePlaceLandmarkRef = useRef(onPlaceLandmark);
  handlePlaceLandmarkRef.current = onPlaceLandmark;

  const handleSetStartFlagRef = useRef(onSetStartFlag);
  handleSetStartFlagRef.current = onSetStartFlag;

  const handleAddPointRef = useRef(onAddPoint);
  handleAddPointRef.current = onAddPoint;

  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;

  const handleSelectHouseholdRef = useRef(onSelectHousehold);
  handleSelectHouseholdRef.current = onSelectHousehold;

  const handleMoveHouseholdRef = useRef(onMoveHousehold);
  handleMoveHouseholdRef.current = onMoveHousehold;

  const handleSelectLandmarkRef = useRef(onSelectLandmark);
  handleSelectLandmarkRef.current = onSelectLandmark;

  const handleMoveLandmarkRef = useRef(onMoveLandmark);
  handleMoveLandmarkRef.current = onMoveLandmark;

  const handleSelectRoadRef = useRef(onSelectRoad);
  handleSelectRoadRef.current = onSelectRoad;

  const handleUpdateRoadPointsRef = useRef(onUpdateRoadPoints);
  handleUpdateRoadPointsRef.current = onUpdateRoadPoints;

  const handleSelectBoundaryRef = useRef(onSelectBoundary);
  handleSelectBoundaryRef.current = onSelectBoundary;

  const handleUpdateBoundaryPolygonRef = useRef(onUpdateBoundaryPolygon);
  handleUpdateBoundaryPolygonRef.current = onUpdateBoundaryPolygon;

  const handleUpdateBoundaryRef = useRef(onUpdateBoundary);
  handleUpdateBoundaryRef.current = onUpdateBoundary;

  const handleSelectStartFlagRef = useRef(onSelectStartFlag);
  handleSelectStartFlagRef.current = onSelectStartFlag;

  const handleMoveStartFlagRef = useRef(onMoveStartFlag);
  handleMoveStartFlagRef.current = onMoveStartFlag;

  const handleDeselectAllRef = useRef(onDeselectAll);
  handleDeselectAllRef.current = onDeselectAll;

  const handleCameraChangeRef = useRef(onCameraChange);
  handleCameraChangeRef.current = onCameraChange;

  // 1. Initialize Google Map ONCE on mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!apiKey) {
      setLoadError('Google Maps API key is missing. Please check NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.');
      return;
    }

    configureGoogleMapsOnce(apiKey);

    let isMounted = true;

    async function initMap() {
      try {
        const { Map, RenderingType } = (await importLibrary('maps')) as google.maps.MapsLibrary & {
          RenderingType?: { VECTOR: google.maps.RenderingType; RASTER: google.maps.RenderingType };
        };
        await importLibrary('geometry');
        await importLibrary('marker');

        if (!isMounted || !mapContainerRef.current) return;

        // If map is already created, do not re-create
        if (mapInstanceRef.current) return;

        const boundaries = getTerritoryBoundaries(territory);
        const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
        const map = new Map(mapContainerRef.current, {
          center: resolvedCenter,
          zoom: boundaries.length > 0 && boundaries[0].points.length >= 3 ? 17 : 16,
          mapId,
          renderingType: RenderingType?.VECTOR ?? 'VECTOR',
          heading: 0,
          tilt: 0,
          rotateControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          zoomControl: true,
          gestureHandling: 'greedy',
        });

        // Add single stable click listener for tool actions
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          const currentTool = activeToolRef.current;

          if (currentTool === 'pin') {
            handlePinRef.current?.({ lat, lng });
          } else if (currentTool === 'landmark') {
            handlePlaceLandmarkRef.current?.({ lat, lng });
          } else if (currentTool === 'start') {
            handleSetStartFlagRef.current?.({ lat, lng });
          } else if (currentTool === 'boundary' || currentTool === 'road') {
            handleAddPointRef.current?.({ lat, lng });
          } else if (currentTool === 'pointer') {
            handleDeselectAllRef.current?.();
          }
        });

        // Listen to camera heading & tilt changes (from native user mouse/touch gestures)
        map.addListener('heading_changed', () => {
          if (isProgrammaticCameraUpdateRef.current) return;
          const h = map.getHeading();
          if (typeof h === 'number' && !Number.isNaN(h)) {
            handleCameraChangeRef.current?.({
              heading: ((h % 360) + 360) % 360,
              tilt: map.getTilt() || 0,
            });
          }
        });
        map.addListener('tilt_changed', () => {
          if (isProgrammaticCameraUpdateRef.current) return;
          const t = map.getTilt();
          if (typeof t === 'number' && !Number.isNaN(t)) {
            handleCameraChangeRef.current?.({
              heading: map.getHeading() || 0,
              tilt: t,
            });
          }
        });

        mapInstanceRef.current = map;
        setMapReady(true);
      } catch (err: unknown) {
        console.error('Google Maps Load Error:', err);
        if (isMounted) {
          setLoadError(
            err instanceof Error
              ? err.message
              : 'Failed to load Google Maps. Please check your API key and network connection.'
          );
        }
      }
    }

    void initMap();

    return () => {
      isMounted = false;
    };
  }, [apiKey]); // ONLY on initial mount / API key change

  // 2. Center / Bounds effect: ONLY on initial load of this territory
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || typeof google === 'undefined' || !territory?.id) return;
    if (initialBoundsFittedRef.current === territory.id) return;

    const boundaries = getTerritoryBoundaries(territory);
    let hasValidPoints = false;
    const bounds = new google.maps.LatLngBounds();

    boundaries.forEach((b) => {
      b.points.forEach((pt) => {
        bounds.extend(pt);
        hasValidPoints = true;
      });
    });

    if (hasValidPoints) {
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
      initialBoundsFittedRef.current = territory.id;
    } else {
      map.setCenter(resolvedCenter);
      map.setZoom(16);
      initialBoundsFittedRef.current = territory.id;
    }
  }, [mapReady, territory?.id]);

  // Smoothly pan & zoom to searched location
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !searchedLocation) return;
    map.panTo({ lat: searchedLocation.lat, lng: searchedLocation.lng });
    map.setZoom(searchedLocation.zoom || 18);
  }, [mapReady, searchedLocation]);

  // Update camera heading and tilt (pitch) natively on Google Maps instance
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !targetCamera) return;

    const startTilt = map.getTilt() || 0;
    const startHeading = map.getHeading() || 0;
    const endTilt = typeof targetCamera.tilt === 'number' ? targetCamera.tilt : startTilt;
    const endHeading =
      typeof targetCamera.heading === 'number'
        ? ((targetCamera.heading % 360) + 360) % 360
        : startHeading;

    // Calculate shortest angular distance for heading
    let headingDiff = (endHeading - startHeading) % 360;
    if (headingDiff > 180) headingDiff -= 360;
    if (headingDiff < -180) headingDiff += 360;

    const tiltDiff = endTilt - startTilt;

    // If small delta (e.g. from continuous slider drag), apply directly without queuing RAF animation
    if (Math.abs(headingDiff) <= 4 && Math.abs(tiltDiff) <= 4) {
      if (typeof map.moveCamera === 'function') {
        isProgrammaticCameraUpdateRef.current = true;
        try {
          map.moveCamera({ tilt: endTilt, heading: endHeading });
        } finally {
          setTimeout(() => {
            isProgrammaticCameraUpdateRef.current = false;
          }, 40);
        }
      }
      return;
    }

    // For larger discrete jumps (preset buttons, 3D toggle, compass reset), animate smoothly
    let animationFrameId: number;
    const startTime = performance.now();
    const duration = 250; // ms

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      const currentTilt = startTilt + tiltDiff * eased;
      const currentHeading = ((startHeading + headingDiff * eased) % 360 + 360) % 360;

      if (typeof map.moveCamera === 'function') {
        isProgrammaticCameraUpdateRef.current = true;
        try {
          map.moveCamera({
            tilt: Math.max(0, Math.min(67.5, currentTilt)),
            heading: currentHeading,
          });
        } catch {
          // fallback
        }
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          isProgrammaticCameraUpdateRef.current = false;
        }, 40);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      isProgrammaticCameraUpdateRef.current = false;
    };
  }, [mapReady, targetCamera]);

  // 3. Update Map Type (Roadmap / Satellite)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || typeof google === 'undefined') return;

    map.setMapTypeId(basemapMode === 'satellite' ? 'hybrid' : 'roadmap');
  }, [mapReady, basemapMode]);

  // 4. Update Cursor based on Active Tool
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    if (
      activeTool === 'pin' ||
      activeTool === 'boundary' ||
      activeTool === 'road' ||
      activeTool === 'landmark' ||
      activeTool === 'start'
    ) {
      map.setOptions({ draggableCursor: 'crosshair' });
    } else {
      map.setOptions({ draggableCursor: 'grab' });
    }
  }, [mapReady, activeTool]);

  // 5. Render Saved Territory Independent Boundary Polygons & Outside Mask Overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || typeof google === 'undefined') return;

    polygonsRef.current.forEach((p) => p.setMap(null));
    polygonsRef.current = [];

    if (maskPolygonRef.current) {
      maskPolygonRef.current.setMap(null);
      maskPolygonRef.current = null;
    }

    const boundaries = getTerritoryBoundaries(territory);
    const isEditable = activeTool === 'pointer' || activeTool === 'boundary';
    const effectiveDisplay = resolveBoundaryDisplay(boundaryDisplay);

    // Render outside dimming mask with cutouts for territory boundaries
    const validHoles = boundaries
      .filter((b) => b.points && b.points.length >= 3)
      .map((b) => ensureOppositeWinding(b.points, WORLD_MASK_RING));

    if (validHoles.length > 0) {
      const maskPoly = new google.maps.Polygon({
        paths: [WORLD_MASK_RING, ...validHoles],
        strokeWeight: 0,
        fillColor: '#000000',
        fillOpacity: effectiveDisplay.maskOpacity,
        map: effectiveDisplay.maskOpacity > 0 ? map : null,
        clickable: false,
        zIndex: 1,
      });
      maskPolygonRef.current = maskPoly;
    }

    const showBoundaries = layerSettings.showBoundaries !== false;

    if (showBoundaries) {
      boundaries.forEach((boundary) => {
        if (!boundary.points || boundary.points.length < 3) return;

        const polygon = new google.maps.Polygon({
          paths: boundary.points,
          strokeColor: boundary.color || effectiveDisplay.strokeColor || effectiveDisplay.fillColor,
          strokeOpacity: 0.9,
          strokeWeight: 3,
          fillColor: boundary.color || effectiveDisplay.fillColor,
          fillOpacity: effectiveDisplay.fillOpacity,
          editable: isEditable,
          draggable: false,
          map,
          clickable: true,
          zIndex: 2,
        });

        // Handle right-click to delete vertex
        polygon.addListener('rightclick', (e: google.maps.PolyMouseEvent) => {
          if (e.vertex != null) {
            polygon.getPath().removeAt(e.vertex);
          }
        });

        // Click to select boundary in pointer mode, OR pass click to map active tool
        polygon.addListener('click', (e: google.maps.PolyMouseEvent) => {
          if (activeToolRef.current === 'pointer') {
            e.stop();
            handleSelectBoundaryRef.current?.(boundary);
          } else {
            if (!e.latLng) return;
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            const currentTool = activeToolRef.current;

            if (currentTool === 'pin') {
              handlePinRef.current?.({ lat, lng });
            } else if (currentTool === 'landmark') {
              handlePlaceLandmarkRef.current?.({ lat, lng });
            } else if (currentTool === 'start') {
              handleSetStartFlagRef.current?.({ lat, lng });
            } else if (currentTool === 'boundary' || currentTool === 'road') {
              handleAddPointRef.current?.({ lat, lng });
            }
          }
        });

        // Handle vertex edits / insertions / deletions for this specific boundary
        const path = polygon.getPath();
        const handleBoundaryPathChange = () => {
          const updatedPoints = path.getArray().map((pt) => ({
            lat: pt.lat(),
            lng: pt.lng(),
          }));
          if (updatedPoints.length >= 3) {
            handleUpdateBoundaryPolygonRef.current?.(boundary.id, updatedPoints);
          }
        };

        path.addListener('set_at', handleBoundaryPathChange);
        path.addListener('insert_at', handleBoundaryPathChange);
        path.addListener('remove_at', handleBoundaryPathChange);

        polygonsRef.current.push(polygon);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, boundariesKey, activeTool, layerSettings.showBoundaries]);

  // 5b. Live Dynamic Boundary Style & Mask Updates (No marker flicker or object recreation)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const effectiveDisplay = resolveBoundaryDisplay(boundaryDisplay);

    if (maskPolygonRef.current) {
      if (effectiveDisplay.maskOpacity > 0) {
        maskPolygonRef.current.setOptions({
          fillOpacity: effectiveDisplay.maskOpacity,
          map,
        });
      } else {
        maskPolygonRef.current.setMap(null);
      }
    }

    polygonsRef.current.forEach((polygon) => {
      polygon.setOptions({
        fillColor: effectiveDisplay.fillColor,
        fillOpacity: effectiveDisplay.fillOpacity,
        strokeColor: effectiveDisplay.strokeColor || effectiveDisplay.fillColor,
      });
    });
  }, [
    mapReady,
    boundaryDisplay?.fillColor,
    boundaryDisplay?.fillOpacity,
    boundaryDisplay?.maskOpacity,
    boundaryDisplay?.strokeColor,
  ]);

  // 6. Render Household Markers with Teardrop Pin Shape & Anchor Point at Tip
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || typeof google === 'undefined' || !google.maps.marker) return;

    householdMarkersRef.current.forEach((m) => {
      m.map = null;
    });
    householdMarkersRef.current = [];

    if (layerSettings.showHouses === false) {
      return;
    }

    const { AdvancedMarkerElement } = google.maps.marker;

    const getStatusColor = (status?: string) => {
      switch (status) {
        case 'active':
          return '#16A34A'; // Green
        case 'not_home':
          return '#D97706'; // Amber / Orange
        case 'return_visit':
          return '#2563EB'; // Vibrant Blue
        case 'do_not_visit':
          return '#DC2626'; // Crimson Red
        case 'moved':
        case 'inactive':
          return '#9CA3AF'; // Muted Gray
        case 'new':
        default:
          return '#64748B'; // Cool Slate / Steel
      }
    };

    const isPointerMode = activeTool === 'pointer';

    const filteredHouseholds = households.filter((h) => {
      if (!layerSettings.householdFilter || layerSettings.householdFilter === 'all') return true;
      if (layerSettings.householdFilter === 'return_visit') return h.status === 'return_visit';
      if (layerSettings.householdFilter === 'active') return h.status === 'active';
      if (layerSettings.householdFilter === 'not_home') return h.status === 'not_home';
      if (layerSettings.householdFilter === 'do_not_visit') return h.status === 'do_not_visit';
      return true;
    });

    filteredHouseholds.forEach((h) => {
      const lat = typeof h.latitude === 'number' ? h.latitude : parseFloat(String(h.latitude || ''));
      const lng = typeof h.longitude === 'number' ? h.longitude : parseFloat(String(h.longitude || ''));
      if (Number.isNaN(lat) || Number.isNaN(lng) || lat === 0 || lng === 0) return;

      const pinColor = getStatusColor(h.status);

      // Zero-width/height container: guarantees (0,0) is anchored directly at the {lat, lng} coordinate
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.width = '0px';
      wrapper.style.height = '0px';
      wrapper.style.cursor = isPointerMode ? 'grab' : 'pointer';
      wrapper.style.pointerEvents = 'auto';
      wrapper.title = `${h.address} (${h.status.replace(/_/g, ' ')})`;

      const isSelected = selectedHouseholdId === h.id;

      // Pin Element: 24px wide, positioned left: -12px and bottom: 0px -> tip is PRECISELY at (0, 0)
      const pinContainer = document.createElement('div');
      pinContainer.style.position = 'absolute';
      pinContainer.style.left = '-12px';
      pinContainer.style.bottom = '0px';
      pinContainer.style.width = '24px';
      pinContainer.style.display = 'flex';
      pinContainer.style.flexDirection = 'column';
      pinContainer.style.alignItems = 'center';
      pinContainer.style.filter = isSelected
        ? 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))'
        : 'drop-shadow(0 2px 4px rgba(0,0,0,0.32))';
      pinContainer.style.transform = isSelected ? 'scale(1.08)' : 'scale(1)';
      pinContainer.style.transformOrigin = 'bottom center';
      pinContainer.style.transition = 'transform 0.15s ease-out';

      pinContainer.innerHTML = `
        <div style="background-color: ${pinColor}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #FFFFFF; box-shadow: ${isSelected ? '0 0 0 2px #3B82F6, 0 1px 3px rgba(0,0,0,0.2)' : 'none'}; color: #FFFFFF; z-index: 2; box-sizing: border-box; padding: 5.5px;">
          <svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div style="background-color: ${pinColor}; width: 6.5px; height: 6.5px; transform: rotate(45deg); margin-top: -4px; border-right: 2px solid #FFFFFF; border-bottom: 2px solid #FFFFFF; z-index: 1;"></div>
      `;

      wrapper.appendChild(pinContainer);

      // Label beside pin: pure text with white stroke / halo
      if (layerSettings.showHouseLabels) {
        const labelWrapper = document.createElement('div');
        labelWrapper.style.position = 'absolute';
        labelWrapper.style.left = '15px';
        labelWrapper.style.bottom = '10px';
        labelWrapper.style.whiteSpace = 'nowrap';
        labelWrapper.style.pointerEvents = 'none';

        const labelEl = document.createElement('span');
        labelEl.style.fontSize = '10.5px';
        labelEl.style.fontWeight = '700';
        labelEl.style.color = isSelected ? '#1E293B' : '#334155';
        labelEl.style.paintOrder = 'stroke fill';
        labelEl.style.webkitTextStroke = '3px #FFFFFF';
        labelEl.style.textShadow = '0 0 3px #FFFFFF, 0 0 3px #FFFFFF, 0 1px 2px rgba(0,0,0,0.25)';
        labelEl.style.lineHeight = '1.15';
        labelEl.style.letterSpacing = '-0.01em';
        labelEl.textContent = h.houseNumber ? `#${h.houseNumber}` : h.address.split(',')[0];

        labelWrapper.appendChild(labelEl);
        wrapper.appendChild(labelWrapper);
      }

      const marker = new AdvancedMarkerElement({
        map,
        position: { lat, lng },
        title: h.address,
        content: wrapper,
        gmpDraggable: isPointerMode,
        zIndex: isSelected ? 50 : 35,
      });

      // Native DOM click handler for instant reliable selection
      wrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        if (activeToolRef.current === 'pointer') {
          handleSelectHouseholdRef.current(h);
        }
      });

      // Drag event to move household location
      marker.addListener('dragend', () => {
        const newPos = marker.position;
        if (newPos) {
          const newLat = typeof newPos.lat === 'function' ? (newPos.lat as unknown as () => number)() : Number(newPos.lat);
          const newLng = typeof newPos.lng === 'function' ? (newPos.lng as unknown as () => number)() : Number(newPos.lng);
          if (!Number.isNaN(newLat) && !Number.isNaN(newLng)) {
            handleMoveHouseholdRef.current?.(h.id, newLat, newLng);
          }
        }
      });

      householdMarkersRef.current.push(marker);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, householdsKey, layerSettings.showHouses, layerSettings.showHouseLabels, layerSettings.householdFilter, activeTool, selectedHouseholdId]);

  // 7. Render Active Drawing Preview (Road corridor / polygon)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || typeof google === 'undefined' || !google.maps.marker) return;

    drawingPolysRef.current.forEach((p) => p.setMap(null));
    drawingPolysRef.current = [];

    drawingMarkersRef.current.forEach((m) => {
      m.map = null;
    });
    drawingMarkersRef.current = [];

    const { AdvancedMarkerElement } = google.maps.marker;

    if (drawnPoints.length > 0) {
      if (activeTool === 'boundary') {
        const poly = new google.maps.Polygon({
          paths: drawnPoints,
          strokeColor: '#F59E0B',
          strokeOpacity: 1,
          strokeWeight: 2.5,
          fillColor: '#FBBF24',
          fillOpacity: 0.25,
          map,
        });
        drawingPolysRef.current.push(poly);
      } else if (activeTool === 'road') {
        // Active Road drawing: realistic street scale with dark casing, yellow pavement, and visible dashed centerline
        const roadCasing = new google.maps.Polyline({
          path: drawnPoints,
          strokeColor: '#334155', // Dark slate road curb
          strokeWeight: 10,
          strokeOpacity: 0.95,
          zIndex: 20,
          map,
        });
        const roadSurface = new google.maps.Polyline({
          path: drawnPoints,
          strokeColor: '#FEF9C3', // Warm active pavement
          strokeWeight: 6.5,
          strokeOpacity: 1.0,
          zIndex: 21,
          map,
        });
        const roadCenterline = new google.maps.Polyline({
          path: drawnPoints,
          strokeOpacity: 0, // Transparent base line so dashed icons render with clean gaps
          zIndex: 22,
          icons: [
            {
              icon: {
                path: 'M 0,-1 0,1',
                strokeOpacity: 1,
                strokeColor: '#D97706',
                strokeWeight: 1.5,
                scale: 2.5,
              },
              offset: '0',
              repeat: '12px',
            },
          ],
          map,
        });

        drawingPolysRef.current.push(roadCasing, roadSurface, roadCenterline);
      }

      drawnPoints.forEach((pt, idx) => {
        const dot = document.createElement('div');
        dot.style.width = '14px';
        dot.style.height = '14px';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = idx === 0 ? '#10B981' : '#F59E0B';
        dot.style.border = '2.5px solid #FFFFFF';
        dot.style.boxShadow = '0 2px 6px rgba(0,0,0,0.35)';

        const marker = new AdvancedMarkerElement({
          map,
          position: pt,
          content: dot,
        });
        drawingMarkersRef.current.push(marker);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, drawnPointsKey, activeTool]);

  // 8. Render Territory Annotations (Roads, Landmarks, Start Flag) with Vertex Editing & Sub-Pixel Tip Anchors
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || typeof google === 'undefined' || !google.maps.marker) return;

    roadPolylinesRef.current.forEach((r) => r.setMap(null));
    roadPolylinesRef.current = [];

    roadLabelMarkersRef.current.forEach((m) => {
      m.map = null;
    });
    roadLabelMarkersRef.current = [];

    landmarkMarkersRef.current.forEach((lm) => {
      lm.map = null;
    });
    landmarkMarkersRef.current = [];

    if (startFlagMarkerRef.current) {
      startFlagMarkerRef.current.map = null;
      startFlagMarkerRef.current = null;
    }

    const annotations = territory?.annotations;
    if (!annotations) return;

    const { AdvancedMarkerElement } = google.maps.marker;
    const isPointerMode = activeTool === 'pointer';

    // 8a. Roads: Cartographic road corridor with editable vertices, casing, pavement, center markings, and pointing callout badge
    if (layerSettings.showRoads !== false && annotations.roads && annotations.roads.length > 0) {
      annotations.roads.forEach((road) => {
        if (!road.points || road.points.length < 2) return;

        // Determine style palette
        let casingColor = '#334155';
        let surfaceColor = '#FFFFFF';
        let centerColor = '#EAB308';
        let casingWeight = 10;
        let surfaceWeight = 6.5;

        if (road.color === 'avenue' || road.color === '#EAB308') {
          casingColor = '#B45309';
          surfaceColor = '#FEF08A';
          centerColor = '#D97706';
          casingWeight = 10.5;
          surfaceWeight = 7;
        } else if (road.color === 'dirt' || road.color === '#78350F') {
          casingColor = '#78350F';
          surfaceColor = '#FDE68A';
          centerColor = '#92400E';
          casingWeight = 9;
          surfaceWeight = 5.5;
        } else if (road.color === 'walkway' || road.color === '#0D9488') {
          casingColor = '#334155';
          surfaceColor = '#CCFBF1';
          centerColor = '#0F766E';
          casingWeight = 6.5;
          surfaceWeight = 4;
        }

        const isSelected = selectedRoadId === road.id;

        // If selected, render a smooth, subtle blue highlight aura underlay
        if (isSelected) {
          const highlightAura = new google.maps.Polyline({
            path: road.points,
            strokeColor: '#3B82F6',
            strokeWeight: casingWeight + 6,
            strokeOpacity: 0.4,
            zIndex: 9,
            clickable: false,
            map,
          });
          roadPolylinesRef.current.push(highlightAura);
        }

        // Outer dark casing (road curb / asphalt border)
        const casing = new google.maps.Polyline({
          path: road.points,
          strokeColor: isSelected ? '#1D4ED8' : casingColor,
          strokeWeight: isSelected ? casingWeight + 1 : casingWeight,
          strokeOpacity: 0.95,
          zIndex: isSelected ? 14 : 10,
          map,
        });

        // Inner clean road surface (pavement) - editable in pointer mode!
        const pavement = new google.maps.Polyline({
          path: road.points,
          strokeColor: surfaceColor,
          strokeWeight: surfaceWeight,
          strokeOpacity: 1.0,
          zIndex: isSelected ? 15 : 11,
          editable: isPointerMode || activeTool === 'road',
          map,
        });

        // Road center dashed line (transparent base polyline so dashed symbols render visibly)
        const centerline = new google.maps.Polyline({
          path: road.points,
          strokeOpacity: 0,
          zIndex: isSelected ? 16 : 12,
          clickable: false,
          icons: [
            {
              icon: {
                path: 'M 0,-1 0,1',
                strokeOpacity: 1,
                strokeColor: centerColor,
                strokeWeight: 1.5,
                scale: 2.5,
              },
              offset: '0',
              repeat: '12px',
            },
          ],
          map,
        });

        // Right-click vertex deletion on road
        pavement.addListener('rightclick', (e: google.maps.PolyMouseEvent) => {
          if (e.vertex != null) {
            pavement.getPath().removeAt(e.vertex);
          }
        });

        // Sync vertex modifications across all 3 layers and propagate to database
        const roadPath = pavement.getPath();
        const handleRoadPathChange = () => {
          casing.setPath(roadPath);
          centerline.setPath(roadPath);

          const updatedPoints = roadPath.getArray().map((pt) => ({
            lat: pt.lat(),
            lng: pt.lng(),
          }));
          if (updatedPoints.length >= 2) {
            handleUpdateRoadPointsRef.current?.(road.id, updatedPoints);
          }
        };

        roadPath.addListener('set_at', handleRoadPathChange);
        roadPath.addListener('insert_at', handleRoadPathChange);
        roadPath.addListener('remove_at', handleRoadPathChange);

        // Click listeners on road polylines for selection & editing
        casing.addListener('click', () => {
          if (activeToolRef.current === 'pointer') {
            handleSelectRoadRef.current?.(road);
          }
        });
        pavement.addListener('click', () => {
          if (activeToolRef.current === 'pointer') {
            handleSelectRoadRef.current?.(road);
          }
        });

        roadPolylinesRef.current.push(casing, pavement, centerline);

        // Place road callout that POINTS to the road, floating above without overlaying the pavement
        if (road.name) {
          const midIdx = Math.floor(road.points.length / 2);
          const midPt = road.points[midIdx];

          // Zero-width/height container rooted at the road point
          const roadCallout = document.createElement('div');
          roadCallout.style.position = 'relative';
          roadCallout.style.width = '0px';
          roadCallout.style.height = '0px';
          roadCallout.style.cursor = isPointerMode ? 'pointer' : 'default';
          roadCallout.style.pointerEvents = 'auto';

          roadCallout.innerHTML = `
            <!-- Anchor dot directly on the road coordinate (0, 0) -->
            <div style="position: absolute; left: -3px; bottom: -3px; width: 6px; height: 6px; border-radius: 50%; background-color: ${isSelected ? '#2563EB' : '#334155'}; border: 1.5px solid #FFFFFF; box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></div>
            <!-- Vertical stem extending up from the road -->
            <div style="position: absolute; left: -1px; bottom: 3px; width: 2px; height: 10px; background-color: ${isSelected ? '#2563EB' : '#334155'};"></div>
            <!-- Road name with Google Maps white-stroked halo without background chip -->
            <div style="position: absolute; left: 0; bottom: 13px; transform: translateX(-50%); white-space: nowrap; font-size: 11px; font-weight: 800; color: ${isSelected ? '#1D4ED8' : '#1E293B'}; paint-order: stroke fill; -webkit-text-stroke: 3px #FFFFFF; text-shadow: 0 0 3px #FFFFFF, 0 0 3px #FFFFFF, 0 1px 2px rgba(0,0,0,0.25); letter-spacing: -0.01em; line-height: 1.15;">
              ${road.name}
            </div>
          `;

          roadCallout.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activeToolRef.current === 'pointer') {
              handleSelectRoadRef.current?.(road);
            }
          });

          const labelMarker = new AdvancedMarkerElement({
            map,
            position: midPt,
            content: roadCallout,
            zIndex: isSelected ? 20 : 15,
          });
          roadLabelMarkersRef.current.push(labelMarker);
        }
      });
    }

    // 8b. Landmarks (Teardrop POI Pins with Tip Anchor & Adjacent Label)
    if (layerSettings.showLandmarks !== false && annotations.landmarks && annotations.landmarks.length > 0) {
      annotations.landmarks.forEach((landmark) => {
        if (typeof landmark.lat !== 'number' || typeof landmark.lng !== 'number') return;

        const { bg, svg } = getLandmarkIconConfig(landmark.type);

        // Zero-width/height container: (0, 0) is the exact landmark coordinate
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.width = '0px';
        wrapper.style.height = '0px';
        wrapper.style.cursor = isPointerMode ? 'grab' : 'pointer';
        wrapper.style.pointerEvents = 'auto';
        wrapper.title = landmark.label || 'Landmark';

        const isSelected = selectedLandmarkId === landmark.id;

        // Pin Element: 24px wide, positioned left: -12px and bottom: 0px -> tip is PRECISELY at (0, 0)
        const pinContainer = document.createElement('div');
        pinContainer.style.position = 'absolute';
        pinContainer.style.left = '-12px';
        pinContainer.style.bottom = '0px';
        pinContainer.style.width = '24px';
        pinContainer.style.display = 'flex';
        pinContainer.style.flexDirection = 'column';
        pinContainer.style.alignItems = 'center';
        pinContainer.style.filter = isSelected
          ? 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))'
          : 'drop-shadow(0 2px 4px rgba(0,0,0,0.32))';
        pinContainer.style.transform = isSelected ? 'scale(1.08)' : 'scale(1)';
        pinContainer.style.transformOrigin = 'bottom center';
        pinContainer.style.transition = 'transform 0.15s ease-out';

        pinContainer.innerHTML = `
          <div style="background-color: ${bg}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #FFFFFF; box-shadow: ${isSelected ? '0 0 0 2px #3B82F6, 0 1px 3px rgba(0,0,0,0.2)' : 'none'}; color: #FFFFFF; z-index: 2; box-sizing: border-box; padding: 5.5px;">
            ${svg}
          </div>
          <div style="background-color: ${bg}; width: 6.5px; height: 6.5px; transform: rotate(45deg); margin-top: -4px; border-right: 2px solid #FFFFFF; border-bottom: 2px solid #FFFFFF; z-index: 1;"></div>
        `;

        wrapper.appendChild(pinContainer);

        // Label beside pin: pure text with white stroke / halo
        const labelWrapper = document.createElement('div');
        labelWrapper.style.position = 'absolute';
        labelWrapper.style.left = '15px';
        labelWrapper.style.bottom = '10px';
        labelWrapper.style.whiteSpace = 'nowrap';
        labelWrapper.style.pointerEvents = 'none';

        const labelEl = document.createElement('span');
        labelEl.style.fontSize = '10.5px';
        labelEl.style.fontWeight = '700';
        labelEl.style.color = isSelected ? '#1E293B' : '#334155';
        labelEl.style.paintOrder = 'stroke fill';
        labelEl.style.webkitTextStroke = '3px #FFFFFF';
        labelEl.style.textShadow = '0 0 3px #FFFFFF, 0 0 3px #FFFFFF, 0 1px 2px rgba(0,0,0,0.25)';
        labelEl.style.lineHeight = '1.15';
        labelEl.style.letterSpacing = '-0.01em';
        labelEl.textContent = landmark.label || 'Landmark';

        labelWrapper.appendChild(labelEl);
        wrapper.appendChild(labelWrapper);

        wrapper.addEventListener('click', (e) => {
          e.stopPropagation();
          if (activeToolRef.current === 'pointer') {
            handleSelectLandmarkRef.current?.(landmark);
          }
        });

        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: landmark.lat, lng: landmark.lng },
          title: landmark.label || 'Landmark',
          content: wrapper,
          gmpDraggable: isPointerMode,
          zIndex: isSelected ? 50 : 30,
        });

        marker.addListener('dragend', () => {
          const newPos = marker.position;
          if (newPos) {
            const newLat = typeof newPos.lat === 'function' ? (newPos.lat as unknown as () => number)() : Number(newPos.lat);
            const newLng = typeof newPos.lng === 'function' ? (newPos.lng as unknown as () => number)() : Number(newPos.lng);
            if (!Number.isNaN(newLat) && !Number.isNaN(newLng)) {
              handleMoveLandmarkRef.current?.(landmark.id, newLat, newLng);
            }
          }
        });

        landmarkMarkersRef.current.push(marker);
      });
    }

    // 8c. Start Flag: Physical Map Marker Icon & Pointer Tip with Adjacent Label
    if (layerSettings.showStartFlag !== false && annotations.startFlag) {
      const sf = annotations.startFlag;
      if (typeof sf.lat === 'number' && typeof sf.lng === 'number') {
        // Zero-width/height container: (0, 0) is the exact start flag coordinate
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.width = '0px';
        wrapper.style.height = '0px';
        wrapper.style.cursor = isPointerMode ? 'grab' : 'pointer';
        wrapper.style.pointerEvents = 'auto';
        wrapper.title = sf.label || 'Territory Start Meeting Point';

        // Pin Element: 24px wide, positioned left: -12px and bottom: 0px -> tip is PRECISELY at (0, 0)
        const pinContainer = document.createElement('div');
        pinContainer.style.position = 'absolute';
        pinContainer.style.left = '-12px';
        pinContainer.style.bottom = '0px';
        pinContainer.style.width = '24px';
        pinContainer.style.display = 'flex';
        pinContainer.style.flexDirection = 'column';
        pinContainer.style.alignItems = 'center';
        pinContainer.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.32))';

        pinContainer.innerHTML = `
          <div style="background-color: #059669; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #FFFFFF; color: #FFFFFF; z-index: 2; box-sizing: border-box; padding: 5.5px;">
            <svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
              <line x1="4" x2="4" y1="22" y2="15"/>
            </svg>
          </div>
          <div style="background-color: #059669; width: 6.5px; height: 6.5px; transform: rotate(45deg); margin-top: -4px; border-right: 2px solid #FFFFFF; border-bottom: 2px solid #FFFFFF; z-index: 1;"></div>
        `;

        wrapper.appendChild(pinContainer);

        // Label beside pin: pure text with white stroke / halo
        const labelWrapper = document.createElement('div');
        labelWrapper.style.position = 'absolute';
        labelWrapper.style.left = '15px';
        labelWrapper.style.bottom = '10px';
        labelWrapper.style.whiteSpace = 'nowrap';
        labelWrapper.style.pointerEvents = 'none';

        const labelEl = document.createElement('span');
        labelEl.style.fontSize = '10.5px';
        labelEl.style.fontWeight = '700';
        labelEl.style.color = '#065F46';
        labelEl.style.paintOrder = 'stroke fill';
        labelEl.style.webkitTextStroke = '3px #FFFFFF';
        labelEl.style.textShadow = '0 0 3px #FFFFFF, 0 0 3px #FFFFFF, 0 1px 2px rgba(0,0,0,0.25)';
        labelEl.style.lineHeight = '1.15';
        labelEl.style.letterSpacing = '-0.01em';
        labelEl.textContent = sf.label || 'Start Meeting Point';

        labelWrapper.appendChild(labelEl);
        wrapper.appendChild(labelWrapper);

        wrapper.addEventListener('click', (e) => {
          e.stopPropagation();
          if (activeToolRef.current === 'pointer') {
            handleSelectStartFlagRef.current?.();
          }
        });

        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: sf.lat, lng: sf.lng },
          title: sf.label || 'Territory Start Meeting Point',
          content: wrapper,
          gmpDraggable: isPointerMode,
          zIndex: 40,
        });

        marker.addListener('dragend', () => {
          const newPos = marker.position;
          if (newPos) {
            const newLat = typeof newPos.lat === 'function' ? (newPos.lat as unknown as () => number)() : Number(newPos.lat);
            const newLng = typeof newPos.lng === 'function' ? (newPos.lng as unknown as () => number)() : Number(newPos.lng);
            if (!Number.isNaN(newLat) && !Number.isNaN(newLng)) {
              handleMoveStartFlagRef.current?.(newLat, newLng);
            }
          }
        });

        startFlagMarkerRef.current = marker;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, roadsAndLandmarksKey, layerSettings.showRoads, layerSettings.showLandmarks, layerSettings.showStartFlag, activeTool, selectedLandmarkId, selectedRoadId]);

  // 9. Render User Live GPS Location Dot with Compass Heading Flashlight Beam
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || typeof google === 'undefined' || !google.maps.marker) return;

    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.map = null;
      userLocationMarkerRef.current = null;
    }
    if (userLocationAccuracyCircleRef.current) {
      userLocationAccuracyCircleRef.current.setMap(null);
      userLocationAccuracyCircleRef.current = null;
    }

    if (!userLocation || layerSettings.showUserLocation === false) {
      return;
    }

    const { AdvancedMarkerElement } = google.maps.marker;
    const { lat, lng, accuracy } = userLocation;
    const effectiveHeading = userHeading ?? 0;
    const hasHeading = userHeading != null;

    // Accuracy Circle
    if (accuracy && accuracy > 5 && accuracy < 2000) {
      const circle = new google.maps.Circle({
        center: { lat, lng },
        radius: accuracy,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.25,
        strokeWeight: 1,
        fillColor: '#3B82F6',
        fillOpacity: 0.08,
        clickable: false,
        zIndex: 1,
        map,
      });
      userLocationAccuracyCircleRef.current = circle;
    }

    // Flashlight cone & GPS dot element
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '0px';
    container.style.height = '0px';
    container.style.pointerEvents = 'none';

    container.innerHTML = `
      <!-- Flashlight Heading Beam Cone -->
      ${
        hasHeading
          ? `
        <div style="position: absolute; left: -75px; bottom: -75px; width: 150px; height: 150px; transform: rotate(${effectiveHeading}deg); transform-origin: 75px 75px; pointer-events: none; transition: transform 0.15s ease-out; z-index: 1;">
          <svg width="150" height="150" viewBox="0 0 150 150" style="overflow: visible;">
            <defs>
              <radialGradient id="flashlightBeam" cx="75" cy="75" r="75" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.65"/>
                <stop offset="40%" stop-color="#60A5FA" stop-opacity="0.3"/>
                <stop offset="75%" stop-color="#93C5FD" stop-opacity="0.1"/>
                <stop offset="100%" stop-color="#BFDBFE" stop-opacity="0"/>
              </radialGradient>
            </defs>
            <!-- 65° Flashlight Beam Sector pointing North (Up) -->
            <path d="M 75,75 L 34.7,11.7 A 75,75 0 0,1 115.3,11.7 Z" fill="url(#flashlightBeam)" />
          </svg>
        </div>
      `
          : ''
      }

      <!-- Pulsing Blue Location Halo -->
      <div style="position: absolute; left: -18px; bottom: -18px; width: 36px; height: 36px; border-radius: 50%; background-color: rgba(59, 130, 246, 0.2); border: 1.5px solid rgba(59, 130, 246, 0.5); pointer-events: none; z-index: 2;"></div>

      <!-- Core Blue GPS Location Dot -->
      <div style="position: absolute; left: -7px; bottom: -7px; width: 14px; height: 14px; border-radius: 50%; background-color: #2563EB; border: 2.5px solid #FFFFFF; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4); pointer-events: none; z-index: 3;"></div>
    `;

    const marker = new AdvancedMarkerElement({
      map,
      position: { lat, lng },
      content: container,
      zIndex: 100,
    });

    userLocationMarkerRef.current = marker;
  }, [mapReady, userLocation?.lat, userLocation?.lng, userLocation?.accuracy, userHeading, layerSettings.showUserLocation]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {!mapReady && !loadError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-card border border-border shadow-lg">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-xs font-semibold text-foreground">Loading Google Maps Base Map…</p>
          </div>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-background/90">
          <div className="max-w-md p-6 rounded-3xl bg-card border border-destructive/30 shadow-xl space-y-3 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
            <h3 className="text-sm font-bold text-foreground">Map Initialization Notice</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{loadError}</p>
          </div>
        </div>
      )}

      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
