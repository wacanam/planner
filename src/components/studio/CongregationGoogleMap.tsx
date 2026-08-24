'use client';

import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getHouseholdMapLabel } from '@/lib/household-contacts';
import type {
  Congregation,
  Household,
  MapLandmark,
  MapRoad,
  SharedMemberLocation,
  Territory,
} from '@/types/api';
import {
  type BasemapMode,
  type BoundaryDisplaySettings,
  resolveBoundaryDisplay,
  type StudioLayerSettings,
} from './StudioBasemapPopup';
import { getTerritoryBoundaries } from './StudioGoogleMap';

export interface CongregationGoogleMapProps {
  territories: Territory[];
  congregation?: Congregation | null;
  households: Household[];
  memberLocations?: SharedMemberLocation[];
  selectedTerritoryId?: string | null;
  selectedHouseholdId?: string | null;
  selectedLandmarkId?: string | null;
  selectedRoadId?: string | null;
  selectedStartFlagTerritoryId?: string | null;
  selectedMemberLocationId?: string | null;
  onSelectTerritory: (territory: Territory) => void;
  onSelectHousehold: (household: Household) => void;
  onSelectLandmark: (landmark: MapLandmark, territory: Territory) => void;
  onSelectRoad: (road: MapRoad, territory: Territory) => void;
  onSelectStartFlag: (territory: Territory) => void;
  onSelectMemberLocation: (loc: SharedMemberLocation) => void;
  onDeselectAll: () => void;
  basemapMode: BasemapMode;
  layerSettings: StudioLayerSettings;
  boundaryDisplay?: BoundaryDisplaySettings;
  searchedLocation?: { lat: number; lng: number; zoom?: number; timestamp: number } | null;
  targetCamera?: { heading?: number; tilt?: number; immediate?: boolean; timestamp: number } | null;
  onCameraChange?: (camera: { heading: number; tilt: number }) => void;
  userLocation?: { lat: number; lng: number; accuracy?: number } | null;
  userHeading?: number | null;
  currentUserId?: string | null;
  territoryFilterId?: string | null;
  statusFilter?: string | null;
  groupFilterId?: string | null;
}

const HARDCODED_FALLBACK_CENTER = { lat: 8.3683, lng: 124.8644 };

// Outer world ring for dimming exterior areas
const WORLD_MASK_RING: Array<{ lat: number; lng: number }> = [
  { lat: 85.0, lng: -180.0 },
  { lat: 85.0, lng: 0.0 },
  { lat: 85.0, lng: 180.0 },
  { lat: -85.0, lng: 180.0 },
  { lat: -85.0, lng: 0.0 },
  { lat: -85.0, lng: -180.0 },
  { lat: 85.0, lng: -180.0 },
];

function getPlanarSignedArea(pts: Array<{ lat: number; lng: number }>): number {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    sum += (p2.lng - p1.lng) * (p2.lat + p1.lat);
  }
  return sum;
}

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
      // Ignored
    }
  }
}

function getTerritoryStatusPalette(status?: string | null): {
  stroke: string;
  fill: string;
  badgeBg: string;
  badgeText: string;
} {
  switch (status) {
    case 'available':
      return {
        stroke: '#059669', // Emerald
        fill: '#10B981',
        badgeBg: '#ECFDF5',
        badgeText: '#065F46',
      };
    case 'assigned':
      return {
        stroke: '#2563EB', // Blue
        fill: '#3B82F6',
        badgeBg: '#EFF6FF',
        badgeText: '#1E40AF',
      };
    case 'pending':
    case 'overdue':
      return {
        stroke: '#D97706', // Amber
        fill: '#F59E0B',
        badgeBg: '#FFFBEB',
        badgeText: '#92400E',
      };
    case 'completed':
    case 'archived':
      return {
        stroke: '#64748B', // Slate
        fill: '#94A3B8',
        badgeBg: '#F8FAFC',
        badgeText: '#334155',
      };
    default:
      return {
        stroke: '#4F46E5', // Indigo
        fill: '#6366F1',
        badgeBg: '#EEF2FF',
        badgeText: '#3730A3',
      };
  }
}

