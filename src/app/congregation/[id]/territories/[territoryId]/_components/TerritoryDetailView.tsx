'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';

import { ArrowLeft, User, Users, MapPin, ChevronUp, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import Link from 'next/link';
import { ProtectedPage } from '@/components/protected-page';
import { useTerritoryDetail, useTerritoryAssignments, useCongregationTerritories } from '@/hooks';
import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import { MAP_STYLES } from '@/components/territory-map';
import type { StyleId } from '@/components/territory-map';

import { useTerritoryBoundary } from '@/hooks/use-territory-boundary';
// Dynamic import — Leaflet requires browser APIs
// biome-ignore lint/suspicious/noExplicitAny: Leaflet dynamic import
const TerritoryMap = dynamic(() => import('@/components/territory-map'), { ssr: false }) as any;

type LocalAssignment = {
  id: string;
  status: string;
  assignedAt: string | null;
  dueAt: string | null;
  returnedAt: string | null;
  notes: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  groupName: string | null;
};

function getAssigneeDisplayName(a: LocalAssignment): string {
  return a.assigneeName ?? a.groupName ?? 'Unknown';
}

// ─── Calibration overlay ──────────────────────────────────────────────────────
function CalibrationOverlay({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = React.useState<'guide' | 'done'>('guide');

  // Listen to real compass accuracy — complete when accuracy improves
  React.useEffect(() => {
    if (phase === 'done') return;

    let goodCount = 0;
    const GOOD_THRESHOLD = 5; // consecutive good readings = calibrated

    const onOrientation = (e: DeviceOrientationEvent & { webkitCompassAccuracy?: number }) => {
      const acc = e.webkitCompassAccuracy;
      if (acc !== undefined && acc >= 0 && acc <= 15) {
        goodCount++;
        if (goodCount >= GOOD_THRESHOLD) setPhase('done');
      } else {
        goodCount = 0;
      }
    };

    window.addEventListener('deviceorientation', onOrientation as EventListener, true);
    // Fallback: auto-complete after 10s if no iOS accuracy data available
    const fallback = setTimeout(() => setPhase('done'), 10000);

    return () => {
      window.removeEventListener('deviceorientation', onOrientation as EventListener, true);
      clearTimeout(fallback);
    };
  }, [phase]);

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center pointer-events-auto bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900/95 text-white text-center px-6 py-6 rounded-3xl max-w-[260px] w-full mx-4 space-y-4">
        {phase === 'guide' ? (
          <>
            {/* Animated figure-8 SVG */}
            <div className="flex justify-center">
              <svg width="80" height="50" viewBox="0 0 80 50" fill="none" aria-label="Figure 8 animation">
                <style>{`
                  @keyframes fig8 {
                    0%   { offset-distance: 0%; }
                    100% { offset-distance: 100%; }
                  }
                  .fig8-dot {
                    offset-path: path('M40,25 C40,10 65,10 65,25 C65,40 40,40 40,25 C40,10 15,10 15,25 C15,40 40,40 40,25');
                    animation: fig8 2s linear infinite;
                  }
                `}</style>
                {/* Figure-8 path outline */}
                <path
                  d="M40,25 C40,10 65,10 65,25 C65,40 40,40 40,25 C40,10 15,10 15,25 C15,40 40,40 40,25"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="2"
                  fill="none"
                />
                {/* Animated dot */}
                <circle className="fig8-dot" r="5" fill="#3b82f6" />
              </svg>
            </div>
            <p className="text-sm font-semibold">Calibrating compass</p>
            <p className="text-xs text-white/60 leading-snug">
              Slowly tilt and rotate your device in a figure-8 pattern
            </p>
            {/* Indeterminate progress — completes when accuracy actually improves */}
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ animation: 'calib-pulse 1.5s ease-in-out infinite alternate' }}
              />
            </div>
            <style>{`
              @keyframes calib-pulse {
                from { width: 20%; margin-left: 0%; }
                to   { width: 60%; margin-left: 40%; }
              }
            `}</style>
          </>
        ) : (
          <>
            {/* Done state */}
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
            </div>
            <p className="text-sm font-semibold text-green-400">Calibration complete</p>
            <p className="text-xs text-white/60">Compass accuracy improved</p>
            <button
              type="button"
              onClick={onDone}
              className="w-full py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-semibold transition-colors"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function TerritoryDetailView() {
  const { id: congregationId, territoryId } = useParams<{
    id: string;
    territoryId: string;
  }>();

  const {
    territory: territoryResponse,
    isLoading: territoryLoading,
    error: territoryError,
  } = useTerritoryDetail(territoryId ?? null);

  const { assignments: assignmentsResponse, isLoading: assignmentsLoading } =
    useTerritoryAssignments(territoryId ?? '');

  const loading = territoryLoading || assignmentsLoading;
  const territory = territoryResponse;
  const assignments = assignmentsResponse;
  const error = territoryError?.message ?? (!loading && !territory ? 'Territory not found' : '');

  // All congregation territories — for showing all polygons as layers on the map
  const { data: allTerritoriesData } = useCongregationTerritories(congregationId ?? null);

  // Pass boundary GeoJSON to API for PostGIS ST_Within query (exact polygon, GIST-indexed)
  // Falls back gracefully if no boundary is set
  const boundaryStr = territory?.boundary ?? null;
  const householdsBboxKey = React.useMemo(() => {
    if (!boundaryStr) return null;
    try {
      const geo = JSON.parse(boundaryStr);
      const geomStr = geo?.geometry ? JSON.stringify(geo.geometry) : null;
      if (!geomStr) return null;
      return `/api/households?boundary=${encodeURIComponent(geomStr)}&syncTerritory=${territoryId}`;
    } catch { return null; }
  }, [boundaryStr, territoryId]);

  type HouseholdItem = { id: string; address: string; latitude?: string | null; longitude?: string | null; status?: string | null; type?: string | null };
  const { data: householdsResp } = useSWR<HouseholdItem[]>(
    householdsBboxKey,
    (url: string) => apiClient.get<HouseholdItem[]>(url),
    { revalidateOnFocus: false }
  );
  const householdsInTerritory = householdsResp ?? [];

  const backHref = `/congregation/${congregationId}/territories`;
  const [assignmentExpanded, setAssignmentExpanded] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapStyle, setMapStyle] = useState<StyleId>('streets');
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [locationOn, setLocationOn] = useState(false);
  const [showCalibPrompt, setShowCalibPrompt] = useState(false);
  const [isDrawingBoundary, setIsDrawingBoundary] = useState(false);
  const { saveBoundary, isSaving: isSavingBoundary } = useTerritoryBoundary();
  const geolocateTriggerRef = useRef<(() => void) | null>(null);

  // Auto-switch map style when dark mode toggles
  React.useEffect(() => {
    const update = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setMapStyle((prev) => {
        if (isDark && prev !== 'dark') return 'dark';
        if (!isDark && prev === 'dark') return 'streets';
        return prev;
      });
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  const router = useRouter();

  // When a household pin is tapped, navigate to the active assignment visit log
  // pre-selecting that household via query param
  const handleHouseholdClick = useCallback((householdId: string) => {
    const active = assignments.find((a) => a.status === 'active');
    if (active) {
      router.push(`/congregation/${congregationId}/my-assignments/${active.id}?householdId=${householdId}`);
    }
  }, [assignments, congregationId, router]);

  return (
    <ProtectedPage congregationId={congregationId}>
      {loading ? (
        <div className="max-w-2xl mx-auto w-full flex flex-col h-dvh overflow-hidden animate-pulse relative">
          {/* Map area */}
          <div className="flex-1 bg-muted" />
          {/* Back button + title overlay */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <div className="h-7 w-7 bg-muted-foreground/20 rounded-lg" />
            <div className="h-4 w-28 bg-muted-foreground/20 rounded-full" />
          </div>
          {/* HUD strip */}
          <div className="absolute top-14 left-3 right-3 h-9 bg-muted-foreground/20 rounded-xl" />
          {/* Assignment strip */}
          <div className="h-11 shrink-0 bg-muted-foreground/20 border-t border-border" />
        </div>
      ) : error || !territory ? (
        <div className="p-6 text-destructive text-sm">
          {error || 'Not found'}{' '}
          <Link href={backHref} className="underline text-primary ml-1">
            Back
          </Link>
        </div>
      ) : (
        <main className={`min-w-0 w-full flex flex-col h-dvh overflow-hidden${mapFullscreen ? ' fixed inset-0 z-[2000] max-w-none' : ' max-w-2xl mx-auto relative'}` }>
          <div className="flex-1 min-h-0">
            {/* Map — full prominence, stats + assignment as overlays */}
            {(() => {
              return (
                <div className="relative h-full">
                  <TerritoryMap
                    boundary={territory.boundary}
                    households={householdsInTerritory}
                    onHouseholdClick={handleHouseholdClick}
                    mapStyle={mapStyle}
                    locationOn={locationOn}
                    onCalibrationNeeded={(needed: boolean) => { if (needed) setShowCalibPrompt(true); }}
                    onLocationDotClick={() => setShowCalibPrompt(true)}
                    onGeolocateReady={(fn: () => void) => { geolocateTriggerRef.current = fn; }}
                    allBoundaries={(allTerritoriesData as Array<{id: string; name: string; boundary?: string | null}>)
                      .filter(t => t.boundary && t.id !== territory.id)
                      .map(t => ({ id: t.id, name: t.name, boundary: t.boundary as string }))}
                    isDrawing={isDrawingBoundary}
                    onDrawingComplete={async (geojson: { type: string; coordinates: unknown }) => {
                      try {
                        await saveBoundary(territoryId, geojson as any);
                        setIsDrawingBoundary(false);
                      } catch {
                        // error handled by hook
                      }
                    }}
                    className="h-full"
                  />

                  {/* Drawing mode top banner */}
                  {isDrawingBoundary && (
                    <div className="absolute top-0 inset-x-0 z-[1100] flex items-center justify-between px-3 py-2 bg-blue-600/90 backdrop-blur-sm text-white pointer-events-auto">
                      <span className="text-xs font-semibold">
                        ✏️ Tap map to draw · Double-tap to close polygon
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsDrawingBoundary(false)}
                          className="text-xs px-2.5 py-1 rounded-md bg-white/20 hover:bg-white/30 font-medium"
                        >
                          Cancel
                        </button>
                        {isSavingBoundary && (
                          <span className="text-xs px-2.5 py-1 rounded-md bg-green-500/80 font-medium">
                            Saving…
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Fullscreen toggle — right center */}
                  <div className="absolute top-1/2 right-0 -translate-y-1/2 z-[1001] p-2 pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => setMapFullscreen(p => !p)}
                      className="flex items-center justify-center w-8 h-8 bg-white/5 dark:bg-gray-900/10 backdrop-blur-[2px] rounded-lg shadow-sm"
                    >
                      {mapFullscreen
                        ? <Minimize2 className="h-4 w-4 text-foreground" />
                        : <Maximize2 className="h-4 w-4 text-foreground" />}
                    </button>
                  </div>

                  {/* Back button + title overlay — top-left of map */}
                  <div className="absolute top-0 left-0 z-[1001] p-3 pointer-events-auto">
                    <div className="flex items-center gap-2 bg-white/5 dark:bg-gray-900/10 backdrop-blur-[2px] rounded-xl px-2 py-1.5 shadow-sm">
                      <Button asChild variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <Link href={backHref}>
                          <ArrowLeft className="h-4 w-4" />
                        </Link>
                      </Button>
                      <div className="min-w-0 pr-1">
                        <p className="text-[9px] text-muted-foreground font-medium leading-none mb-0.5">Territory</p>
                        <p className="text-xs font-bold text-foreground truncate leading-tight max-w-[180px]">
                          #{territory.number} {territory.name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Draw Boundary button — inline map control, right side */}
                  {/* Rendered in the fixed bottom-left cluster below */}
                  {/* Top HUD — stats + coverage bar (below back button) */}
                  <div className="absolute top-14 left-0 right-0 z-[1000] px-3 pointer-events-none">
                    <div className="bg-white/5 dark:bg-gray-900/10 backdrop-blur-[2px] rounded-xl px-3 py-2 shadow-sm space-y-1.5">
                      {/* Stats row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-semibold text-foreground">
                            {householdsInTerritory.length} <span className="text-muted-foreground font-normal">households</span>
                          </span>

                        </div>
                        <span className="text-[11px] font-bold text-foreground tabular-nums">
                          {Number(territory.coveragePercent).toFixed(1)}% covered
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Number(territory.coveragePercent))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                </div>
              );
            })()}
          </div>{/* end flex-1 map wrapper */}

          {/* Location toggle — fixed bottom-left */}
          <div className={`fixed left-3 z-[1200] transition-all duration-200 ${assignmentExpanded ? 'bottom-28' : 'bottom-12'}`}>
            {/* Draw boundary button — beside geolocation */}
            <button
              type="button"
              onClick={() => setIsDrawingBoundary(!isDrawingBoundary)}
              title={isDrawingBoundary ? "Stop drawing" : "Draw territory boundary"}
              className={[
                'flex items-center justify-center w-9 h-9 rounded-full shadow-md backdrop-blur-[2px] transition-all mb-2',
                isDrawingBoundary ? 'bg-blue-500 text-white' : 'bg-white/10 dark:bg-gray-900/10 text-foreground hover:bg-white/80',
              ].join(' ')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polygon points="3,17 6,3 13,12 9,12 16,21"/>
                <line x1="18" y1="3" x2="18" y2="21"/>
                <line x1="15" y1="6" x2="21" y2="6"/>
              </svg>
            </button>
            {/* Location toggle */}
            <button
              type="button"
              onClick={() => {
                  if (!locationOn) {
                    // Must call trigger() synchronously in the gesture for Safari.
                    // Call it immediately (may be a no-op if map not ready yet),
                    // then set state so the useEffect retry loop takes over.
                    geolocateTriggerRef.current?.();

                    // DeviceOrientation permission (iOS 13+ Safari)
                    type DOE = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
                    const DOE = DeviceOrientationEvent as DOE;
                    if (typeof DOE.requestPermission === 'function') {
                      DOE.requestPermission()
                        .then(() => setLocationOn(true))
                        .catch(() => setLocationOn(true));
                    } else {
                      setLocationOn(true);
                    }
                  } else {
                    setLocationOn(false);
                  }
                }}
              title={locationOn ? 'Hide my location' : 'Show my location'}
              className={[
                'flex items-center justify-center w-9 h-9 rounded-full shadow-md backdrop-blur-[2px] transition-all',
                locationOn ? 'bg-blue-500 text-white' : 'bg-white/10 dark:bg-gray-900/10 text-foreground',
              ].join(' ')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
              </svg>
            </button>
          </div>

          {/* Manual calibration overlay */}
          {locationOn && showCalibPrompt && (
            <CalibrationOverlay onDone={() => setShowCalibPrompt(false)} />
          )}

          {/* Map style switcher — fixed, shifts up when assignment strip expands */}
          <div className={`fixed right-3 z-[1200] transition-all duration-200 ${assignmentExpanded ? 'bottom-28' : 'bottom-12'}`}>
            {showStylePicker && (
              <div className="mb-1 flex flex-col gap-1 items-end">
                {MAP_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setMapStyle(s.id); setShowStylePicker(false); }}
                    style={{ fontWeight: 600, fontSize: '10px' }}
                    className={[
                      'px-2.5 py-1 rounded-lg shadow-sm backdrop-blur-[2px] transition-all',
                      mapStyle === s.id
                        ? 'bg-primary text-white'
                        : 'bg-white/5 dark:bg-gray-900/10 text-foreground hover:bg-white',
                    ].join(' ')}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowStylePicker((p) => !p)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 dark:bg-gray-900/10 backdrop-blur-[2px] shadow-sm text-[10px] font-semibold text-foreground"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 6h18M3 12h18M3 18h18"/>
              </svg>
              {MAP_STYLES.find((s) => s.id === mapStyle)?.label ?? 'Map'}
            </button>
          </div>

          {/* Assignment strip — shrink-0 sibling of map, always visible */}
            {(() => {
              const active = assignments.find((a) => a.status === 'active');
              if (!active) return null;
              return (
                <div className="fixed bottom-0 left-0 right-0 z-[1100]">
                  <div className="max-w-2xl mx-auto border-t border-blue-200/30 dark:border-blue-900/20 bg-white/5 dark:bg-gray-900/10 backdrop-blur-[2px]">
                  <button
                    type="button"
                    onClick={() => setAssignmentExpanded(p => !p)}
                    className="w-full flex items-center justify-between px-4 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      {active.groupName
                        ? <Users className="h-3.5 w-3.5 text-blue-500" />
                        : <User  className="h-3.5 w-3.5 text-blue-500" />}
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                        Assigned to {getAssigneeDisplayName(active)}
                      </span>
                    </div>
                    {assignmentExpanded
                      ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      : <ChevronUp   className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                  {assignmentExpanded && (
                    <div className="px-4 pb-4 flex items-end justify-between gap-2 border-t border-blue-100/50">
                      <div>
                        <p className="font-semibold text-sm text-foreground mt-2">{getAssigneeDisplayName(active)}</p>
                        {active.assignedAt && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Since {new Date(active.assignedAt).toLocaleDateString()}
                            {active.dueAt && ` · Due ${new Date(active.dueAt).toLocaleDateString()}`}
                          </p>
                        )}
                      </div>
                      <Button asChild size="sm" variant="outline" className="shrink-0">
                        <Link href={`/congregation/${congregationId}/my-assignments`}>
                          <MapPin className="h-3.5 w-3.5" />
                          Log Visits
                        </Link>
                      </Button>
                    </div>
                  )}
                  </div>
                </div>
              );
            })()}
        </main>
      )}
    </ProtectedPage>
  );
}
