'use client';

import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  computeDistanceMeters,
  findNearestRoadSnapPoint,
  type RoadSnapResult,
} from '@/lib/map-geometry';
import { getHouseholdMapLabel } from '@/lib/household-contacts';
import { canEditHousehold, canModifyMapAnnotation } from '@/lib/permissions';
import type {
  Congregation,
  Household,
  MapBoundaryPolygon,
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
import type { StudioTool } from './StudioTopBar';

interface StudioGoogleMapProps {
  territory: Territory | null;
  congregation?: Congregation | null;
  households: Household[];
  activeTool: StudioTool;
  drawnPoints: Array<{ lat: number; lng: number }>;
  onAddPoint: (point: { lat: number; lng: number }) => void;
  onDeleteDrawnPoint?: (index: number) => void;
  onCloseBoundary?: () => void;
  onRoadSnapJunction?: (junction: {
    roadId: string;
    segmentIndex: number;
    point: { lat: number; lng: number };
    isVertex?: boolean;
  }) => void;
  onSelectHousehold: (household: Household) => void;
  onMoveHousehold?: (id: string, lat: number, lng: number) => void;
  onSelectLandmark?: (landmark: MapLandmark) => void;
  onMoveLandmark?: (id: string, lat: number, lng: number) => void;
  onSelectRoad?: (road: MapRoad) => void;
  onUpdateRoadPoints?: (roadId: string, points: Array<{ lat: number; lng: number }>) => void;
  onSelectBoundary?: (boundary: MapBoundaryPolygon) => void;
  onUpdateBoundaryPolygon?: (
    boundaryId: string,
    points: Array<{ lat: number; lng: number }>
  ) => void;
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
  targetCamera?: { heading?: number; tilt?: number; immediate?: boolean; timestamp: number } | null;
  onCameraChange?: (camera: { heading: number; tilt: number }) => void;
  currentCamera?: { heading: number; tilt: number };
  selectedHouseholdId?: string | null;
  selectedBoundaryId?: string | null;
  selectedLandmarkId?: string | null;
  selectedRoadId?: string | null;
  userLocation?: { lat: number; lng: number; accuracy?: number } | null;
  userHeading?: number | null;
  memberLocations?: SharedMemberLocation[];
  selectedMemberLocationId?: string | null;
  onSelectMemberLocation?: (loc: SharedMemberLocation) => void;
  currentUserId?: string | null;
  fitPrintViewportPadding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
    timestamp: number;
  } | null;
  isPrintViewportActive?: boolean;
  isReadOnly?: boolean;
  currentUser?: { id?: string | null; role?: string | null } | null;
  groups?: Array<any>;
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
      polysMap.get(idx)?.push({ lat: Number(item.lat), lng: Number(item.lng) });
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

function computeCentroidFromPolygons(polygons: Array<Array<{ lat: number; lng: number }>>): {
  lat: number;
  lng: number;
} {
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
    case 'hospital':
      return {
        bg: '#F43F5E', // Rose
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M12 6v12M6 12h12"/>
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2z"/>
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
    case 'restaurant':
      return {
        bg: '#EA580C', // Orange
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/>
          <path d="M15 2v12"/>
          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
          <path d="M3 2v20"/>
        </svg>`,
      };
    case 'park':
      return {
        bg: '#059669', // Emerald Dark
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
          <path d="M2 12h20"/>
        </svg>`,
      };
    case 'government':
      return {
        bg: '#7C3AED', // Violet
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
          <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
          <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
          <path d="M10 6h4M10 10h4M10 14h4M10 18h4"/>
        </svg>`,
      };
    case 'water':
      return {
        bg: '#06B6D4', // Cyan
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
        </svg>`,
      };
    case 'bridge':
      return {
        bg: '#0284C7', // Sky
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14"/>
          <path d="M4 12h16"/>
          <path d="M12 12v7"/>
        </svg>`,
      };
    case 'gas_station':
      return {
        bg: '#D97706', // Amber Dark
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M3 22h12"/>
          <path d="M4 22V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v18"/>
          <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/>
          <path d="M8 6h2"/>
        </svg>`,
      };
    case 'transit':
      return {
        bg: '#0D9488', // Teal
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M8 6v6M16 6v6M4 18v3M20 18v3"/>
          <path d="M4 11V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7"/>
          <path d="M4 11h16a2 2 0 0 1 2 2v5H2v-5a2 2 0 0 1 2-2Z"/>
        </svg>`,
      };
    case 'building':
      return {
        bg: '#475569', // Slate
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
          <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>
        </svg>`,
      };
    case 'tower':
      return {
        bg: '#78716C', // Stone
        svg: `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="M4.93 4.93a10 10 0 0 1 14.14 0"/>
          <path d="M7.76 7.76a6 6 0 0 1 8.48 0"/>
          <circle cx="12" cy="12" r="2"/>
          <path d="M12 14v8"/>
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
        bg: '#EF4444', // Rose / Red
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

interface AttachLongPressDragOptions {
  wrapper: HTMLElement;
  pinContainer: HTMLElement;
  marker: google.maps.marker.AdvancedMarkerElement;
  mapInstanceRef: React.MutableRefObject<google.maps.Map | null>;
  mapContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  overlayRef: React.MutableRefObject<google.maps.OverlayView | null>;
  isReadOnlyRef: React.MutableRefObject<boolean>;
  isPrintViewportActiveRef: React.MutableRefObject<boolean>;
  activeToolRef: React.MutableRefObject<StudioTool>;
  onSelect: () => void;
  onMove?: (lat: number, lng: number) => void;
  getIsSelected?: () => boolean;
  canDrag?: () => boolean;
}

function attachLongPressDrag({
  wrapper,
  pinContainer,
  marker,
  mapInstanceRef,
  mapContainerRef,
  overlayRef,
  isReadOnlyRef,
  isPrintViewportActiveRef,
  activeToolRef,
  onSelect,
  onMove,
  getIsSelected,
  canDrag,
}: AttachLongPressDragOptions) {
  let pressTimer: NodeJS.Timeout | null = null;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let pointerMoved = false;
  let suppressClickUntil = 0;

  const cleanupListeners = () => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerCancel);
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    if (
      isReadOnlyRef.current ||
      isPrintViewportActiveRef.current ||
      activeToolRef.current !== 'pointer' ||
      (canDrag && !canDrag())
    ) {
      return;
    }

    startX = e.clientX;
    startY = e.clientY;
    pointerMoved = false;
    isDragging = false;

    if (pressTimer) {
      clearTimeout(pressTimer);
    }

    pressTimer = setTimeout(() => {
      pressTimer = null;
      if (
        isReadOnlyRef.current ||
        isPrintViewportActiveRef.current ||
        activeToolRef.current !== 'pointer' ||
        (canDrag && !canDrag())
      ) {
        return;
      }

      isDragging = true;
      suppressClickUntil = Date.now() + 600;

      // 1. Tactile haptic feedback
      try {
        if (
          typeof navigator !== 'undefined' &&
          'vibrate' in navigator &&
          typeof navigator.vibrate === 'function'
        ) {
          navigator.vibrate([45, 30, 45]);
        }
      } catch {
        // Haptic feedback not supported on this browser/environment
      }

      // 2. Visual feedback: lift marker up, intensify shadow, change cursor
      pinContainer.style.transition =
        'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.15s ease-out';
      pinContainer.style.transform = 'scale(1.28) translateY(-10px)';
      pinContainer.style.filter = 'drop-shadow(0 14px 20px rgba(0,0,0,0.45))';
      wrapper.style.cursor = 'grabbing';

      // 3. Temporarily disable map panning during marker drag
      mapInstanceRef.current?.setOptions({ gestureHandling: 'none' });
    }, 500);

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging) {
      // If pointer moved more than 7px before 500ms, cancel long-press timer (this is a pan gesture or quick click)
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (dist > 7) {
        pointerMoved = true;
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      }
      return;
    }

    // Is dragging!
    e.preventDefault();
    pointerMoved = true;

    const proj = overlayRef.current?.getProjection();
    const mapRect = mapContainerRef.current?.getBoundingClientRect();
    if (proj && mapRect) {
      const containerX = e.clientX - mapRect.left;
      const containerY = e.clientY - mapRect.top;
      const latLng = proj.fromContainerPixelToLatLng(new google.maps.Point(containerX, containerY));
      if (latLng) {
        marker.position = { lat: latLng.lat(), lng: latLng.lng() };
      }
    }
  };

  const handlePointerUp = (_e: PointerEvent) => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    cleanupListeners();

    if (isDragging) {
      isDragging = false;
      suppressClickUntil = Date.now() + 600;

      // Re-enable map gestures
      mapInstanceRef.current?.setOptions({ gestureHandling: 'greedy' });

      // Reset visual transform back to normal / selected state
      const isSelected = getIsSelected?.() ?? false;
      pinContainer.style.transition = 'transform 0.15s ease-out, filter 0.15s ease-out';
      pinContainer.style.transform = isSelected ? 'scale(1.08)' : 'scale(1)';
      pinContainer.style.filter = isSelected
        ? 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))'
        : 'drop-shadow(0 2px 4px rgba(0,0,0,0.32))';
      wrapper.style.cursor =
        !isReadOnlyRef.current && activeToolRef.current === 'pointer' ? 'grab' : 'pointer';

      if (pointerMoved) {
        const finalPos = marker.position;
        if (finalPos && onMove) {
          const finalLat =
            typeof finalPos.lat === 'function'
              ? (finalPos.lat as () => number)()
              : Number(finalPos.lat);
          const finalLng =
            typeof finalPos.lng === 'function'
              ? (finalPos.lng as () => number)()
              : Number(finalPos.lng);
          if (!Number.isNaN(finalLat) && !Number.isNaN(finalLng)) {
            onMove(finalLat, finalLng);
          }
        }
      }
    }
  };

  const handlePointerCancel = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    cleanupListeners();

    if (isDragging) {
      isDragging = false;
      mapInstanceRef.current?.setOptions({ gestureHandling: 'greedy' });
      const isSelected = getIsSelected?.() ?? false;
      pinContainer.style.transform = isSelected ? 'scale(1.08)' : 'scale(1)';
      pinContainer.style.filter = isSelected
        ? 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))'
        : 'drop-shadow(0 2px 4px rgba(0,0,0,0.32))';
    }
  };

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (Date.now() < suppressClickUntil) {
      return;
    }
    if (isPrintViewportActiveRef.current) return;
    if (activeToolRef.current === 'pointer') {
      onSelect();
    }
  };

  wrapper.addEventListener('pointerdown', handlePointerDown);
  wrapper.addEventListener('click', handleClick);
}

function attachVertexTouchDelete(
  el: HTMLElement,
  onDelete: () => void,
  onClick?: () => void
) {
  let timer: NodeJS.Timeout | null = null;
  let isLongPress = false;
  let startX = 0;
  let startY = 0;

  const handlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    startX = e.clientX;
    startY = e.clientY;
    isLongPress = false;

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      isLongPress = true;
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(50);
        }
      } catch {}
      onDelete();
    }, 450);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - startX, e.clientY - startY) > 8) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      if (!isLongPress) {
        if (onClick) {
          onClick();
        } else {
          try {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate(30);
            }
          } catch {}
          onDelete();
        }
      }
    }
  };

  const handlePointerCancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  el.addEventListener('pointerdown', handlePointerDown);
  el.addEventListener('pointermove', handlePointerMove);
  el.addEventListener('pointerup', handlePointerUp);
  el.addEventListener('pointercancel', handlePointerCancel);

  // Right-click for desktop mouse
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete();
  });
}

export function StudioGoogleMap({
  territory,
  congregation,
  households,
  activeTool,
  drawnPoints,
  onAddPoint,
  onDeleteDrawnPoint,
  onCloseBoundary,
  onRoadSnapJunction,
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
  selectedBoundaryId,
  selectedLandmarkId,
  selectedRoadId,
  userLocation,
  userHeading,
  memberLocations = [],
  selectedMemberLocationId,
  onSelectMemberLocation,
  currentUserId,
  fitPrintViewportPadding,
  isPrintViewportActive = false,
  isReadOnly = false,
  currentUser,
  groups = [],
}: StudioGoogleMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  const polygonsRef = useRef<google.maps.Polygon[]>([]);
  const polygonsDataRef = useRef<Array<{ id: string; polygon: google.maps.Polygon }>>([]);
  const maskPolygonRef = useRef<google.maps.Polygon | null>(null);
  const drawingPolysRef = useRef<(google.maps.Polyline | google.maps.Polygon)[]>([]);
  const drawingMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const householdMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  // Snapping & Drawing refs
  const activeRoadSnapRef = useRef<RoadSnapResult | null>(null);
  const isNearBoundaryStartRef = useRef<boolean>(false);
  const snapMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const snapMarkerLabelRef = useRef<HTMLDivElement | null>(null);
  const territoryRef = useRef(territory);
  territoryRef.current = territory;
  const drawnPointsRef = useRef(drawnPoints);
  drawnPointsRef.current = drawnPoints;

  // Annotations refs
  const roadPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const roadLabelMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const landmarkMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const startFlagMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const selectedVertexMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  // Member Shared Locations ref
  const memberMarkersDataRef = useRef<
    Map<
      string,
      {
        id: string;
        marker: google.maps.marker.AdvancedMarkerElement;
        accuracyCircle?: google.maps.Circle | null;
        pinContainer: HTMLDivElement;
        labelEl?: HTMLDivElement | null;
      }
    >
  >(new Map());

  const isPrintViewportActiveRef = useRef(isPrintViewportActive);
  isPrintViewportActiveRef.current = isPrintViewportActive;

  const isReadOnlyRef = useRef(isReadOnly);
  isReadOnlyRef.current = isReadOnly;

  // Stable Marker & Polyline element references for zero-flicker selection updates
  const householdMarkersDataRef = useRef<
    Array<{
      id: string;
      marker: google.maps.marker.AdvancedMarkerElement;
      pinContainer: HTMLDivElement;
      pinCircle: HTMLDivElement;
      labelEl?: HTMLSpanElement | null;
    }>
  >([]);

  const landmarkMarkersDataRef = useRef<
    Array<{
      id: string;
      marker: google.maps.marker.AdvancedMarkerElement;
      pinContainer: HTMLDivElement;
      pinCircle: HTMLDivElement;
      labelEl?: HTMLSpanElement | null;
    }>
  >([]);

  const roadPolylinesDataRef = useRef<
    Array<{
      id: string;
      casing: google.maps.Polyline;
      pavement: google.maps.Polyline;
      centerline: google.maps.Polyline;
      highlightAura?: google.maps.Polyline | null;
      labelMarker?: google.maps.marker.AdvancedMarkerElement | null;
      labelText?: HTMLDivElement | null;
      casingColor: string;
      surfaceColor: string;
      centerColor: string;
      casingWeight: number;
    }>
  >([]);

  // User Live Location & Heading Cone refs
  const userLocationMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const userLocationAccuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const userLocationBeamRef = useRef<HTMLDivElement | null>(null);
  const lastLocationPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const currentBeamAngleRef = useRef<number | null>(null);
  const targetBeamAngleRef = useRef<number | null>(null);
  const beamRafIdRef = useRef<number | null>(null);

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

  const handleDeleteDrawnPointRef = useRef(onDeleteDrawnPoint);
  handleDeleteDrawnPointRef.current = onDeleteDrawnPoint;

  const handleCloseBoundaryRef = useRef(onCloseBoundary);
  handleCloseBoundaryRef.current = onCloseBoundary;

  const handleRoadSnapJunctionRef = useRef(onRoadSnapJunction);
  handleRoadSnapJunctionRef.current = onRoadSnapJunction;

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

  const selectedHouseholdIdRef = useRef(selectedHouseholdId);
  selectedHouseholdIdRef.current = selectedHouseholdId;

  const selectedBoundaryIdRef = useRef(selectedBoundaryId);
  selectedBoundaryIdRef.current = selectedBoundaryId;

  const selectedLandmarkIdRef = useRef(selectedLandmarkId);
  selectedLandmarkIdRef.current = selectedLandmarkId;

  const selectedRoadIdRef = useRef(selectedRoadId);
  selectedRoadIdRef.current = selectedRoadId;

  const basemapModeRef = useRef(basemapMode);
  basemapModeRef.current = basemapMode;

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
        const { Map: GoogleMap, RenderingType } = (await importLibrary(
          'maps'
        )) as google.maps.MapsLibrary & {
          RenderingType?: { VECTOR: google.maps.RenderingType; RASTER: google.maps.RenderingType };
        };
        await importLibrary('geometry');
        const { AdvancedMarkerElement } = (await importLibrary(
          'marker'
        )) as google.maps.MarkerLibrary;

        if (!isMounted || !mapContainerRef.current) return;

        // If map is already created, do not re-create
        if (mapInstanceRef.current) return;

        const boundaries = getTerritoryBoundaries(territory);
        const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
        const map = new GoogleMap(mapContainerRef.current, {
          center: resolvedCenter,
          zoom: boundaries.length > 0 && boundaries[0].points.length >= 3 ? 17 : 16,
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

        // Initialize Snap Target Marker for road intersections (Y, T, X)
        const snapContainer = document.createElement('div');
        snapContainer.style.position = 'relative';
        snapContainer.style.width = '0px';
        snapContainer.style.height = '0px';
        snapContainer.style.pointerEvents = 'none';

        const snapRing = document.createElement('div');
        snapRing.style.position = 'absolute';
        snapRing.style.left = '-12px';
        snapRing.style.top = '-12px';
        snapRing.style.width = '24px';
        snapRing.style.height = '24px';
        snapRing.style.borderRadius = '50%';
        snapRing.style.border = '2.5px solid #2563EB';
        snapRing.style.backgroundColor = 'rgba(59, 130, 246, 0.25)';
        snapRing.style.boxShadow = '0 0 10px rgba(37, 99, 235, 0.7)';

        const snapDot = document.createElement('div');
        snapDot.style.position = 'absolute';
        snapDot.style.left = '-4px';
        snapDot.style.top = '-4px';
        snapDot.style.width = '8px';
        snapDot.style.height = '8px';
        snapDot.style.borderRadius = '50%';
        snapDot.style.backgroundColor = '#1D4ED8';
        snapDot.style.border = '1.5px solid #FFFFFF';
        snapDot.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';

        const snapBadge = document.createElement('div');
        snapBadge.style.position = 'absolute';
        snapBadge.style.left = '16px';
        snapBadge.style.top = '-10px';
        snapBadge.style.whiteSpace = 'nowrap';
        snapBadge.style.backgroundColor = 'rgba(15, 23, 42, 0.9)';
        snapBadge.style.color = '#FFFFFF';
        snapBadge.style.fontSize = '10px';
        snapBadge.style.fontWeight = '700';
        snapBadge.style.padding = '2px 7px';
        snapBadge.style.borderRadius = '6px';
        snapBadge.style.border = '1px solid rgba(255,255,255,0.2)';
        snapBadge.style.boxShadow = '0 2px 6px rgba(0,0,0,0.35)';
        snapBadge.style.pointerEvents = 'none';
        snapBadge.textContent = 'Connect Junction';

        snapContainer.appendChild(snapRing);
        snapContainer.appendChild(snapDot);
        snapContainer.appendChild(snapBadge);

        const snapMarker = new AdvancedMarkerElement({
          map: null,
          position: null,
          content: snapContainer,
          zIndex: 100,
        });
        snapMarkerRef.current = snapMarker;
        snapMarkerLabelRef.current = snapBadge;

        // Listen for mousemove for magnetic road snapping and boundary closing detection
        map.addListener('mousemove', (e: google.maps.MapMouseEvent) => {
          if (isPrintViewportActiveRef.current || isReadOnlyRef.current) return;
          const currentTool = activeToolRef.current;
          if (currentTool === 'road' && e.latLng) {
            const latLng = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            const projection = overlayRef.current?.getProjection();
            const latLngToPixel = (coord: { lat: number; lng: number }) => {
              if (!projection) return null;
              const p = projection.fromLatLngToContainerPixel(
                new google.maps.LatLng(coord.lat, coord.lng)
              );
              return p ? { x: p.x, y: p.y } : null;
            };
            const cursorPixel = latLngToPixel(latLng);
            const roads = territoryRef.current?.annotations?.roads || [];

            const snap = findNearestRoadSnapPoint({
              point: latLng,
              roads,
              pixelTolerance: 24,
              latLngToPixel,
              cursorPixel,
            });

            activeRoadSnapRef.current = snap;
            if (snap && snapMarkerRef.current) {
              snapMarkerRef.current.position = snap.snappedPoint;
              snapMarkerRef.current.map = map;
              if (snapMarkerLabelRef.current) {
                snapMarkerLabelRef.current.textContent = snap.isVertex
                  ? `Snap to ${snap.road.name || 'Road'} (Vertex)`
                  : `Connect to ${snap.road.name || 'Road'} (Junction)`;
              }
            } else if (snapMarkerRef.current) {
              snapMarkerRef.current.map = null;
            }
          } else if (currentTool === 'boundary' && e.latLng) {
            const pts = drawnPointsRef.current;
            if (pts.length >= 3) {
              const p0 = pts[0];
              const latLng = { lat: e.latLng.lat(), lng: e.latLng.lng() };
              const projection = overlayRef.current?.getProjection();
              let isNearP0 = false;
              if (projection) {
                const pCursor = projection.fromLatLngToContainerPixel(
                  new google.maps.LatLng(latLng.lat, latLng.lng)
                );
                const pStart = projection.fromLatLngToContainerPixel(
                  new google.maps.LatLng(p0.lat, p0.lng)
                );
                if (pCursor && pStart) {
                  const dist = Math.hypot(pCursor.x - pStart.x, pCursor.y - pStart.y);
                  isNearP0 = dist <= 24;
                }
              } else {
                isNearP0 = computeDistanceMeters(latLng, p0) <= 20;
              }
              isNearBoundaryStartRef.current = isNearP0;
            } else {
              isNearBoundaryStartRef.current = false;
            }
            if (snapMarkerRef.current) {
              snapMarkerRef.current.map = null;
            }
          } else {
            activeRoadSnapRef.current = null;
            isNearBoundaryStartRef.current = false;
            if (snapMarkerRef.current) {
              snapMarkerRef.current.map = null;
            }
          }
        });

        // Add single stable click listener for tool actions
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (isPrintViewportActiveRef.current) return;
          if (isReadOnlyRef.current) {
            handleDeselectAllRef.current?.();
            return;
          }
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
          } else if (currentTool === 'boundary') {
            if (drawnPointsRef.current.length >= 3 && isNearBoundaryStartRef.current) {
              handleCloseBoundaryRef.current?.();
            } else {
              handleAddPointRef.current?.({ lat, lng });
            }
          } else if (currentTool === 'road') {
            if (activeRoadSnapRef.current) {
              const snap = activeRoadSnapRef.current;
              handleRoadSnapJunctionRef.current?.({
                roadId: snap.road.id,
                segmentIndex: snap.segmentIndex,
                point: snap.snappedPoint,
                isVertex: snap.isVertex,
              });
              handleAddPointRef.current?.(snap.snappedPoint);
            } else {
              handleAddPointRef.current?.({ lat, lng });
            }
          } else if (currentTool === 'pointer') {
            handleDeselectAllRef.current?.();
          }
        });

        // Listen to camera heading & tilt changes (from native user mouse/touch gestures)
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

        // Attach OverlayView for accurate Container Pixel <-> LatLng coordinate projection calculations
        const overlay = new google.maps.OverlayView();
        overlay.draw = () => {};
        overlay.setMap(map);
        overlayRef.current = overlay;

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
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.map = null;
        userLocationMarkerRef.current = null;
      }
      if (userLocationAccuracyCircleRef.current) {
        userLocationAccuracyCircleRef.current.setMap(null);
        userLocationAccuracyCircleRef.current = null;
      }
      userLocationBeamRef.current = null;
      memberMarkersDataRef.current.forEach((entry) => {
        entry.marker.map = null;
        entry.accuracyCircle?.setMap(null);
      });
      memberMarkersDataRef.current.clear();
      selectedVertexMarkersRef.current.forEach((m) => {
        m.map = null;
      });
      selectedVertexMarkersRef.current = [];
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

  // Fit territory or households inside print viewport framing with exact custom padding
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !fitPrintViewportPadding || typeof google === 'undefined') return;

    const boundaries = getTerritoryBoundaries(territory);
    let hasValidPoints = false;
    const bounds = new google.maps.LatLngBounds();

    boundaries.forEach((b) => {
      b.points.forEach((pt) => {
        bounds.extend(pt);
        hasValidPoints = true;
      });
    });

    if (!hasValidPoints && households.length > 0) {
      households.forEach((h) => {
        const lat =
          typeof h.latitude === 'number' ? h.latitude : parseFloat(String(h.latitude || ''));
        const lng =
          typeof h.longitude === 'number' ? h.longitude : parseFloat(String(h.longitude || ''));
        if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0 && lng !== 0) {
          bounds.extend({ lat, lng });
          hasValidPoints = true;
        }
      });
    }

    if (hasValidPoints) {
      map.fitBounds(bounds, {
        top: fitPrintViewportPadding.top,
        right: fitPrintViewportPadding.right,
        bottom: fitPrintViewportPadding.bottom,
        left: fitPrintViewportPadding.left,
      });
    }
  }, [mapReady, fitPrintViewportPadding, territory, households]);

  // Smooth cinematic distance-adaptive parabolic fly-in animation (user GPS or search)
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
    const startZoom = map.getZoom() || 16;
    const targetZoom = searchedLocation.zoom || 18;
    const currentHeading = map.getHeading() || 0;
    const currentTilt = map.getTilt() || 0;

    const deltaLat = targetLat - startLat;
    const deltaLng = targetLng - startLng;
    const deltaZoom = targetZoom - startZoom;

    // If virtually at target, no animation needed
    if (Math.abs(deltaLat) < 0.00001 && Math.abs(deltaLng) < 0.00001 && Math.abs(deltaZoom) < 0.1) {
      return;
    }

    // Calculate real geographic distance using Haversine formula (in km)
    const R = 6371; // Earth radius in km
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

    // 1. Adaptive flight duration: scales naturally with distance for a majestic, smooth glide
    let duration = 800; // ms for local small adjustments (< 200m)
    if (distanceKm > 0.2 && distanceKm <= 1.5) {
      duration = 1000 + (distanceKm - 0.2) * 250;
    } else if (distanceKm > 1.5 && distanceKm <= 10) {
      duration = 1350 + (distanceKm - 1.5) * 60;
    } else if (distanceKm > 10) {
      duration = Math.min(2200, 1850 + (distanceKm - 10) * 15);
    }

    // 2. Parabolic zoom flight arc:
    // When flying from far away, camera pulls back slightly at midpoint to provide
    // spatial overview, then swoops gracefully down into the street-level view.
    let maxZoomDip = 0;
    if (distanceKm > 0.3 && distanceKm <= 2) {
      maxZoomDip = 0.8;
    } else if (distanceKm > 2 && distanceKm <= 8) {
      maxZoomDip = 1.6;
    } else if (distanceKm > 8) {
      maxZoomDip = 2.5;
    }

    isProgrammaticCameraUpdateRef.current = true;
    let animationFrameId: number;
    const startTime = performance.now();

    // Smooth Quintic Ease-In-Out for natural acceleration & cushioned deceleration
    const easeInOutQuint = (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2);

    // Cubic Ease-Out for shorter local flights
    const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Use gentle easeInOut for far flights, easeOut for near hops
      const eased = distanceKm > 0.3 ? easeInOutQuint(progress) : easeOutCubic(progress);

      const lat = startLat + deltaLat * eased;
      const lng = startLng + deltaLng * eased;

      // Parabolic zoom calculation: baseline interpolated zoom minus symmetric flight arc dip
      const baseZoom = startZoom + deltaZoom * eased;
      const arcDip = 4 * maxZoomDip * progress * (1 - progress);
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

    // If immediate mode (e.g. continuous slider dragging) or tiny delta, apply instantly
    if (targetCamera.immediate || (Math.abs(headingDiff) <= 1 && Math.abs(tiltDiff) <= 1)) {
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
      return;
    }

    // For larger discrete jumps (preset buttons, 3D toggle, compass reset), animate briskly
    let animationFrameId: number;
    const startTime = performance.now();
    const duration = 120; // ms

    const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      const currentTilt = startTilt + tiltDiff * eased;
      const currentHeading = (((startHeading + headingDiff * eased) % 360) + 360) % 360;
      const targetTiltClamped = Math.max(0, Math.min(67.5, currentTilt));

      isProgrammaticCameraUpdateRef.current = true;
      try {
        if (typeof map.moveCamera === 'function') {
          map.moveCamera({
            tilt: targetTiltClamped,
            heading: currentHeading,
          });
        }
        if (typeof map.setTilt === 'function') {
          map.setTilt(targetTiltClamped);
        }
        if (typeof map.setHeading === 'function') {
          map.setHeading(currentHeading);
        }
      } catch {
        // fallback
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          isProgrammaticCameraUpdateRef.current = false;
        }, 16);
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
      !isReadOnly &&
      (activeTool === 'pin' ||
        activeTool === 'boundary' ||
        activeTool === 'road' ||
        activeTool === 'landmark' ||
        activeTool === 'start')
    ) {
      map.setOptions({ draggableCursor: 'crosshair' });
    } else {
      map.setOptions({ draggableCursor: 'grab' });
    }
  }, [mapReady, activeTool, isReadOnly]);

  // 5. Render Saved Territory Independent Boundary Polygons & Outside Mask Overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || typeof google === 'undefined') return;

    polygonsRef.current.forEach((p) => {
      p.setMap(null);
    });
    polygonsRef.current = [];
    polygonsDataRef.current = [];

    if (maskPolygonRef.current) {
      maskPolygonRef.current.setMap(null);
      maskPolygonRef.current = null;
    }

    const boundaries = getTerritoryBoundaries(territory);
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

        const isSelected = selectedBoundaryId === boundary.id;
        const isEditable =
          !isReadOnly && !isPrintViewportActive && isSelected && activeTool === 'pointer';

        const polygon = new google.maps.Polygon({
          paths: boundary.points,
          strokeColor: boundary.color || effectiveDisplay.strokeColor || effectiveDisplay.fillColor,
          strokeOpacity: 0.9,
          strokeWeight: isSelected ? 4 : 3,
          fillColor: boundary.color || effectiveDisplay.fillColor,
          fillOpacity: effectiveDisplay.fillOpacity,
          editable: isEditable,
          draggable: false,
          map,
          clickable: !isPrintViewportActive,
          zIndex: isSelected ? 5 : 2,
        });

        // Handle right-click to delete vertex
        polygon.addListener('rightclick', (e: google.maps.PolyMouseEvent) => {
          if (isPrintViewportActiveRef.current || isReadOnlyRef.current) return;
          if (e.vertex != null) {
            const path = polygon.getPath();
            if (path.getLength() > 3) {
              path.removeAt(e.vertex);
            }
          }
        });

        // Click to select boundary in pointer mode, OR pass click to map active tool
        polygon.addListener('click', (e: google.maps.PolyMouseEvent) => {
          if (isPrintViewportActiveRef.current) return;
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
            } else if (currentTool === 'boundary') {
              if (drawnPointsRef.current.length >= 3 && isNearBoundaryStartRef.current) {
                handleCloseBoundaryRef.current?.();
              } else {
                handleAddPointRef.current?.({ lat, lng });
              }
            } else if (currentTool === 'road') {
              if (activeRoadSnapRef.current) {
                const snap = activeRoadSnapRef.current;
                handleRoadSnapJunctionRef.current?.({
                  roadId: snap.road.id,
                  segmentIndex: snap.segmentIndex,
                  point: snap.snappedPoint,
                  isVertex: snap.isVertex,
                });
                handleAddPointRef.current?.(snap.snappedPoint);
              } else {
                handleAddPointRef.current?.({ lat, lng });
              }
            }
          }
        });

        // Handle vertex edits / insertions / deletions for this specific boundary
        const path = polygon.getPath();
        const handleBoundaryPathChange = () => {
          if (isPrintViewportActiveRef.current) return;
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
        polygonsDataRef.current.push({ id: boundary.id, polygon });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, boundariesKey, activeTool, layerSettings.showBoundaries, isPrintViewportActive]);

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

  // 5c. Zero-Flicker Boundary Selection Synchronizer (In-place editable toggling with 0 polygon rebuilds)
  useEffect(() => {
    const isPointerMode = !isPrintViewportActive && activeTool === 'pointer';
    const boundaries = getTerritoryBoundaries(territory);
    polygonsDataRef.current.forEach(({ id, polygon }) => {
      const isSelected = selectedBoundaryId === id;
      const targetBoundary = boundaries.find((b) => b.id === id);
      const canModify = canModifyMapAnnotation(currentUser, targetBoundary, groups);
      polygon.setEditable(isSelected && canModify && !isReadOnly && isPointerMode);
      polygon.setOptions({
        strokeWeight: isSelected ? 4 : 3,
        zIndex: isSelected ? 5 : 2,
      });
    });
  }, [
    selectedBoundaryId,
    activeTool,
    isReadOnly,
    isPrintViewportActive,
    currentUser,
    groups,
    territory,
  ]);

  // 6. Render Household Markers with Teardrop Pin Shape & Anchor Point at Tip
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || typeof google === 'undefined' || !google.maps.marker) return;

    householdMarkersRef.current.forEach((m) => {
      m.map = null;
    });
    householdMarkersRef.current = [];
    householdMarkersDataRef.current = [];

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
        case 'busy':
          return '#F97316'; // Orange
        case 'return_visit':
          return '#2563EB'; // Vibrant Blue
        case 'foreign_language':
          return '#06B6D4'; // Cyan
        case 'inaccessible':
          return '#78716C'; // Stone
        case 'vacant':
          return '#64748B'; // Slate
        case 'do_not_visit':
          return '#DC2626'; // Crimson Red
        case 'moved':
        case 'inactive':
          return '#9CA3AF'; // Muted Gray
        default:
          return '#64748B'; // Cool Slate / Steel
      }
    };

    const isPointerMode = !isPrintViewportActive && activeTool === 'pointer';

    const filteredHouseholds = households.filter((h) => {
      if (!layerSettings.householdFilter || layerSettings.householdFilter === 'all') return true;
      return h.status === layerSettings.householdFilter;
    });

    filteredHouseholds.forEach((h) => {
      const lat =
        typeof h.latitude === 'number' ? h.latitude : parseFloat(String(h.latitude || ''));
      const lng =
        typeof h.longitude === 'number' ? h.longitude : parseFloat(String(h.longitude || ''));
      if (Number.isNaN(lat) || Number.isNaN(lng) || lat === 0 || lng === 0) return;

      const pinColor = getStatusColor(h.status);

      const isSelected = selectedHouseholdId === h.id;
      const canMoveHousehold = canEditHousehold(currentUser, h, groups);

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
      pinContainer.style.transition = 'transform 0.15s ease-out, filter 0.15s ease-out';

      // Zero-width/height container: guarantees (0,0) is anchored directly at the {lat, lng} coordinate
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.width = '0px';
      wrapper.style.height = '0px';
      wrapper.style.cursor =
        canMoveHousehold && !isReadOnly && isPointerMode
          ? 'grab'
          : isPrintViewportActive
            ? 'default'
            : 'pointer';
      wrapper.style.pointerEvents = isPrintViewportActive ? 'none' : 'auto';
      wrapper.title = `${h.address} (${h.status.replace(/_/g, ' ')})`;

      const pinCircle = document.createElement('div');
      pinCircle.style.backgroundColor = pinColor;
      pinCircle.style.width = '24px';
      pinCircle.style.height = '24px';
      pinCircle.style.borderRadius = '50%';
      pinCircle.style.display = 'flex';
      pinCircle.style.alignItems = 'center';
      pinCircle.style.justifyContent = 'center';
      pinCircle.style.border = '2px solid #FFFFFF';
      pinCircle.style.boxShadow = isSelected
        ? '0 0 0 2px #3B82F6, 0 1px 3px rgba(0,0,0,0.2)'
        : 'none';
      pinCircle.style.color = '#FFFFFF';
      pinCircle.style.zIndex = '2';
      pinCircle.style.boxSizing = 'border-box';
      pinCircle.style.padding = '5.5px';
      pinCircle.style.transition = 'box-shadow 0.15s ease-out';
      pinCircle.innerHTML = `
        <svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      `;

      const pinTip = document.createElement('div');
      pinTip.style.backgroundColor = pinColor;
      pinTip.style.width = '6.5px';
      pinTip.style.height = '6.5px';
      pinTip.style.transform = 'rotate(45deg)';
      pinTip.style.marginTop = '-4px';
      pinTip.style.borderRight = '2px solid #FFFFFF';
      pinTip.style.borderBottom = '2px solid #FFFFFF';
      pinTip.style.zIndex = '1';

      pinContainer.appendChild(pinCircle);
      pinContainer.appendChild(pinTip);
      wrapper.appendChild(pinContainer);

      // Label beside pin: pure text with white stroke / halo
      let labelEl: HTMLSpanElement | null = null;
      if (layerSettings.showHouseLabels !== false) {
        const labelWrapper = document.createElement('div');
        labelWrapper.style.position = 'absolute';
        labelWrapper.style.left = '15px';
        labelWrapper.style.bottom = '10px';
        labelWrapper.style.whiteSpace = 'nowrap';
        labelWrapper.style.pointerEvents = 'none';

        labelEl = document.createElement('span');
        labelEl.style.fontSize = '10px';
        labelEl.style.fontWeight = '700';
        labelEl.style.color = isSelected ? '#1D4ED8' : '#1E293B';
        labelEl.style.paintOrder = 'stroke fill';
        labelEl.style.webkitTextStroke = '1.75px #FFFFFF';
        labelEl.style.textShadow = '0 1px 2px rgba(0,0,0,0.2)';
        labelEl.style.lineHeight = '1.15';
        labelEl.style.letterSpacing = '-0.01em';
        labelEl.style.transition = 'color 0.15s ease-out';
        labelEl.textContent = getHouseholdMapLabel(h);

        labelWrapper.appendChild(labelEl);
        wrapper.appendChild(labelWrapper);
      }

      const marker = new AdvancedMarkerElement({
        map,
        position: { lat, lng },
        title: h.address,
        content: wrapper,
        gmpDraggable: false,
        zIndex: isSelected ? 50 : 35,
      });

      attachLongPressDrag({
        wrapper,
        pinContainer,
        marker,
        mapInstanceRef,
        mapContainerRef,
        overlayRef,
        isReadOnlyRef,
        isPrintViewportActiveRef,
        activeToolRef,
        onSelect: () => handleSelectHouseholdRef.current(h),
        onMove: (newLat, newLng) => handleMoveHouseholdRef.current?.(h.id, newLat, newLng),
        getIsSelected: () => selectedHouseholdIdRef.current === h.id,
        canDrag: () => canMoveHousehold && !isReadOnlyRef.current,
      });

      householdMarkersRef.current.push(marker);
      householdMarkersDataRef.current.push({
        id: h.id,
        marker,
        pinContainer,
        pinCircle,
        labelEl,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mapReady,
    householdsKey,
    layerSettings.showHouses,
    layerSettings.showHouseLabels,
    layerSettings.householdFilter,
    activeTool,
    isPrintViewportActive,
  ]);

  // 6b. Zero-Flicker Household Selection Synchronizer (In-place styling with 0 marker rebuilds)
  useEffect(() => {
    householdMarkersDataRef.current.forEach(({ id, marker, pinContainer, pinCircle, labelEl }) => {
      const isSelected = selectedHouseholdId === id;
      marker.zIndex = isSelected ? 50 : 35;
      pinContainer.style.filter = isSelected
        ? 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))'
        : 'drop-shadow(0 2px 4px rgba(0,0,0,0.32))';
      pinContainer.style.transform = isSelected ? 'scale(1.08)' : 'scale(1)';
      pinCircle.style.boxShadow = isSelected
        ? '0 0 0 2px #3B82F6, 0 1px 3px rgba(0,0,0,0.2)'
        : 'none';
      if (labelEl) {
        labelEl.style.color = isSelected ? '#1E293B' : '#334155';
      }
    });
  }, [selectedHouseholdId]);

  // 7. Render Active Drawing Preview (Road corridor / polygon)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || typeof google === 'undefined' || !google.maps.marker) return;

    drawingPolysRef.current.forEach((p) => {
      p.setMap(null);
    });
    drawingPolysRef.current = [];

    drawingMarkersRef.current.forEach((m) => {
      m.map = null;
    });
    drawingMarkersRef.current = [];

    const { AdvancedMarkerElement } = google.maps.marker;

    if (drawnPoints.length > 0) {
      if (activeTool === 'boundary') {
        // While drawing, boundary is rendered as an unfilled open polyline
        const poly = new google.maps.Polyline({
          path: drawnPoints,
          strokeColor: '#F59E0B',
          strokeOpacity: 0.95,
          strokeWeight: 3,
          zIndex: 20,
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
        const dotWrapper = document.createElement('div');
        dotWrapper.style.position = 'relative';
        dotWrapper.style.cursor = 'pointer';

        const dot = document.createElement('div');
        dot.style.width = '16px';
        dot.style.height = '16px';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = idx === 0 ? '#10B981' : '#F59E0B';
        dot.style.border = '2.5px solid #FFFFFF';
        dot.style.boxShadow =
          activeTool === 'boundary' && idx === 0 && drawnPoints.length >= 3
            ? '0 0 0 3px #10B981, 0 2px 6px rgba(0,0,0,0.35)'
            : '0 2px 6px rgba(0,0,0,0.35)';
        dot.style.transition = 'transform 0.15s ease-out';

        dotWrapper.addEventListener('mouseenter', () => {
          dot.style.transform = 'scale(1.25)';
        });
        dotWrapper.addEventListener('mouseleave', () => {
          dot.style.transform = 'scale(1.0)';
        });

        if (activeTool === 'boundary' && idx === 0 && drawnPoints.length >= 3) {
          dotWrapper.title = 'Tap to close boundary • Long-press or right-click to delete';
          attachVertexTouchDelete(
            dotWrapper,
            () => handleDeleteDrawnPointRef.current?.(idx),
            () => handleCloseBoundaryRef.current?.()
          );
        } else {
          dotWrapper.title = 'Tap or right-click to delete vertex';
          attachVertexTouchDelete(
            dotWrapper,
            () => handleDeleteDrawnPointRef.current?.(idx)
          );
        }

        dotWrapper.appendChild(dot);

        const marker = new AdvancedMarkerElement({
          map,
          position: pt,
          content: dotWrapper,
          zIndex: 30 + idx,
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

    roadPolylinesRef.current.forEach((r) => {
      r.setMap(null);
    });
    roadPolylinesRef.current = [];
    roadPolylinesDataRef.current = [];

    roadLabelMarkersRef.current.forEach((m) => {
      m.map = null;
    });
    roadLabelMarkersRef.current = [];

    landmarkMarkersRef.current.forEach((lm) => {
      lm.map = null;
    });
    landmarkMarkersRef.current = [];
    landmarkMarkersDataRef.current = [];

    if (startFlagMarkerRef.current) {
      startFlagMarkerRef.current.map = null;
      startFlagMarkerRef.current = null;
    }

    const annotations = territory?.annotations;
    if (!annotations) return;

    const { AdvancedMarkerElement } = google.maps.marker;
    const isPointerMode = !isPrintViewportActive && activeTool === 'pointer';

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
          casingWeight = 11;
          surfaceWeight = 7.5;
        } else if (road.color === 'highway' || road.color === '#2563EB') {
          casingColor = '#1E40AF';
          surfaceColor = '#BFDBFE';
          centerColor = '#3B82F6';
          casingWeight = 12;
          surfaceWeight = 8;
        } else if (road.color === 'dirt' || road.color === '#78350F') {
          casingColor = '#78350F';
          surfaceColor = '#FDE68A';
          centerColor = '#92400E';
          casingWeight = 9;
          surfaceWeight = 5.5;
        } else if (road.color === 'walkway' || road.color === '#0D9488') {
          casingColor = '#134E4A';
          surfaceColor = '#CCFBF1';
          centerColor = '#0F766E';
          casingWeight = 6.5;
          surfaceWeight = 4;
        } else if (road.color === 'alley' || road.color === '#52525B') {
          casingColor = '#3F3F46';
          surfaceColor = '#E4E4E7';
          centerColor = '#71717A';
          casingWeight = 7.5;
          surfaceWeight = 4.5;
        } else if (road.color === 'stairs' || road.color === '#7C3AED') {
          casingColor = '#5B21B6';
          surfaceColor = '#EDE9FE';
          centerColor = '#7C3AED';
          casingWeight = 6.5;
          surfaceWeight = 4;
        } else if (road.color === 'bridge' || road.color === '#4F46E5') {
          casingColor = '#1E1B4B';
          surfaceColor = '#E0E7FF';
          centerColor = '#4338CA';
          casingWeight = 11.5;
          surfaceWeight = 7.5;
        } else if (road.color === 'trail' || road.color === '#15803D') {
          casingColor = '#14532D';
          surfaceColor = '#DCFCE7';
          centerColor = '#16A34A';
          casingWeight = 6.5;
          surfaceWeight = 4;
        } else if (road.color === 'waterway' || road.color === '#0284C7') {
          casingColor = '#075985';
          surfaceColor = '#E0F2FE';
          centerColor = '#0284C7';
          casingWeight = 8.5;
          surfaceWeight = 5.5;
        }

        const isSelected = selectedRoadId === road.id;

        // Highlight aura underlay (visible only when selected)
        const highlightAura = new google.maps.Polyline({
          path: road.points,
          strokeColor: '#3B82F6',
          strokeWeight: casingWeight + 6,
          strokeOpacity: 0.4,
          zIndex: 9,
          clickable: false,
          visible: isSelected,
          map,
        });
        roadPolylinesRef.current.push(highlightAura);

        // Outer dark casing (road curb / asphalt border)
        const casing = new google.maps.Polyline({
          path: road.points,
          strokeColor: isSelected ? '#1D4ED8' : casingColor,
          strokeWeight: isSelected ? casingWeight + 1 : casingWeight,
          strokeOpacity: 0.95,
          zIndex: isSelected ? 14 : 10,
          clickable: !isPrintViewportActive,
          map,
        });

        // Inner clean road surface (pavement) - editable ONLY when selected in pointer mode!
        const isEditable = !isReadOnly && !isPrintViewportActive && isSelected && isPointerMode;
        const pavement = new google.maps.Polyline({
          path: road.points,
          strokeColor: surfaceColor,
          strokeWeight: surfaceWeight,
          strokeOpacity: 1.0,
          zIndex: isSelected ? 15 : 11,
          editable: isEditable,
          clickable: !isPrintViewportActive,
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
        const handleRoadRightClick = (e: google.maps.PolyMouseEvent) => {
          if (isPrintViewportActiveRef.current || isReadOnlyRef.current) return;
          if (e.vertex != null) {
            const path = pavement.getPath();
            if (path.getLength() > 2) {
              path.removeAt(e.vertex);
            }
          }
        };
        pavement.addListener('rightclick', handleRoadRightClick);
        casing.addListener('rightclick', handleRoadRightClick);

        // Sync vertex modifications across all 3 layers and propagate to database
        const roadPath = pavement.getPath();
        const handleRoadPathChange = () => {
          if (isPrintViewportActiveRef.current || isReadOnlyRef.current) return;
          casing.setPath(roadPath);
          centerline.setPath(roadPath);
          highlightAura.setPath(roadPath);

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

        // Click listeners on road polylines for selection & tool forwarding
        const handleRoadClick = (e: google.maps.PolyMouseEvent) => {
          if (isPrintViewportActiveRef.current) return;
          if (activeToolRef.current === 'pointer') {
            handleSelectRoadRef.current?.(road);
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
            } else if (currentTool === 'boundary') {
              handleAddPointRef.current?.({ lat, lng });
            } else if (currentTool === 'road') {
              if (activeRoadSnapRef.current) {
                const snap = activeRoadSnapRef.current;
                handleRoadSnapJunctionRef.current?.({
                  roadId: snap.road.id,
                  segmentIndex: snap.segmentIndex,
                  point: snap.snappedPoint,
                  isVertex: snap.isVertex,
                });
                handleAddPointRef.current?.(snap.snappedPoint);
              } else {
                const snap = findNearestRoadSnapPoint({
                  point: { lat, lng },
                  roads: [road],
                  meterTolerance: 25,
                });
                if (snap) {
                  handleRoadSnapJunctionRef.current?.({
                    roadId: road.id,
                    segmentIndex: snap.segmentIndex,
                    point: snap.snappedPoint,
                    isVertex: snap.isVertex,
                  });
                  handleAddPointRef.current?.(snap.snappedPoint);
                } else {
                  handleAddPointRef.current?.({ lat, lng });
                }
              }
            }
          }
        };

        casing.addListener('click', handleRoadClick);
        pavement.addListener('click', handleRoadClick);

        roadPolylinesRef.current.push(casing, pavement, centerline);

        let labelMarker: google.maps.marker.AdvancedMarkerElement | null = null;
        let labelText: HTMLDivElement | null = null;

        // Place clean text-with-stroke road label (no chip box, no stem/pointer)
        if (road.name) {
          const midIdx = Math.floor(road.points.length / 2);
          const midPt = road.points[midIdx];

          labelText = document.createElement('div');
          labelText.style.transform = 'translate(-50%, -50%)';
          labelText.style.whiteSpace = 'nowrap';
          labelText.style.fontSize = '11px';
          labelText.style.fontWeight = '800';
          labelText.style.color = isSelected ? '#1D4ED8' : '#334155';
          labelText.style.paintOrder = 'stroke fill';
          labelText.style.webkitTextStroke = isSelected ? '1.75px #DBEAFE' : '1.75px #FFFFFF';
          labelText.style.textShadow = isSelected
            ? '0 0 3px #93C5FD, 0 1px 2px rgba(0,0,0,0.25)'
            : '0 1px 2px rgba(0,0,0,0.25)';
          labelText.style.letterSpacing = '0.02em';
          labelText.style.cursor = isPointerMode ? 'pointer' : 'default';
          labelText.style.pointerEvents = isPrintViewportActive ? 'none' : 'auto';
          labelText.style.userSelect = 'none';
          labelText.style.transition =
            'color 0.15s ease-out, text-shadow 0.15s ease-out, -webkit-text-stroke 0.15s ease-out';
          labelText.textContent = road.name;

          labelText.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isPrintViewportActiveRef.current) return;
            if (activeToolRef.current === 'pointer') {
              handleSelectRoadRef.current?.(road);
            }
          });

          labelMarker = new AdvancedMarkerElement({
            map,
            position: { lat: midPt.lat, lng: midPt.lng },
            title: road.name,
            content: labelText,
            zIndex: isSelected ? 30 : 18,
          });
          roadLabelMarkersRef.current.push(labelMarker);
        }

        roadPolylinesDataRef.current.push({
          id: road.id,
          casing,
          pavement,
          centerline,
          highlightAura,
          labelMarker,
          labelText,
          casingColor,
          surfaceColor,
          centerColor,
          casingWeight,
        });
      });
    }

    // 8b. Landmarks (Teardrop POI Pins with Tip Anchor & Adjacent Label)
    if (
      layerSettings.showLandmarks !== false &&
      annotations.landmarks &&
      annotations.landmarks.length > 0
    ) {
      annotations.landmarks.forEach((landmark) => {
        if (typeof landmark.lat !== 'number' || typeof landmark.lng !== 'number') return;

        const { bg, svg } = getLandmarkIconConfig(landmark.type);
        const isSelected = selectedLandmarkId === landmark.id;
        const canMoveLandmark = canModifyMapAnnotation(currentUser, landmark, groups);

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
        pinContainer.style.transition = 'transform 0.15s ease-out, filter 0.15s ease-out';

        // Zero-width/height container: (0, 0) is the exact landmark coordinate
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.width = '0px';
        wrapper.style.height = '0px';
        wrapper.style.cursor =
          canMoveLandmark && !isReadOnly && isPointerMode
            ? 'grab'
            : isPrintViewportActive
              ? 'default'
              : 'pointer';
        wrapper.style.pointerEvents = isPrintViewportActive ? 'none' : 'auto';
        wrapper.title = `${landmark.label || 'Landmark'} (${landmark.type})`;

        const pinCircle = document.createElement('div');
        pinCircle.style.backgroundColor = bg;
        pinCircle.style.width = '24px';
        pinCircle.style.height = '24px';
        pinCircle.style.borderRadius = '50%';
        pinCircle.style.display = 'flex';
        pinCircle.style.alignItems = 'center';
        pinCircle.style.justifyContent = 'center';
        pinCircle.style.border = '2px solid #FFFFFF';
        pinCircle.style.boxShadow = isSelected
          ? '0 0 0 2px #3B82F6, 0 1px 3px rgba(0,0,0,0.2)'
          : 'none';
        pinCircle.style.color = '#FFFFFF';
        pinCircle.style.zIndex = '2';
        pinCircle.style.boxSizing = 'border-box';
        pinCircle.style.padding = '5.5px';
        pinCircle.style.transition = 'box-shadow 0.15s ease-out';
        pinCircle.innerHTML = svg;

        const pinTip = document.createElement('div');
        pinTip.style.backgroundColor = bg;
        pinTip.style.width = '6.5px';
        pinTip.style.height = '6.5px';
        pinTip.style.transform = 'rotate(45deg)';
        pinTip.style.marginTop = '-4px';
        pinTip.style.borderRight = '2px solid #FFFFFF';
        pinTip.style.borderBottom = '2px solid #FFFFFF';
        pinTip.style.zIndex = '1';

        pinContainer.appendChild(pinCircle);
        pinContainer.appendChild(pinTip);
        wrapper.appendChild(pinContainer);

        // Label beside pin: pure text with white stroke / halo
        const labelWrapper = document.createElement('div');
        labelWrapper.style.position = 'absolute';
        labelWrapper.style.left = '15px';
        labelWrapper.style.bottom = '10px';
        labelWrapper.style.whiteSpace = 'nowrap';
        labelWrapper.style.pointerEvents = 'none';

        const labelEl = document.createElement('span');
        labelEl.style.fontSize = '10px';
        labelEl.style.fontWeight = '700';
        labelEl.style.color = isSelected ? '#1D4ED8' : '#334155';
        labelEl.style.paintOrder = 'stroke fill';
        labelEl.style.webkitTextStroke = '1.75px #FFFFFF';
        labelEl.style.textShadow = '0 1px 2px rgba(0,0,0,0.2)';
        labelEl.style.lineHeight = '1.15';
        labelEl.style.letterSpacing = '-0.01em';
        labelEl.style.transition = 'color 0.15s ease-out';
        labelEl.textContent = landmark.label || 'Landmark';

        labelWrapper.appendChild(labelEl);
        wrapper.appendChild(labelWrapper);

        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: landmark.lat, lng: landmark.lng },
          title: landmark.label || 'Landmark',
          content: wrapper,
          gmpDraggable: false,
          zIndex: isSelected ? 50 : 30,
        });

        attachLongPressDrag({
          wrapper,
          pinContainer,
          marker,
          mapInstanceRef,
          mapContainerRef,
          overlayRef,
          isReadOnlyRef,
          isPrintViewportActiveRef,
          activeToolRef,
          onSelect: () => handleSelectLandmarkRef.current?.(landmark),
          onMove: (newLat, newLng) => handleMoveLandmarkRef.current?.(landmark.id, newLat, newLng),
          getIsSelected: () => selectedLandmarkIdRef.current === landmark.id,
          canDrag: () => canMoveLandmark && !isReadOnlyRef.current,
        });

        landmarkMarkersRef.current.push(marker);
        landmarkMarkersDataRef.current.push({
          id: landmark.id,
          marker,
          pinContainer,
          pinCircle,
          labelEl,
        });
      });
    }

    // 8c. Start Flag: Physical Map Marker Icon & Pointer Tip with Adjacent Label
    if (layerSettings.showStartFlag !== false && annotations.startFlag) {
      const sf = annotations.startFlag;
      if (typeof sf.lat === 'number' && typeof sf.lng === 'number') {
        const canMoveStartFlag = canModifyMapAnnotation(currentUser, sf, groups);

        // Zero-width/height container: (0, 0) is the exact start flag coordinate
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.width = '0px';
        wrapper.style.height = '0px';
        wrapper.style.cursor =
          canMoveStartFlag && !isReadOnly && isPointerMode
            ? 'grab'
            : isPrintViewportActive
              ? 'default'
              : 'pointer';
        wrapper.style.pointerEvents = isPrintViewportActive ? 'none' : 'auto';
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
        labelEl.style.webkitTextStroke = '1.75px #FFFFFF';
        labelEl.style.textShadow = '0 1px 2px rgba(0,0,0,0.2)';
        labelEl.style.lineHeight = '1.15';
        labelEl.style.letterSpacing = '-0.01em';
        labelEl.textContent = sf.label || 'Start Meeting Point';

        labelWrapper.appendChild(labelEl);
        wrapper.appendChild(labelWrapper);

        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: sf.lat, lng: sf.lng },
          title: sf.label || 'Territory Start Meeting Point',
          content: wrapper,
          gmpDraggable: false,
          zIndex: 40,
        });

        attachLongPressDrag({
          wrapper,
          pinContainer,
          marker,
          mapInstanceRef,
          mapContainerRef,
          overlayRef,
          isReadOnlyRef,
          isPrintViewportActiveRef,
          activeToolRef,
          onSelect: () => handleSelectStartFlagRef.current?.(),
          onMove: (newLat, newLng) => handleMoveStartFlagRef.current?.(newLat, newLng),
          canDrag: () => canMoveStartFlag && !isReadOnlyRef.current,
        });

        startFlagMarkerRef.current = marker;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mapReady,
    roadsAndLandmarksKey,
    layerSettings.showRoads,
    layerSettings.showLandmarks,
    layerSettings.showStartFlag,
    activeTool,
    isPrintViewportActive,
  ]);

  // 8b. Zero-Flicker Landmark & Road Selection Synchronizer (In-place styling with 0 marker rebuilds)
  useEffect(() => {
    // Sync Landmarks
    landmarkMarkersDataRef.current.forEach(({ id, marker, pinContainer, pinCircle, labelEl }) => {
      const isSelected = selectedLandmarkId === id;
      marker.zIndex = isSelected ? 50 : 30;
      pinContainer.style.filter = isSelected
        ? 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))'
        : 'drop-shadow(0 2px 4px rgba(0,0,0,0.32))';
      pinContainer.style.transform = isSelected ? 'scale(1.08)' : 'scale(1)';
      pinCircle.style.boxShadow = isSelected
        ? '0 0 0 2px #3B82F6, 0 1px 3px rgba(0,0,0,0.2)'
        : 'none';
      if (labelEl) {
        labelEl.style.color = isSelected ? '#1E293B' : '#334155';
      }
    });

    // Sync Roads
    const isPointerMode = !isPrintViewportActive && activeTool === 'pointer';
    const roads = territory?.annotations?.roads || [];
    roadPolylinesDataRef.current.forEach((item) => {
      const isSelected = selectedRoadId === item.id;
      const targetRoad = roads.find((r) => r.id === item.id);
      const canEditRoad = canModifyMapAnnotation(currentUser, targetRoad, groups);
      item.pavement.setEditable(isSelected && canEditRoad && !isReadOnly && isPointerMode);
      if (item.highlightAura) {
        item.highlightAura.setVisible(isSelected);
      }
      item.casing.setOptions({
        strokeColor: isSelected ? '#1D4ED8' : item.casingColor,
        strokeWeight: isSelected ? item.casingWeight + 1 : item.casingWeight,
        zIndex: isSelected ? 14 : 10,
      });
      item.pavement.setOptions({
        zIndex: isSelected ? 15 : 11,
      });
      item.centerline.setOptions({
        zIndex: isSelected ? 16 : 12,
      });
      if (item.labelMarker) {
        item.labelMarker.zIndex = isSelected ? 30 : 18;
      }
      if (item.labelText) {
        item.labelText.style.color = isSelected ? '#1D4ED8' : '#334155';
        item.labelText.style.webkitTextStroke = isSelected ? '1.75px #DBEAFE' : '1.75px #FFFFFF';
        item.labelText.style.textShadow = isSelected
          ? '0 0 3px #93C5FD, 0 1px 2px rgba(0,0,0,0.25)'
          : '0 1px 2px rgba(0,0,0,0.25)';
      }
    });
  }, [selectedLandmarkId, selectedRoadId, activeTool, isReadOnly, isPrintViewportActive]);

  // 8c. Touch-Friendly Vertex Handles for Selected Boundary or Road on Mobile & Touch Screens
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || typeof google === 'undefined' || !google.maps.marker) return;

    selectedVertexMarkersRef.current.forEach((m) => {
      m.map = null;
    });
    selectedVertexMarkersRef.current = [];

    const isPointerMode = !isPrintViewportActive && activeTool === 'pointer';
    if (!isPointerMode || isReadOnly) return;

    const { AdvancedMarkerElement } = google.maps.marker;

    // If a boundary is selected, render touch-friendly vertex deletion handles
    if (selectedBoundaryId) {
      const boundaries = getTerritoryBoundaries(territory);
      const targetBoundary = boundaries.find((b) => b.id === selectedBoundaryId);
      if (targetBoundary && targetBoundary.points && targetBoundary.points.length > 0) {
        targetBoundary.points.forEach((pt, idx) => {
          const handleEl = document.createElement('div');
          handleEl.style.width = '18px';
          handleEl.style.height = '18px';
          handleEl.style.borderRadius = '50%';
          handleEl.style.backgroundColor = '#FFFFFF';
          handleEl.style.border = '3px solid #2563EB';
          handleEl.style.boxShadow = '0 2px 6px rgba(0,0,0,0.35)';
          handleEl.style.cursor = 'pointer';
          handleEl.style.transform = 'scale(1)';
          handleEl.style.transition = 'transform 0.15s ease-out';
          handleEl.title = 'Tap or right-click to delete this vertex';

          attachVertexTouchDelete(handleEl, () => {
            if (targetBoundary.points.length <= 3) return;
            const updated = targetBoundary.points.filter((_, i) => i !== idx);
            handleUpdateBoundaryPolygonRef.current?.(targetBoundary.id, updated);
          });

          const marker = new AdvancedMarkerElement({
            map,
            position: pt,
            content: handleEl,
            zIndex: 60 + idx,
          });
          selectedVertexMarkersRef.current.push(marker);
        });
      }
    }

    // If a road is selected, render touch-friendly vertex deletion handles
    if (selectedRoadId) {
      const roads = territory?.annotations?.roads || [];
      const targetRoad = roads.find((r) => r.id === selectedRoadId);
      if (targetRoad && targetRoad.points && targetRoad.points.length > 0) {
        targetRoad.points.forEach((pt, idx) => {
          const handleEl = document.createElement('div');
          handleEl.style.width = '18px';
          handleEl.style.height = '18px';
          handleEl.style.borderRadius = '50%';
          handleEl.style.backgroundColor = '#FFFFFF';
          handleEl.style.border = '3px solid #1D4ED8';
          handleEl.style.boxShadow = '0 2px 6px rgba(0,0,0,0.35)';
          handleEl.style.cursor = 'pointer';
          handleEl.style.transform = 'scale(1)';
          handleEl.style.transition = 'transform 0.15s ease-out';
          handleEl.title = 'Tap or right-click to delete this vertex';

          attachVertexTouchDelete(handleEl, () => {
            if (targetRoad.points.length <= 2) return;
            const updated = targetRoad.points.filter((_, i) => i !== idx);
            handleUpdateRoadPointsRef.current?.(targetRoad.id, updated);
          });

          const marker = new AdvancedMarkerElement({
            map,
            position: pt,
            content: handleEl,
            zIndex: 60 + idx,
          });
          selectedVertexMarkersRef.current.push(marker);
        });
      }
    }
  }, [
    mapReady,
    selectedBoundaryId,
    selectedRoadId,
    activeTool,
    isReadOnly,
    isPrintViewportActive,
    boundariesKey,
    roadsAndLandmarksKey,
  ]);

  // 9a. Render User Live GPS Location Dot & Accuracy Circle (Runs ONLY on position or layer change)
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
      currentBeamAngleRef.current = null;
      targetBeamAngleRef.current = null;
      if (beamRafIdRef.current) {
        cancelAnimationFrame(beamRafIdRef.current);
        beamRafIdRef.current = null;
      }
      return;
    }

    const { AdvancedMarkerElement } = google.maps.marker;
    const { lat, lng, accuracy } = userLocation;

    // 1. Accuracy Circle (update center/radius only when position/accuracy changes)
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

    // 2. Flashlight Beam & Core Dot (create or update position without remounting)
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

      // Root marker container anchored precisely at (0, 0)
      const container = document.createElement('div');
      container.style.position = 'relative';
      container.style.width = '0px';
      container.style.height = '0px';
      container.style.pointerEvents = 'none';

      // Flashlight Heading Beam Cone (Hardware-accelerated CSS cone, centered at 0,0)
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
      beamDiv.style.willChange = 'transform';
      beamDiv.style.background =
        'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.65) 0%, rgba(96, 165, 250, 0.25) 45%, rgba(191, 219, 254, 0) 70%)';
      beamDiv.style.clipPath = 'polygon(50% 50%, 20% 0%, 80% 0%)';
      beamDiv.style.display = userHeading != null ? 'block' : 'none';
      beamDiv.style.transform = `rotate(${(userHeading ?? 0).toFixed(2)}deg)`;

      // Pulsing Blue Location Halo
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

      // Core Blue GPS Location Dot
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
      currentBeamAngleRef.current = userHeading ?? 0;
      targetBeamAngleRef.current = userHeading ?? 0;

      const marker = new AdvancedMarkerElement({
        map,
        position: { lat, lng },
        content: container,
        zIndex: 100,
      });

      userLocationMarkerRef.current = marker;
    }
  }, [
    mapReady,
    userLocation?.lat,
    userLocation?.lng,
    userLocation?.accuracy,
    layerSettings.showUserLocation,
  ]);

  // 9b. Compass Heading Flashlight Beam (Liquid-Smooth RAF Gimbal Interpolation)
  useEffect(() => {
    const beam = userLocationBeamRef.current;
    if (!beam) return;

    if (userHeading == null || layerSettings.showUserLocation === false) {
      beam.style.display = 'none';
      if (beamRafIdRef.current) {
        cancelAnimationFrame(beamRafIdRef.current);
        beamRafIdRef.current = null;
      }
      return;
    }

    beam.style.display = 'block';

    const newTarget = userHeading;
    if (currentBeamAngleRef.current == null) {
      currentBeamAngleRef.current = newTarget;
      targetBeamAngleRef.current = newTarget;
      beam.style.transform = `rotate(${newTarget.toFixed(2)}deg)`;
      return;
    }

    // Calculate shortest angular path from current unwrapped angle to new target
    const currentAngle = currentBeamAngleRef.current;
    const currentMod = ((currentAngle % 360) + 360) % 360;
    let diff = newTarget - currentMod;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    targetBeamAngleRef.current = currentAngle + diff;

    // Start RAF animation loop if not active
    if (!beamRafIdRef.current) {
      const animateBeam = () => {
        if (!userLocationBeamRef.current || targetBeamAngleRef.current == null) {
          beamRafIdRef.current = null;
          return;
        }

        const target = targetBeamAngleRef.current;
        const current = currentBeamAngleRef.current ?? target;
        const remaining = target - current;

        // If delta is tiny, settle smoothly and stop RAF loop
        if (Math.abs(remaining) < 0.04) {
          currentBeamAngleRef.current = target;
          userLocationBeamRef.current.style.transform = `rotate(${target.toFixed(2)}deg)`;
          beamRafIdRef.current = null;
          return;
        }

        // Critically-damped exponential lerp (0.22 factor @ 60/120Hz display refresh)
        const next = current + remaining * 0.22;
        currentBeamAngleRef.current = next;
        userLocationBeamRef.current.style.transform = `rotate(${next.toFixed(2)}deg)`;

        beamRafIdRef.current = requestAnimationFrame(animateBeam);
      };

      beamRafIdRef.current = requestAnimationFrame(animateBeam);
    }
  }, [userHeading, layerSettings.showUserLocation]);

  // Clean up RAF loop on unmount
  useEffect(() => {
    return () => {
      if (beamRafIdRef.current) {
        cancelAnimationFrame(beamRafIdRef.current);
        beamRafIdRef.current = null;
      }
    };
  }, []);

  // 9c. Render Shared Member Locations (Group Overseers & Servants Visibility)
  const onSelectMemberLocationRef = useRef(onSelectMemberLocation);
  onSelectMemberLocationRef.current = onSelectMemberLocation;

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || typeof google === 'undefined' || !google.maps.marker) return;

    const { AdvancedMarkerElement } = google.maps.marker;
    const currentMarkersMap = memberMarkersDataRef.current;

    if (layerSettings.showMemberLocations === false) {
      // Clear all member markers if layer is hidden
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
      const _isCurrentUser = Boolean(currentUserId && loc.userId === currentUserId);

      if (currentMarkersMap.has(locId)) {
        // Update existing marker in place
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

        entry.pinContainer.style.transform = isSelected ? 'scale(1.18)' : 'scale(1)';
        entry.pinContainer.style.filter = isSelected
          ? 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))'
          : isLive
            ? 'drop-shadow(0 2px 6px rgba(16,185,129,0.5))'
            : 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))';
      } else {
        // Create new member marker
        const container = document.createElement('div');
        container.style.position = 'relative';
        container.style.width = '36px';
        container.style.height = '36px';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.cursor = 'pointer';

        // Pulsing Live Halo
        const haloDiv = document.createElement('div');
        haloDiv.style.position = 'absolute';
        haloDiv.style.width = '44px';
        haloDiv.style.height = '44px';
        haloDiv.style.borderRadius = '50%';
        haloDiv.style.backgroundColor = isLive ? 'rgba(16, 185, 129, 0.22)' : 'transparent';
        haloDiv.style.border = isLive ? '1.5px solid rgba(16, 185, 129, 0.55)' : 'none';
        haloDiv.style.pointerEvents = 'none';
        haloDiv.style.zIndex = '2';

        // Pin Container (Avatar or Initials)
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
        pinContainer.style.boxShadow = '0 2px 6px rgba(0,0,0,0.35)';
        pinContainer.style.overflow = 'hidden';
        pinContainer.style.flexShrink = '0';
        pinContainer.style.transition = 'transform 0.15s ease-out';
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
            <span style="display: none; color: #FFFFFF; font-size: 11px; font-weight: 800; font-family: sans-serif; letter-spacing: -0.02em; pointer-events: none; width: 100%; height: 100%; align-items: center; justify-content: center;">${initials}</span>
          `;
        } else {
          pinContainer.innerHTML = `<span style="color: #FFFFFF; font-size: 11px; font-weight: 800; font-family: sans-serif; letter-spacing: -0.02em; pointer-events: none; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">${initials}</span>`;
        }

        // Live dot badge
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
          liveBadge.style.boxShadow = '0 0 4px #10B981';
          liveBadge.style.pointerEvents = 'none';
          pinContainer.appendChild(liveBadge);
        }

        container.appendChild(haloDiv);
        container.appendChild(pinContainer);

        container.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectMemberLocationRef.current?.(loc);
        });

        // Accuracy Circle
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
          title: `${loc.userName} (${isLive ? 'Live sharing' : 'Last seen'})`,
          content: container,
          zIndex: isSelected ? 80 : isLive ? 60 : 35,
        });

        marker.addListener('gmp-click', () => {
          onSelectMemberLocationRef.current?.(loc);
        });

        currentMarkersMap.set(locId, {
          id: locId,
          marker,
          accuracyCircle,
          pinContainer,
        });
      }
    }

    // Remove deleted / expired member markers
    currentMarkersMap.forEach((entry, id) => {
      if (!nextIds.has(id)) {
        entry.marker.map = null;
        entry.accuracyCircle?.setMap(null);
        currentMarkersMap.delete(id);
      }
    });
  }, [
    mapReady,
    memberLocations,
    layerSettings.showMemberLocations,
    selectedMemberLocationId,
    currentUserId,
  ]);

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

      <div ref={mapContainerRef} id="studio-google-map-element" className="w-full h-full" />
    </div>
  );
}