function getLandmarkIconConfig(type: string): { bg: string; svg: string } {
  switch (type) {
    case 'tree':
      return {
        bg: '#10B981',
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="currentColor" style="display: block; margin: auto;">
          <path d="M12 2C9.24 2 7 4.24 7 7c0 .52.08 1.02.24 1.49C5.35 9.38 4 11.03 4 13c0 2.76 2.24 5 5 5h6c2.76 0 5-2.24 5-5 0-1.97-1.35-3.62-3.24-4.51.16-.47.24-.97.24-1.49 0-2.76-2.24-5-5-5z"/>
          <path d="M10.5 18H13.5V22H10.5z"/>
        </svg>`,
      };
    case 'school':
      return {
        bg: '#3B82F6',
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c3 3 9 3 12 0v-5"/>
        </svg>`,
      };
    case 'church':
      return {
        bg: '#8B5CF6',
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M12 2v5"/>
          <path d="M9.5 4.5h5"/>
          <path d="m18 10-6-4-6 4v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2Z"/>
          <path d="M10 21v-4a2 2 0 0 1 4 0v4"/>
        </svg>`,
      };
    case 'hospital':
      return {
        bg: '#F43F5E',
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M12 6v12M6 12h12"/>
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2z"/>
        </svg>`,
      };
    case 'store':
      return {
        bg: '#F59E0B',
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
          <path d="M2 7h20"/>
        </svg>`,
      };
    case 'restaurant':
      return {
        bg: '#EA580C',
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/>
          <path d="M15 2v12"/>
          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
          <path d="M3 2v20"/>
        </svg>`,
      };
    case 'park':
      return {
        bg: '#059669',
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
          <path d="M2 12h20"/>
        </svg>`,
      };
    case 'government':
      return {
        bg: '#7C3AED',
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
          <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
          <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
          <path d="M10 6h4M10 10h4M10 14h4M10 18h4"/>
        </svg>`,
      };
    case 'water':
      return {
        bg: '#06B6D4',
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
        </svg>`,
      };
    case 'bridge':
      return {
        bg: '#0284C7',
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14"/>
          <path d="M4 12h16"/>
          <path d="M12 12v7"/>
        </svg>`,
      };
    case 'gas_station':
      return {
        bg: '#D97706',
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M3 22h12"/>
          <path d="M4 22V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v18"/>
          <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/>
          <path d="M8 6h2"/>
        </svg>`,
      };
    case 'transit':
      return {
        bg: '#0D9488',
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M8 6v6M16 6v6M4 18v3M20 18v3"/>
          <path d="M4 11V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7"/>
          <path d="M4 11h16a2 2 0 0 1 2 2v5H2v-5a2 2 0 0 1 2-2Z"/>
        </svg>`,
      };
    case 'building':
      return {
        bg: '#475569',
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
          <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>
        </svg>`,
      };
    case 'tower':
      return {
        bg: '#78716C',
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M4.93 4.93a10 10 0 0 1 14.14 0"/>
          <path d="M7.76 7.76a6 6 0 0 1 8.48 0"/>
          <circle cx="12" cy="12" r="2"/>
          <path d="M12 14v8"/>
        </svg>`,
      };
    case 'gate':
      return {
        bg: '#64748B',
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M3 21h18"/>
          <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>
          <circle cx="14" cy="12" r="1"/>
        </svg>`,
      };
    case 'hazard':
      return {
        bg: '#EF4444',
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>`,
      };
    case 'landmark':
      return {
        bg: '#6366F1',
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
        bg: '#F97316',
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <circle cx="12" cy="10" r="3"/>
          <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/>
        </svg>`,
      };
  }
}

function getHouseholdStatusColor(status?: string): string {
  switch (status) {
    case 'active':
      return '#16A34A';
    case 'not_home':
      return '#D97706';
    case 'busy':
      return '#F97316';
    case 'return_visit':
      return '#2563EB';
    case 'foreign_language':
      return '#06B6D4';
    case 'inaccessible':
      return '#78716C';
    case 'vacant':
      return '#64748B';
    case 'do_not_visit':
      return '#DC2626';
    default:
      return '#64748B';
  }
}

export function CongregationGoogleMap({
  territories,
  congregation,
  households,
  memberLocations = [],
  selectedTerritoryId,
  selectedHouseholdId,
  selectedLandmarkId,
  selectedRoadId,
  selectedStartFlagTerritoryId,
  selectedMemberLocationId,
  onSelectTerritory,
  onSelectHousehold,
  onSelectLandmark,
  onSelectRoad,
  onSelectStartFlag,
  onSelectMemberLocation,
  onDeselectAll,
  basemapMode,
  layerSettings,
  boundaryDisplay,
  searchedLocation,
  targetCamera,
  onCameraChange,
  userLocation,
  userHeading,
  currentUserId,
  territoryFilterId,
  statusFilter,
  groupFilterId,
}: CongregationGoogleMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  // References for zero-flicker updates
  const territoryPolygonsRef = useRef<
    Array<{
      territoryId: string;
      boundaryId: string;
      polygon: google.maps.Polygon;
      strokeColor: string;
      fillColor: string;
    }>
  >([]);

  const territoryBadgesRef = useRef<
    Array<{
      territoryId: string;
      marker: google.maps.marker.AdvancedMarkerElement;
      badgeEl: HTMLDivElement;
      strokeColor: string;
    }>
  >([]);

  const maskPolygonRef = useRef<google.maps.Polygon | null>(null);
  const householdMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const landmarkMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const roadPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const roadLabelMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const startFlagMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  const memberMarkersDataRef = useRef<
    Map<
      string,
      {
        id: string;
        marker: google.maps.marker.AdvancedMarkerElement;
        accuracyCircle?: google.maps.Circle | null;
        pinContainer: HTMLDivElement;
      }
    >
  >(new Map());

  // GPS Heading cone refs
  const userLocationMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const userLocationAccuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const userLocationBeamRef = useRef<HTMLDivElement | null>(null);
  const lastLocationPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const _currentBeamAngleRef = useRef<number | null>(null);
  const _targetBeamAngleRef = useRef<number | null>(null);
  const _beamRafIdRef = useRef<number | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const initialBoundsFittedRef = useRef(false);
  const isProgrammaticCameraUpdateRef = useRef(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // Filtered Territories list
  const filteredTerritories = useMemo(() => {
    return territories.filter((t) => {
      if (territoryFilterId && t.id !== territoryFilterId) return false;
      if (statusFilter && statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (groupFilterId && groupFilterId !== 'all' && t.groupId !== groupFilterId) return false;
      return true;
    });
  }, [territories, territoryFilterId, statusFilter, groupFilterId]);

  // Filtered Households list
  const filteredHouseholds = useMemo(() => {
    const validTerritoryIds = new Set(filteredTerritories.map((t) => t.id));
    return households.filter((h) => {
      if (h.territoryId && !validTerritoryIds.has(h.territoryId)) return false;
      if (layerSettings.householdFilter && layerSettings.householdFilter !== 'all') {
        if (h.status !== layerSettings.householdFilter) return false;
      }
      return true;
    });
  }, [households, filteredTerritories, layerSettings.householdFilter]);

  // Congregation default center
  const defaultCenter = useMemo(() => {
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

  // Callback refs to maintain stable event handlers
  const handleSelectTerritoryRef = useRef(onSelectTerritory);
  handleSelectTerritoryRef.current = onSelectTerritory;

  const handleSelectHouseholdRef = useRef(onSelectHousehold);
  handleSelectHouseholdRef.current = onSelectHousehold;

  const handleSelectLandmarkRef = useRef(onSelectLandmark);
  handleSelectLandmarkRef.current = onSelectLandmark;

  const handleSelectRoadRef = useRef(onSelectRoad);
  handleSelectRoadRef.current = onSelectRoad;

  const handleSelectStartFlagRef = useRef(onSelectStartFlag);
  handleSelectStartFlagRef.current = onSelectStartFlag;

  const handleSelectMemberLocationRef = useRef(onSelectMemberLocation);
  handleSelectMemberLocationRef.current = onSelectMemberLocation;

  const handleDeselectAllRef = useRef(onDeselectAll);
  handleDeselectAllRef.current = onDeselectAll;

  const handleCameraChangeRef = useRef(onCameraChange);
  handleCameraChangeRef.current = onCameraChange;

  const basemapModeRef = useRef(basemapMode);
  basemapModeRef.current = basemapMode;

  // 1. Initialize Google Map Instance
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
        const { Map: GoogleMap, RenderingType } = (await importLibrary(
          'maps'
        )) as google.maps.MapsLibrary & {
          RenderingType?: { VECTOR: google.maps.RenderingType; RASTER: google.maps.RenderingType };
        };
        await importLibrary('geometry');
        await importLibrary('marker');

        if (!isMounted || !mapContainerRef.current) return;
        if (mapInstanceRef.current) return;

        const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
        const map = new GoogleMap(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 14,
          mapId,
          mapTypeId: (basemapModeRef.current ?? basemapMode) === 'satellite' ? 'hybrid' : 'roadmap',
          renderingType: RenderingType?.VECTOR ?? 'VECTOR',
          isFractionalZoomEnabled: true,
          heading: 0,
          tilt: 0,
          disableDefaultUI: true,
          rotateControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          zoomControl: false,
          cameraControl: false,
          scaleControl: false,
          gestureHandling: 'greedy',
        });

        map.addListener('click', () => {
          handleDeselectAllRef.current?.();
        });

        const syncCameraState = () => {
          if (isProgrammaticCameraUpdateRef.current) return;
          const h = map.getHeading();
          const t = map.getTilt();
          if (typeof h === 'number' || typeof t === 'number') {
            handleCameraChangeRef.current?.({
              heading: typeof h === 'number' && !Number.isNaN(h) ? ((h % 360) + 360) % 360 : 0,
              tilt: typeof t === 'number' && !Number.isNaN(t) ? t : 0,
            });
          }
        };

        map.addListener('heading_changed', syncCameraState);
        map.addListener('tilt_changed', syncCameraState);
        map.addListener('camera_changed', syncCameraState);

        mapInstanceRef.current = map;
        setMapReady(true);
      } catch (err: unknown) {
        console.error('Google Maps Load Error:', err);
        if (isMounted) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load Google Maps.');
        }
      }
    }

    void initMap();

    return () => {
      isMounted = false;
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.map = null;
        userLocationMarkerRef.current = null;
      }
      if (userLocationAccuracyCircleRef.current) {
        userLocationAccuracyCircleRef.current.setMap(null);
        userLocationAccuracyCircleRef.current = null;
      }
      memberMarkersDataRef.current.forEach((entry) => {
        entry.marker.map = null;
        entry.accuracyCircle?.setMap(null);
      });
      memberMarkersDataRef.current.clear();
    };
  }, [apiKey, defaultCenter]);

  // 2. Initial Fit Bounds across all Congregation Territories
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || typeof google === 'undefined' || initialBoundsFittedRef.current)
      return;
    if (territories.length === 0) return;

    let hasValidPoints = false;
    const bounds = new google.maps.LatLngBounds();

    territories.forEach((t) => {
      const boundaries = getTerritoryBoundaries(t);
      boundaries.forEach((b) => {
        b.points.forEach((pt) => {
          bounds.extend(pt);
          hasValidPoints = true;
        });
      });
    });

    if (hasValidPoints) {
      map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
      initialBoundsFittedRef.current = true;
    } else {
      map.setCenter(defaultCenter);
      map.setZoom(14);
      initialBoundsFittedRef.current = true;
    }
  }, [mapReady, territories, defaultCenter]);

  // 3. Basemap Mode (Street / Satellite Hybrid)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || typeof google === 'undefined') return;
    map.setMapTypeId(basemapMode === 'satellite' ? 'hybrid' : 'roadmap');
  }, [mapReady, basemapMode]);

  // 4. Parabolic Flight Camera Glide on Searched Location
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !searchedLocation) return;

    const currentCenter = map.getCenter();
    if (!currentCenter) {
      map.panTo({ lat: searchedLocation.lat, lng: searchedLocation.lng });
      map.setZoom(searchedLocation.zoom || 18);
      return;
    }

    const startLat = currentCenter.lat();
    const startLng = currentCenter.lng();
    const targetLat = searchedLocation.lat;
    const targetLng = searchedLocation.lng;
    const startZoom = map.getZoom() || 15;
    const targetZoom = searchedLocation.zoom || 18;
    const currentHeading = map.getHeading() || 0;
    const currentTilt = map.getTilt() || 0;

    const deltaLat = targetLat - startLat;
    const deltaLng = targetLng - startLng;
    const deltaZoom = targetZoom - startZoom;

    if (Math.abs(deltaLat) < 0.00001 && Math.abs(deltaLng) < 0.00001 && Math.abs(deltaZoom) < 0.1) {
      return;
    }

    const R = 6371;
    const dLat = ((targetLat - startLat) * Math.PI) / 180;
    const dLng = ((targetLng - startLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((startLat * Math.PI) / 180) *
        Math.cos((targetLat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    let duration = 900;
    if (distanceKm > 0.2 && distanceKm <= 2) {
      duration = 1100 + (distanceKm - 0.2) * 200;
    } else if (distanceKm > 2) {
      duration = Math.min(2000, 1500 + distanceKm * 30);
    }

    isProgrammaticCameraUpdateRef.current = true;
    let animationFrameId: number;
    const startTime = performance.now();

    const easeInOutQuint = (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2);
    const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = distanceKm > 0.3 ? easeInOutQuint(progress) : easeOutCubic(progress);

      const lat = startLat + deltaLat * eased;
      const lng = startLng + deltaLng * eased;
      const baseZoom = startZoom + deltaZoom * eased;
      const arcDip = distanceKm > 0.5 ? 4 * 1.5 * progress * (1 - progress) : 0;
      const zoom = Math.max(2, baseZoom - arcDip);

      if (typeof map.moveCamera === 'function') {
        try {
          map.moveCamera({
            center: { lat, lng },
            zoom,
            heading: currentHeading,
            tilt: currentTilt,
          });
        } catch {
          map.setCenter({ lat, lng });
          map.setZoom(Math.round(zoom));
        }
      } else {
        map.setCenter({ lat, lng });
        map.setZoom(Math.round(zoom));
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          isProgrammaticCameraUpdateRef.current = false;
        }, 50);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      isProgrammaticCameraUpdateRef.current = false;
    };
  }, [mapReady, searchedLocation]);

  // 5. Target Camera Heading / Tilt Sync
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !targetCamera) return;

    const endTilt = typeof targetCamera.tilt === 'number' ? targetCamera.tilt : map.getTilt() || 0;
    const endHeading =
      typeof targetCamera.heading === 'number'
        ? ((targetCamera.heading % 360) + 360) % 360
        : map.getHeading() || 0;

    isProgrammaticCameraUpdateRef.current = true;
    try {
      if (typeof map.moveCamera === 'function') {
        map.moveCamera({ tilt: endTilt, heading: endHeading });
      }
      if (typeof map.setTilt === 'function') {
        map.setTilt(endTilt);
      }
      if (typeof map.setHeading === 'function') {
        map.setHeading(endHeading);
      }
    } catch {
      // fallback
    } finally {
      setTimeout(() => {
        isProgrammaticCameraUpdateRef.current = false;
      }, 16);
    }
  }, [mapReady, targetCamera]);

  // 6. Render All Territory Boundary Polygons & Centroid Identification Badges
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || typeof google === 'undefined' || !google.maps.marker) return;

    // Clean up previous polygons
    territoryPolygonsRef.current.forEach((item) => {
      item.polygon.setMap(null);
    });
    territoryPolygonsRef.current = [];

    territoryBadgesRef.current.forEach((item) => {
      item.marker.map = null;
    });
    territoryBadgesRef.current = [];

    if (maskPolygonRef.current) {
      maskPolygonRef.current.setMap(null);
      maskPolygonRef.current = null;
    }

    if (layerSettings.showBoundaries === false) return;

    const { AdvancedMarkerElement } = google.maps.marker;
    const effectiveDisplay = resolveBoundaryDisplay(boundaryDisplay);

    // Outside Mask Cutouts
    if (effectiveDisplay.maskOpacity > 0) {
      const allHoles: Array<Array<{ lat: number; lng: number }>> = [];
      filteredTerritories.forEach((t) => {
        const boundaries = getTerritoryBoundaries(t);
        boundaries.forEach((b) => {
          if (b.points && b.points.length >= 3) {
            allHoles.push(ensureOppositeWinding(b.points, WORLD_MASK_RING));
          }
        });
      });

      if (allHoles.length > 0) {
        const maskPoly = new google.maps.Polygon({
          paths: [WORLD_MASK_RING, ...allHoles],
          strokeWeight: 0,
          fillColor: '#000000',
          fillOpacity: effectiveDisplay.maskOpacity,
          map,
          clickable: false,
          zIndex: 1,
        });
        maskPolygonRef.current = maskPoly;
      }
    }

    // Render Territory Polygons
    filteredTerritories.forEach((territory) => {
      const boundaries = getTerritoryBoundaries(territory);
      const palette = getTerritoryStatusPalette(territory.status);
      const isTerritorySelected = selectedTerritoryId === territory.id;

      boundaries.forEach((boundary, bIdx) => {
        if (!boundary.points || boundary.points.length < 3) return;

        const polygon = new google.maps.Polygon({
          paths: boundary.points,
          strokeColor: isTerritorySelected ? '#2563EB' : boundary.color || palette.stroke,
          strokeOpacity: isTerritorySelected ? 1.0 : 0.9,
          strokeWeight: isTerritorySelected ? 4 : 2.5,
          fillColor: boundary.color || palette.fill,
          fillOpacity: isTerritorySelected ? 0.3 : Math.max(0.12, effectiveDisplay.fillOpacity),
          editable: false,
          draggable: false,
          map,
          clickable: true,
          zIndex: isTerritorySelected ? 10 : 3,
        });

        polygon.addListener('click', (e: google.maps.PolyMouseEvent) => {
          e.stop();
          handleSelectTerritoryRef.current?.(territory);
        });

        territoryPolygonsRef.current.push({
          territoryId: territory.id,
          boundaryId: boundary.id,
          polygon,
          strokeColor: boundary.color || palette.stroke,
          fillColor: boundary.color || palette.fill,
        });

        // Place Centroid Number Badge on primary boundary
        if (bIdx === 0 && boundary.points.length > 0) {
          let latSum = 0;
          let lngSum = 0;
          boundary.points.forEach((pt) => {
            latSum += pt.lat;
            lngSum += pt.lng;
          });
          const centerLat = latSum / boundary.points.length;
          const centerLng = lngSum / boundary.points.length;

          const badgeEl = document.createElement('div');
          badgeEl.className = 'territory-centroid-badge';
          badgeEl.style.position = 'relative';
          badgeEl.style.transform = 'translate(-50%, -50%)';
          badgeEl.style.padding = '3px 7px';
          badgeEl.style.borderRadius = '9999px';
          badgeEl.style.backgroundColor = isTerritorySelected ? '#2563EB' : palette.badgeBg;
          badgeEl.style.color = isTerritorySelected ? '#FFFFFF' : palette.badgeText;
          badgeEl.style.border = isTerritorySelected
            ? '2px solid #FFFFFF'
            : `1.5px solid ${palette.stroke}`;
          badgeEl.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
          badgeEl.style.fontSize = '11px';
          badgeEl.style.fontWeight = '800';
          badgeEl.style.letterSpacing = '-0.02em';
          badgeEl.style.cursor = 'pointer';
          badgeEl.style.whiteSpace = 'nowrap';
          badgeEl.style.transition = 'all 0.15s ease-out';
          badgeEl.textContent = `#${territory.number}`;
          badgeEl.title = `Territory #${territory.number}: ${territory.name} (${territory.status})`;

          badgeEl.addEventListener('click', (e) => {
            e.stopPropagation();
            handleSelectTerritoryRef.current?.(territory);
          });

          const badgeMarker = new AdvancedMarkerElement({
            map,
            position: { lat: centerLat, lng: centerLng },
            content: badgeEl,
            zIndex: isTerritorySelected ? 50 : 25,
          });

          territoryBadgesRef.current.push({
            territoryId: territory.id,
            marker: badgeMarker,
            badgeEl,
            strokeColor: palette.stroke,
          });
        }
      });
    });
  }, [
    mapReady,
    filteredTerritories,
    layerSettings.showBoundaries,
    boundaryDisplay,
    selectedTerritoryId,
  ]);

  // 7. Render All Congregation Households Door Pins
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || typeof google === 'undefined' || !google.maps.marker) return;

    householdMarkersRef.current.forEach((m) => {
      m.map = null;
    });
    householdMarkersRef.current = [];

    if (layerSettings.showHouses === false) return;

    const { AdvancedMarkerElement } = google.maps.marker;

    filteredHouseholds.forEach((h) => {
      const lat =
        typeof h.latitude === 'number' ? h.latitude : parseFloat(String(h.latitude || ''));
      const lng =
        typeof h.longitude === 'number' ? h.longitude : parseFloat(String(h.longitude || ''));
      if (Number.isNaN(lat) || Number.isNaN(lng) || lat === 0 || lng === 0) return;

      const isSelected = selectedHouseholdId === h.id;
      const pinColor = getHouseholdStatusColor(h.status);

      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.width = '0px';
      wrapper.style.height = '0px';
      wrapper.style.cursor = 'pointer';
      wrapper.title = `${h.address} (${h.status.replace(/_/g, ' ')})`;

      const pinContainer = document.createElement('div');
      pinContainer.style.position = 'absolute';
      pinContainer.style.left = '-11px';
      pinContainer.style.bottom = '0px';
      pinContainer.style.width = '22px';
      pinContainer.style.display = 'flex';
      pinContainer.style.flexDirection = 'column';
      pinContainer.style.alignItems = 'center';
      pinContainer.style.filter = isSelected
        ? 'drop-shadow(0 3px 6px rgba(0,0,0,0.45))'
        : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
      pinContainer.style.transform = isSelected ? 'scale(1.15)' : 'scale(1)';
      pinContainer.style.transformOrigin = 'bottom center';
      pinContainer.style.transition = 'transform 0.15s ease-out';

      const pinCircle = document.createElement('div');
      pinCircle.style.backgroundColor = pinColor;
      pinCircle.style.width = '22px';
      pinCircle.style.height = '22px';
      pinCircle.style.borderRadius = '50%';
      pinCircle.style.display = 'flex';
      pinCircle.style.alignItems = 'center';
      pinCircle.style.justifyContent = 'center';
      pinCircle.style.border = '2px solid #FFFFFF';
      pinCircle.style.boxShadow = isSelected ? '0 0 0 2px #3B82F6' : 'none';
      pinCircle.style.color = '#FFFFFF';
      pinCircle.style.zIndex = '2';
      pinCircle.style.boxSizing = 'border-box';
      pinCircle.style.padding = '4.5px';
      pinCircle.innerHTML = `
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      `;

      const pinTip = document.createElement('div');
      pinTip.style.backgroundColor = pinColor;
      pinTip.style.width = '5.5px';
      pinTip.style.height = '5.5px';
      pinTip.style.transform = 'rotate(45deg)';
      pinTip.style.marginTop = '-3.5px';
      pinTip.style.borderRight = '2px solid #FFFFFF';
      pinTip.style.borderBottom = '2px solid #FFFFFF';
      pinTip.style.zIndex = '1';

      pinContainer.appendChild(pinCircle);
      pinContainer.appendChild(pinTip);
      wrapper.appendChild(pinContainer);

      if (layerSettings.showHouseLabels !== false) {
        const labelWrapper = document.createElement('div');
        labelWrapper.style.position = 'absolute';
        labelWrapper.style.left = '14px';
        labelWrapper.style.bottom = '8px';
        labelWrapper.style.whiteSpace = 'nowrap';
        labelWrapper.style.pointerEvents = 'none';

        const labelEl = document.createElement('span');
        labelEl.style.fontSize = '9.5px';
        labelEl.style.fontWeight = '700';
        labelEl.style.color = isSelected ? '#1D4ED8' : '#1E293B';
        labelEl.style.paintOrder = 'stroke fill';
        labelEl.style.webkitTextStroke = '1.75px #FFFFFF';
        labelEl.style.textShadow = '0 1px 2px rgba(0,0,0,0.2)';
        labelEl.textContent = getHouseholdMapLabel(h);

        labelWrapper.appendChild(labelEl);
        wrapper.appendChild(labelWrapper);
      }

      wrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        handleSelectHouseholdRef.current(h);
      });

      const marker = new AdvancedMarkerElement({
        map,
        position: { lat, lng },
        title: h.address,
        content: wrapper,
        zIndex: isSelected ? 60 : 35,
      });

      householdMarkersRef.current.push(marker);
    });
  }, [
    mapReady,
    filteredHouseholds,
    layerSettings.showHouses,
    layerSettings.showHouseLabels,
    selectedHouseholdId,
  ]);

  // 8. Render All Congregation Annotations (Landmarks, Roads, Start Meeting Flags)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || typeof google === 'undefined' || !google.maps.marker) return;

    landmarkMarkersRef.current.forEach((m) => {
      m.map = null;
    });
    landmarkMarkersRef.current = [];

    roadPolylinesRef.current.forEach((r) => {
      r.setMap(null);
    });
    roadPolylinesRef.current = [];

    roadLabelMarkersRef.current.forEach((m) => {
      m.map = null;
    });
    roadLabelMarkersRef.current = [];

    startFlagMarkersRef.current.forEach((m) => {
      m.map = null;
    });
    startFlagMarkersRef.current = [];

    const { AdvancedMarkerElement } = google.maps.marker;

    filteredTerritories.forEach((territory) => {
      const ann = territory.annotations;
      if (!ann) return;

      // 8a. Landmarks
      if (layerSettings.showLandmarks !== false && ann.landmarks) {
        ann.landmarks.forEach((landmark) => {
          if (typeof landmark.lat !== 'number' || typeof landmark.lng !== 'number') return;
          const isSelected = selectedLandmarkId === landmark.id;
          const { bg, svg } = getLandmarkIconConfig(landmark.type);

          const wrapper = document.createElement('div');
          wrapper.style.position = 'relative';
          wrapper.style.width = '0px';
          wrapper.style.height = '0px';
          wrapper.style.cursor = 'pointer';
          wrapper.title = `${landmark.label || 'Landmark'} • Territory #${territory.number}`;

          const pinContainer = document.createElement('div');
          pinContainer.style.position = 'absolute';
          pinContainer.style.left = '-11px';
          pinContainer.style.bottom = '0px';
          pinContainer.style.width = '22px';
          pinContainer.style.display = 'flex';
          pinContainer.style.flexDirection = 'column';
          pinContainer.style.alignItems = 'center';
          pinContainer.style.filter = isSelected
            ? 'drop-shadow(0 3px 6px rgba(0,0,0,0.45))'
            : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
          pinContainer.style.transform = isSelected ? 'scale(1.15)' : 'scale(1)';

          const pinCircle = document.createElement('div');
          pinCircle.style.backgroundColor = bg;
          pinCircle.style.width = '22px';
          pinCircle.style.height = '22px';
          pinCircle.style.borderRadius = '50%';
          pinCircle.style.display = 'flex';
          pinCircle.style.alignItems = 'center';
          pinCircle.style.justifyContent = 'center';
          pinCircle.style.border = '2px solid #FFFFFF';
          pinCircle.style.boxShadow = isSelected ? '0 0 0 2px #3B82F6' : 'none';
          pinCircle.style.color = '#FFFFFF';
          pinCircle.style.zIndex = '2';
          pinCircle.style.boxSizing = 'border-box';
          pinCircle.style.padding = '4.5px';
          pinCircle.innerHTML = svg;

          const pinTip = document.createElement('div');
          pinTip.style.backgroundColor = bg;
          pinTip.style.width = '5.5px';
          pinTip.style.height = '5.5px';
          pinTip.style.transform = 'rotate(45deg)';
          pinTip.style.marginTop = '-3.5px';
          pinTip.style.borderRight = '2px solid #FFFFFF';
          pinTip.style.borderBottom = '2px solid #FFFFFF';
          pinTip.style.zIndex = '1';

          pinContainer.appendChild(pinCircle);
          pinContainer.appendChild(pinTip);
          wrapper.appendChild(pinContainer);

          const labelWrapper = document.createElement('div');
          labelWrapper.style.position = 'absolute';
          labelWrapper.style.left = '14px';
          labelWrapper.style.bottom = '8px';
          labelWrapper.style.whiteSpace = 'nowrap';
          labelWrapper.style.pointerEvents = 'none';

          const labelEl = document.createElement('span');
          labelEl.style.fontSize = '9.5px';
          labelEl.style.fontWeight = '700';
          labelEl.style.color = isSelected ? '#1D4ED8' : '#334155';
          labelEl.style.paintOrder = 'stroke fill';
          labelEl.style.webkitTextStroke = '1.75px #FFFFFF';
          labelEl.style.textShadow = '0 1px 2px rgba(0,0,0,0.2)';
          labelEl.textContent = landmark.label || 'Landmark';

          labelWrapper.appendChild(labelEl);
          wrapper.appendChild(labelWrapper);

          wrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            handleSelectLandmarkRef.current(landmark, territory);
          });

          const marker = new AdvancedMarkerElement({
            map,
            position: { lat: landmark.lat, lng: landmark.lng },
            title: `${landmark.label || 'Landmark'} (${territory.number})`,
            content: wrapper,
            zIndex: isSelected ? 50 : 30,
          });

          landmarkMarkersRef.current.push(marker);
        });
      }

      // 8b. Roads / Corridors
      if (layerSettings.showRoads !== false && ann.roads) {
        ann.roads.forEach((road) => {
          if (!road.points || road.points.length < 2) return;
          const isSelected = selectedRoadId === road.id;
          let casingColor = '#334155';
          let surfaceColor = '#FFFFFF';
          let casingWeight = isSelected ? 9 : 8;
          let surfaceWeight = 5;

          if (road.color === 'avenue') {
            casingColor = '#B45309';
            surfaceColor = '#FEF08A';
            casingWeight = isSelected ? 10 : 9;
            surfaceWeight = 6;
          } else if (road.color === 'highway') {
            casingColor = '#1E40AF';
            surfaceColor = '#BFDBFE';
            casingWeight = isSelected ? 11 : 10;
            surfaceWeight = 7;
          } else if (road.color === 'dirt') {
            casingColor = '#78350F';
            surfaceColor = '#FDE68A';
            casingWeight = isSelected ? 8 : 7;
            surfaceWeight = 4.5;
          } else if (road.color === 'walkway') {
            casingColor = '#134E4A';
            surfaceColor = '#CCFBF1';
            casingWeight = isSelected ? 6 : 5;
            surfaceWeight = 3.5;
          } else if (road.color === 'alley') {
            casingColor = '#3F3F46';
            surfaceColor = '#E4E4E7';
            casingWeight = isSelected ? 7 : 6;
            surfaceWeight = 4;
          } else if (road.color === 'stairs') {
            casingColor = '#5B21B6';
            surfaceColor = '#EDE9FE';
            casingWeight = isSelected ? 6 : 5;
            surfaceWeight = 3.5;
          } else if (road.color === 'bridge') {
            casingColor = '#1E1B4B';
            surfaceColor = '#E0E7FF';
            casingWeight = isSelected ? 10 : 9;
            surfaceWeight = 6;
          } else if (road.color === 'trail') {
            casingColor = '#14532D';
            surfaceColor = '#DCFCE7';
            casingWeight = isSelected ? 6 : 5;
            surfaceWeight = 3.5;
          } else if (road.color === 'waterway') {
            casingColor = '#075985';
            surfaceColor = '#E0F2FE';
            casingWeight = isSelected ? 8 : 7;
            surfaceWeight = 4.5;
          }

          const casing = new google.maps.Polyline({
            path: road.points,
            strokeColor: isSelected ? '#1D4ED8' : casingColor,
            strokeWeight: isSelected ? casingWeight + 1 : casingWeight,
            strokeOpacity: 0.95,
            zIndex: isSelected ? 18 : 12,
            map,
          });

          const pavement = new google.maps.Polyline({
            path: road.points,
            strokeColor: surfaceColor,
            strokeWeight: surfaceWeight,
            strokeOpacity: 1.0,
            zIndex: isSelected ? 19 : 13,
            map,
          });

          casing.addListener('click', () => {
            handleSelectRoadRef.current(road, territory);
          });
          pavement.addListener('click', () => {
            handleSelectRoadRef.current(road, territory);
          });

          roadPolylinesRef.current.push(casing, pavement);

          if (road.name) {
            const midIdx = Math.floor(road.points.length / 2);
            const midPt = road.points[midIdx];

            const labelText = document.createElement('div');
            labelText.style.transform = 'translate(-50%, -50%)';
            labelText.style.fontSize = '11px';
            labelText.style.fontWeight = '800';
            labelText.style.color = isSelected ? '#1D4ED8' : '#334155';
            labelText.style.paintOrder = 'stroke fill';
            labelText.style.webkitTextStroke = isSelected ? '1.75px #DBEAFE' : '1.75px #FFFFFF';
            labelText.style.textShadow = isSelected
              ? '0 0 3px #93C5FD, 0 1px 2px rgba(0,0,0,0.25)'
              : '0 1px 2px rgba(0,0,0,0.25)';
            labelText.style.letterSpacing = '0.02em';
            labelText.style.whiteSpace = 'nowrap';
            labelText.style.cursor = 'pointer';
            labelText.style.userSelect = 'none';
            labelText.style.transition =
              'color 0.15s ease-out, text-shadow 0.15s ease-out, -webkit-text-stroke 0.15s ease-out';
            labelText.textContent = road.name;

            labelText.addEventListener('click', (e) => {
              e.stopPropagation();
              handleSelectRoadRef.current(road, territory);
            });

            const marker = new AdvancedMarkerElement({
              map,
              position: { lat: midPt.lat, lng: midPt.lng },
              content: labelText,
              zIndex: isSelected ? 25 : 15,
            });
            roadLabelMarkersRef.current.push(marker);
          }
        });
      }

      // 8c. Start Meeting Flags
      if (layerSettings.showStartFlag !== false && ann.startFlag) {
        const sf = ann.startFlag;
        if (typeof sf.lat === 'number' && typeof sf.lng === 'number') {
          const isSelected = selectedStartFlagTerritoryId === territory.id;

          const wrapper = document.createElement('div');
          wrapper.style.position = 'relative';
          wrapper.style.width = '0px';
          wrapper.style.height = '0px';
          wrapper.style.cursor = 'pointer';
          wrapper.title = `${sf.label || 'Start Meeting Point'} • #${territory.number}`;

          const pinContainer = document.createElement('div');
          pinContainer.style.position = 'absolute';
          pinContainer.style.left = '-12px';
          pinContainer.style.bottom = '0px';
          pinContainer.style.width = '24px';
          pinContainer.style.display = 'flex';
          pinContainer.style.flexDirection = 'column';
          pinContainer.style.alignItems = 'center';
          pinContainer.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))';

          pinContainer.innerHTML = `
            <div style="background-color: #059669; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #FFFFFF; color: #FFFFFF; z-index: 2; box-sizing: border-box; padding: 5px;">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                <line x1="4" x2="4" y1="22" y2="15"/>
              </svg>
            </div>
            <div style="background-color: #059669; width: 6px; height: 6px; transform: rotate(45deg); margin-top: -3.5px; border-right: 2px solid #FFFFFF; border-bottom: 2px solid #FFFFFF; z-index: 1;"></div>
          `;
          wrapper.appendChild(pinContainer);

          const labelWrapper = document.createElement('div');
          labelWrapper.style.position = 'absolute';
          labelWrapper.style.left = '15px';
          labelWrapper.style.bottom = '9px';
          labelWrapper.style.whiteSpace = 'nowrap';
          labelWrapper.style.pointerEvents = 'none';

          const labelEl = document.createElement('span');
          labelEl.style.fontSize = '10px';
          labelEl.style.fontWeight = '700';
          labelEl.style.color = '#065F46';
          labelEl.style.paintOrder = 'stroke fill';
          labelEl.style.webkitTextStroke = '1.75px #FFFFFF';
          labelEl.style.textShadow = '0 1px 2px rgba(0,0,0,0.2)';
          labelEl.textContent = sf.label
            ? `${sf.label} (#${territory.number})`
            : `Meeting Point #${territory.number}`;

          labelWrapper.appendChild(labelEl);
          wrapper.appendChild(labelWrapper);

          wrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            handleSelectStartFlagRef.current(territory);
          });

          const marker = new AdvancedMarkerElement({
            map,
            position: { lat: sf.lat, lng: sf.lng },
            title: `Meeting Point #${territory.number}`,
            content: wrapper,
            zIndex: isSelected ? 50 : 35,
          });

          startFlagMarkersRef.current.push(marker);
        }
      }
    });
  }, [
    mapReady,
    filteredTerritories,
    layerSettings.showLandmarks,
    layerSettings.showRoads,
    layerSettings.showStartFlag,
    selectedLandmarkId,
    selectedRoadId,
    selectedStartFlagTerritoryId,
  ]);

  // 9. Live GPS & Member Location Tracking
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || typeof google === 'undefined' || !google.maps.marker) return;

    if (!userLocation || layerSettings.showUserLocation === false) {
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.map = null;
        userLocationMarkerRef.current = null;
      }
      if (userLocationAccuracyCircleRef.current) {
        userLocationAccuracyCircleRef.current.setMap(null);
        userLocationAccuracyCircleRef.current = null;
      }
      userLocationBeamRef.current = null;
      lastLocationPosRef.current = null;
      return;
    }

    const { AdvancedMarkerElement } = google.maps.marker;
    const { lat, lng, accuracy } = userLocation;

    if (accuracy && accuracy > 5 && accuracy < 2000) {
      if (userLocationAccuracyCircleRef.current) {
        userLocationAccuracyCircleRef.current.setCenter({ lat, lng });
        userLocationAccuracyCircleRef.current.setRadius(accuracy);
        if (userLocationAccuracyCircleRef.current.getMap() !== map) {
          userLocationAccuracyCircleRef.current.setMap(map);
        }
      } else {
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
    } else if (userLocationAccuracyCircleRef.current) {
      userLocationAccuracyCircleRef.current.setMap(null);
      userLocationAccuracyCircleRef.current = null;
    }

    if (userLocationMarkerRef.current && userLocationBeamRef.current) {
      const prevPos = lastLocationPosRef.current;
      if (!prevPos || prevPos.lat !== lat || prevPos.lng !== lng) {
        lastLocationPosRef.current = { lat, lng };
        userLocationMarkerRef.current.position = { lat, lng };
      }
      if (userLocationMarkerRef.current.map !== map) {
        userLocationMarkerRef.current.map = map;
      }
    } else {
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.map = null;
        userLocationMarkerRef.current = null;
      }

      const container = document.createElement('div');
      container.style.position = 'relative';
      container.style.width = '0px';
      container.style.height = '0px';
      container.style.pointerEvents = 'none';

      const beamDiv = document.createElement('div');
      beamDiv.style.position = 'absolute';
      beamDiv.style.left = '-75px';
      beamDiv.style.top = '-75px';
      beamDiv.style.width = '150px';
      beamDiv.style.height = '150px';
      beamDiv.style.borderRadius = '50%';
      beamDiv.style.transformOrigin = '50% 50%';
      beamDiv.style.pointerEvents = 'none';
      beamDiv.style.zIndex = '1';
      beamDiv.style.background =
        'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.65) 0%, rgba(96, 165, 250, 0.25) 45%, rgba(191, 219, 254, 0) 70%)';
      beamDiv.style.clipPath = 'polygon(50% 50%, 20% 0%, 80% 0%)';
      beamDiv.style.display = userHeading != null ? 'block' : 'none';
      beamDiv.style.transform = `rotate(${(userHeading ?? 0).toFixed(2)}deg)`;

      const haloDiv = document.createElement('div');
      haloDiv.style.position = 'absolute';
      haloDiv.style.left = '-18px';
      haloDiv.style.top = '-18px';
      haloDiv.style.width = '36px';
      haloDiv.style.height = '36px';
      haloDiv.style.borderRadius = '50%';
      haloDiv.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
      haloDiv.style.border = '1.5px solid rgba(59, 130, 246, 0.5)';
      haloDiv.style.pointerEvents = 'none';
      haloDiv.style.zIndex = '2';

      const dotDiv = document.createElement('div');
      dotDiv.style.position = 'absolute';
      dotDiv.style.left = '-7px';
      dotDiv.style.top = '-7px';
      dotDiv.style.width = '14px';
      dotDiv.style.height = '14px';
      dotDiv.style.borderRadius = '50%';
      dotDiv.style.backgroundColor = '#2563EB';
      dotDiv.style.border = '2.5px solid #FFFFFF';
      dotDiv.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.4)';
      dotDiv.style.pointerEvents = 'none';
      dotDiv.style.zIndex = '3';

      container.appendChild(beamDiv);
      container.appendChild(haloDiv);
      container.appendChild(dotDiv);

      userLocationBeamRef.current = beamDiv;
      lastLocationPosRef.current = { lat, lng };

      const marker = new AdvancedMarkerElement({
        map,
        position: { lat, lng },
        content: container,
        zIndex: 100,
      });

      userLocationMarkerRef.current = marker;
    }
  }, [mapReady, userLocation, userHeading, layerSettings.showUserLocation]);

  // 10. Shared Member Locations
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || typeof google === 'undefined' || !google.maps.marker) return;

    const { AdvancedMarkerElement } = google.maps.marker;
    const currentMarkersMap = memberMarkersDataRef.current;

    if (layerSettings.showMemberLocations === false) {
      currentMarkersMap.forEach((entry) => {
        entry.marker.map = null;
        entry.accuracyCircle?.setMap(null);
      });
      currentMarkersMap.clear();
      return;
    }

    const nextIds = new Set<string>();

    for (const loc of memberLocations) {
      const locId = loc.id || `${loc.congregationId}_${loc.userId}`;
      nextIds.add(locId);

      const lat = Number(loc.latitude);
      const lng = Number(loc.longitude);
      if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

      const isLive = Boolean(loc.isSharing);
      const isSelected =
        selectedMemberLocationId === loc.id || selectedMemberLocationId === loc.userId;
      const accuracy = loc.accuracy ?? null;

      if (currentMarkersMap.has(locId)) {
        const entry = currentMarkersMap.get(locId)!;
        entry.marker.position = { lat, lng };
        if (entry.marker.map !== map) entry.marker.map = map;
        entry.marker.zIndex = isSelected ? 80 : isLive ? 60 : 35;

        if (entry.accuracyCircle) {
          if (isLive && accuracy && accuracy > 5 && accuracy < 1000) {
            entry.accuracyCircle.setCenter({ lat, lng });
            entry.accuracyCircle.setRadius(accuracy);
            if (entry.accuracyCircle.getMap() !== map) entry.accuracyCircle.setMap(map);
          } else {
            entry.accuracyCircle.setMap(null);
          }
        }
      } else {
        const container = document.createElement('div');
        container.style.position = 'relative';
        container.style.width = '36px';
        container.style.height = '36px';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.cursor = 'pointer';

        const haloDiv = document.createElement('div');
        haloDiv.style.position = 'absolute';
        haloDiv.style.width = '44px';
        haloDiv.style.height = '44px';
        haloDiv.style.borderRadius = '50%';
        haloDiv.style.backgroundColor = isLive ? 'rgba(16, 185, 129, 0.22)' : 'transparent';
        haloDiv.style.border = isLive ? '1.5px solid rgba(16, 185, 129, 0.55)' : 'none';
        haloDiv.style.pointerEvents = 'none';
        haloDiv.style.zIndex = '2';

        const pinContainer = document.createElement('div');
        pinContainer.style.position = 'relative';
        pinContainer.style.width = '32px';
        pinContainer.style.height = '32px';
        pinContainer.style.borderRadius = '50%';
        pinContainer.style.backgroundColor = isLive ? '#10B981' : '#64748B';
        pinContainer.style.border = isLive ? '2.5px solid #FFFFFF' : '2px solid #FFFFFF';
        pinContainer.style.display = 'flex';
        pinContainer.style.alignItems = 'center';
        pinContainer.style.justifyContent = 'center';
        pinContainer.style.overflow = 'hidden';
        pinContainer.style.flexShrink = '0';
        pinContainer.style.zIndex = '3';

        const initials = (loc.userName || 'P')
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        if (loc.avatarUrl) {
          pinContainer.innerHTML = `
            <img src="${loc.avatarUrl}" alt="${loc.userName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; pointer-events: none; display: block;" onerror="this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
            <span style="display: none; color: #FFFFFF; font-size: 11px; font-weight: 800; font-family: sans-serif; pointer-events: none; width: 100%; height: 100%; align-items: center; justify-content: center;">${initials}</span>
          `;
        } else {
          pinContainer.innerHTML = `<span style="color: #FFFFFF; font-size: 11px; font-weight: 800; font-family: sans-serif; pointer-events: none; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">${initials}</span>`;
        }

        if (isLive) {
          const liveBadge = document.createElement('div');
          liveBadge.style.position = 'absolute';
          liveBadge.style.top = '-2px';
          liveBadge.style.right = '-2px';
          liveBadge.style.width = '9px';
          liveBadge.style.height = '9px';
          liveBadge.style.borderRadius = '50%';
          liveBadge.style.backgroundColor = '#10B981';
          liveBadge.style.border = '1.5px solid #FFFFFF';
          pinContainer.appendChild(liveBadge);
        }

        container.appendChild(haloDiv);
        container.appendChild(pinContainer);

        container.addEventListener('click', (e) => {
          e.stopPropagation();
          handleSelectMemberLocationRef.current(loc);
        });

        let accuracyCircle: google.maps.Circle | null = null;
        if (isLive && accuracy && accuracy > 5 && accuracy < 1000) {
          accuracyCircle = new google.maps.Circle({
            center: { lat, lng },
            radius: accuracy,
            strokeColor: '#10B981',
            strokeOpacity: 0.3,
            strokeWeight: 1,
            fillColor: '#10B981',
            fillOpacity: 0.07,
            clickable: false,
            zIndex: 2,
            map,
          });
        }

        const marker = new AdvancedMarkerElement({
          map,
          position: { lat, lng },
          title: `${loc.userName} (${isLive ? 'Live' : 'Last seen'})`,
          content: container,
          zIndex: isSelected ? 80 : isLive ? 60 : 35,
        });

        currentMarkersMap.set(locId, {
          id: locId,
          marker,
          accuracyCircle,
          pinContainer,
        });
      }
    }

    currentMarkersMap.forEach((entry, id) => {
      if (!nextIds.has(id)) {
        entry.marker.map = null;
        entry.accuracyCircle?.setMap(null);
        currentMarkersMap.delete(id);
      }
    });
  }, [mapReady, memberLocations, layerSettings.showMemberLocations, selectedMemberLocationId]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {!mapReady && !loadError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-card border border-border shadow-lg">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-xs font-semibold text-foreground">Loading Congregation Base Map…</p>
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

      <div ref={mapContainerRef} id="congregation-google-map-element" className="w-full h-full" />
    </div>
  );
}
