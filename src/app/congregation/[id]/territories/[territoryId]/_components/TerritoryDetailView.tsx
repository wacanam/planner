'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthSession as useSession } from '@/lib/firebase/auth';

import {
  ArrowLeft,
  User,
  Users,
  MapPin,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  Undo2,
  Check,
  Save,
  Trash2,
  Pencil,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { ProtectedPage } from '@/components/protected-page';
import {
  HouseholdEncounterSheet,
  HouseholdLogVisitSheet,
} from '@/components/households/household-action-sheets';
import {
  useCongregationMembers,
  useCongregationTerritories,
  useHouseholds,
  useTerritoryAssignments,
  useTerritoryDetail,
} from '@/hooks';
import type { StyleId } from '@/components/territory-map';
import type { Household } from '@/types/api';

import {
  useTerritoryBoundary,
  validateGeoJSON,
  type GeoJSONGeometry,
} from '@/hooks/use-territory-boundary';
import { AddHouseholdSheet } from './AddHouseholdSheet';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { deleteHousehold } from '@/lib/local-first';
import { toast } from 'sonner';
// Dynamic import because the Google Maps SDK requires browser APIs.
// biome-ignore lint/suspicious/noExplicitAny: dynamic map import
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
    <div className="fixed inset-0 z-1300 flex items-center justify-center pointer-events-auto bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900/95 text-white text-center px-6 py-6 rounded-3xl max-w-65 w-full mx-4 space-y-4">
        {phase === 'guide' ? (
          <>
            {/* Animated figure-8 SVG */}
            <div className="flex justify-center">
              <svg
                width="80"
                height="50"
                viewBox="0 0 80 50"
                fill="none"
                aria-label="Figure 8 animation"
              >
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
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
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
  const router = useRouter();

  const { data: session } = useSession();
  const sessionUser = session?.user as
    | { id?: string; role?: string; congregationId?: string }
    | undefined;
  const { data: members } = useCongregationMembers(congregationId ?? null);
  const myRole = React.useMemo(() => {
    if (!sessionUser?.id) return '';
    const me = members.find(
      (member) => member.userId === sessionUser.id || member.user?.id === sessionUser.id
    );
    return me?.congregationRole ?? '';
  }, [members, sessionUser?.id]);

  const canDrawBoundary = React.useMemo(() => {
    if (!sessionUser?.id) return false;
    return (
      myRole === 'service_overseer' ||
      myRole === 'territory_servant' ||
      ['SUPER_ADMIN', 'ADMIN', 'SERVICE_OVERSEER', 'TERRITORY_SERVANT'].includes(
        sessionUser.role ?? ''
      )
    );
  }, [myRole, sessionUser?.id, sessionUser?.role]);

  const canClearBoundary = React.useMemo(() => {
    if (!sessionUser?.id) return false;
    return (
      myRole === 'service_overseer' ||
      ['SUPER_ADMIN', 'ADMIN', 'SERVICE_OVERSEER'].includes(sessionUser.role ?? '')
    );
  }, [myRole, sessionUser?.id, sessionUser?.role]);

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
  const error = territoryError ?? (!loading && !territory ? 'Territory not found' : '');

  // All congregation territories — for showing all polygons as layers on the map
  const { data: allTerritoriesData } = useCongregationTerritories(congregationId ?? null);

  const { households: householdsResp } = useHouseholds({ congregationId, territoryId });
  const householdsInTerritory = householdsResp;

  const backHref = `/congregation/${congregationId}/territories`;
  const [assignmentExpanded, setAssignmentExpanded] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapStyle, setMapStyle] = useState<StyleId>('streets');
  const [locationOn] = useState(false);
  const [showCalibPrompt, setShowCalibPrompt] = useState(false);
  const [drawMode, setDrawMode] = useState<'add' | 'edit' | null>(null);
  const isDrawingBoundary = drawMode !== null;
  const [drawRingCount, setDrawRingCount] = useState(0);
  const [drawActivePoints, setDrawActivePoints] = useState(0);
  const [drawSaveError, setDrawSaveError] = useState<string | null>(null);
  const [clearConfirmPending, setClearConfirmPending] = useState(false);
  const [pendingPinCoords, setPendingPinCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [mapInteractionMode, setMapInteractionMode] = useState<'view' | 'add'>('view');
  const [logVisitHouseholdId, setLogVisitHouseholdId] = useState<string | null>(null);
  const [encounterHouseholdId, setEncounterHouseholdId] = useState<string | null>(null);
  const [deleteHouseholdId, setDeleteHouseholdId] = useState<string | null>(null);
  const [deletingHousehold, setDeletingHousehold] = useState(false);
  const { saveBoundary, clearBoundary, isSaving: isSavingBoundary } = useTerritoryBoundary();
  // Exposed callbacks from map for closing ring, undoing, and getting current GeoJSON
  const mapCloseRingRef = useRef<(() => void) | null>(null);
  const mapUndoPointRef = useRef<(() => void) | null>(null);
  const mapGetGeoJSONRef = useRef<(() => { type: string; coordinates: unknown } | null) | null>(
    null
  );
  const mapClearRingsRef = useRef<(() => void) | null>(null);

  const handleSaveBoundary = React.useCallback(async () => {
    const geojson = mapGetGeoJSONRef.current?.();
    if (!geojson || !validateGeoJSON(geojson)) {
      setDrawSaveError('Invalid boundary geometry — please redraw the polygon');
      return;
    }
    setDrawSaveError(null);
    try {
      await saveBoundary(territoryId, geojson as GeoJSONGeometry);
      setDrawMode(null);
    } catch (err) {
      setDrawSaveError(err instanceof Error ? err.message : 'Failed to save boundary');
    }
  }, [saveBoundary, territoryId]);

  const handleClearBoundary = React.useCallback(async () => {
    setDrawSaveError(null);
    try {
      await clearBoundary(territoryId);
    } catch (err) {
      setDrawSaveError(err instanceof Error ? err.message : 'Failed to clear boundary');
    }
  }, [clearBoundary, territoryId]);

  const handleCancelDrawing = React.useCallback(() => {
    setDrawMode(null);
    setDrawSaveError(null);
    setMapInteractionMode('view');
  }, []);

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
  const handleHouseholdClick = useCallback((householdId: string) => {
    setLogVisitHouseholdId(householdId);
  }, []);

  const activeAssignment = assignments.find(
    (a) => a.status === 'active' || a.status === 'assigned'
  );
  const mapToolButtonClass =
    'flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-md transition hover:bg-muted active:scale-95';
  const logVisitHousehold =
    householdsResp.find((household) => household.id === logVisitHouseholdId) ?? null;
  const encounterHousehold =
    householdsResp.find((household) => household.id === encounterHouseholdId) ?? null;
  const householdToDelete =
    householdsResp.find((household) => household.id === deleteHouseholdId) ?? null;

  const handleDeleteHousehold = useCallback(async () => {
    if (!deleteHouseholdId) return;
    setDeletingHousehold(true);
    try {
      await deleteHousehold(deleteHouseholdId);
      toast.success('Pinned household deleted');
      setDeleteHouseholdId(null);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const message = `Failed to delete household: ${reason}`;
      toast.error(message);
    } finally {
      setDeletingHousehold(false);
    }
  }, [deleteHouseholdId]);

  return (
    <ProtectedPage congregationId={congregationId}>
      {loading ? (
        <div className="w-full flex flex-col h-dvh overflow-hidden animate-pulse relative">
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
        <main
          className={`min-w-0 w-full flex flex-col overflow-hidden${mapFullscreen ? ' fixed inset-0 z-2000' : ' h-dvh relative'}`}
        >
          <div className="flex-1 min-h-0">
            {/* Map — full prominence, stats + assignment as overlays */}
            {(() => {
              return (
                <div className="relative h-full">
                  <TerritoryMap
                    boundary={territory.boundary}
                    households={householdsInTerritory}
                    onHouseholdClick={handleHouseholdClick}
                    onHouseholdAddEncounter={(householdId: string) =>
                      setEncounterHouseholdId(householdId)
                    }
                    onHouseholdViewDetails={(householdId: string) =>
                      router.push(
                        `/congregation/${congregationId}/records/households/${householdId}`
                      )
                    }
                    onHouseholdDeleteRequest={(householdId: string) =>
                      setDeleteHouseholdId(householdId)
                    }
                    mapStyle={mapStyle}
                    onMapStyleChange={setMapStyle}
                    locationOn={locationOn}
                    onCalibrationNeeded={(needed: boolean) => {
                      if (needed) setShowCalibPrompt(true);
                    }}
                    onLocationDotClick={() => setShowCalibPrompt(true)}
                    allBoundaries={(
                      allTerritoriesData as Array<{
                        id: string;
                        name: string;
                        boundary?: string | null;
                      }>
                    )
                      .filter((t) => t.boundary && t.id !== territory.id)
                      .map((t) => ({ id: t.id, name: t.name, boundary: t.boundary as string }))}
                    isDrawing={isDrawingBoundary}
                    drawMode={drawMode ?? 'add'}
                    mapInteractionMode={isDrawingBoundary ? 'view' : mapInteractionMode}
                    onMapInteractionModeChange={setMapInteractionMode}
                    pinPreview={pendingPinCoords}
                    onPinPreviewChange={setPendingPinCoords}
                    pinPlacement="instant"
                    onHouseholdPinPlaced={(lat: number, lng: number) => {
                      setPendingPinCoords({ lat, lng });
                    }}
                    initialDrawingRings={(() => {
                      // Both 'add' and 'edit' mode start with the existing boundary rings.
                      // In 'add' mode the user draws new polygons which are appended to the seeded set.
                      // In 'edit' mode the user can drag existing vertex handles and tap edges to insert vertices.
                      if (!territory.boundary) return undefined;
                      try {
                        const geo = JSON.parse(territory.boundary);
                        const coords = geo?.coordinates;
                        if (!coords) return undefined;
                        if (geo.type === 'Polygon') {
                          const ring = coords[0] as [number, number][];
                          return [ring.slice(0, -1)];
                        }
                        if (geo.type === 'MultiPolygon') {
                          return (coords as [number, number][][][]).map((p) => p[0].slice(0, -1));
                        }
                      } catch {
                        /* ignore */
                      }
                      return undefined;
                    })()}
                    onDrawingStateChange={(rings: number, pts: number) => {
                      setDrawRingCount(rings);
                      setDrawActivePoints(pts);
                    }}
                    onDrawingActions={(actions: {
                      closeRing: () => void;
                      undoPoint: () => void;
                      getGeoJSON: () => { type: string; coordinates: unknown } | null;
                      clearRings: () => void;
                    }) => {
                      mapCloseRingRef.current = actions.closeRing;
                      mapUndoPointRef.current = actions.undoPoint;
                      mapGetGeoJSONRef.current = actions.getGeoJSON;
                      mapClearRingsRef.current = actions.clearRings;
                    }}
                    className="h-full"
                  />

                  {!isDrawingBoundary && (
                    <div className="absolute right-3 top-3 z-40 flex flex-col gap-2 pointer-events-auto">
                      <button
                        type="button"
                        onClick={() => setMapFullscreen((p) => !p)}
                        className={mapToolButtonClass}
                        title={mapFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                        aria-label={mapFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                      >
                        {mapFullscreen ? (
                          <Minimize2 className="h-4 w-4" />
                        ) : (
                          <Maximize2 className="h-4 w-4" />
                        )}
                      </button>

                      {canDrawBoundary && (
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setClearConfirmPending(false);
                              setDrawMode('add');
                            }}
                            title="Draw boundary"
                            aria-label="Draw boundary"
                            className={mapToolButtonClass}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          {territory.boundary && (
                            <button
                              type="button"
                              onClick={() => {
                                setClearConfirmPending(false);
                                setDrawMode('edit');
                              }}
                              title="Edit boundary"
                              aria-label="Edit boundary"
                              className={mapToolButtonClass}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {territory.boundary && canClearBoundary && (
                            <button
                              type="button"
                              onClick={() => setClearConfirmPending(true)}
                              title="Clear boundary"
                              aria-label="Clear boundary"
                              className={`${mapToolButtonClass} text-destructive hover:bg-destructive/10`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Drawing mode toolbar — mobile-friendly, no keyboard shortcuts */}
                  {isDrawingBoundary && (
                    <>
                      {/* Top status bar */}
                      <div className="absolute top-0 inset-x-0 z-60 flex flex-col pointer-events-auto">
                        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-blue-600/90 backdrop-blur-sm text-white">
                          <span className="text-xs font-semibold truncate">
                            {drawMode === 'edit'
                              ? `✏️ Drag to move · Tap edge to add · Long-press vertex to remove`
                              : drawActivePoints > 0
                                ? `📍 ${drawActivePoints} pts — tap ✓ to close`
                                : drawRingCount > 0
                                  ? `✅ ${drawRingCount} polygon${drawRingCount > 1 ? 's' : ''} drawn — tap Save`
                                  : 'Tap map to add points'}
                          </span>
                          <div className="flex gap-1.5 shrink-0">
                            {isSavingBoundary ? (
                              <span className="text-xs px-2.5 py-1 rounded-md bg-green-500/80 font-medium">
                                Saving…
                              </span>
                            ) : (
                              drawRingCount > 0 &&
                              drawActivePoints === 0 && (
                                <button
                                  type="button"
                                  onClick={handleSaveBoundary}
                                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-green-500 hover:bg-green-600 font-semibold"
                                >
                                  <Save className="w-3 h-3" /> Save
                                </button>
                              )
                            )}
                            <button
                              type="button"
                              onClick={handleCancelDrawing}
                              className="text-xs px-2.5 py-1 rounded-md bg-white/20 hover:bg-white/30 font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                        {drawSaveError && (
                          <div className="px-3 py-1.5 bg-red-600/90 text-white text-xs font-medium">
                            ⚠️ {drawSaveError}
                          </div>
                        )}
                      </div>

                      {/* Right-side floating action buttons */}
                      <div className="absolute right-3 top-16 z-60 flex flex-col gap-2 pointer-events-auto">
                        {/* Close current ring — add mode only */}
                        {drawMode === 'add' && drawActivePoints >= 3 && (
                          <button
                            type="button"
                            onClick={() => mapCloseRingRef.current?.()}
                            className="flex items-center justify-center w-9 h-9 bg-blue-500 text-white rounded-full shadow-md"
                            title="Close polygon"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        )}
                        {/* Undo last point — add mode only */}
                        {drawMode === 'add' && drawActivePoints > 0 && (
                          <button
                            type="button"
                            onClick={() => mapUndoPointRef.current?.()}
                            className="flex items-center justify-center w-9 h-9 bg-white/90 dark:bg-gray-900/90 rounded-full shadow-md border border-gray-200"
                            title="Undo last point"
                          >
                            <Undo2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {/* Back button + title overlay — top-left of map */}
                  <div className="absolute left-3 top-3 z-30 pointer-events-auto">
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-background/95 px-2 py-1.5 shadow-md">
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <Link href={backHref}>
                          <ArrowLeft className="h-4 w-4" />
                        </Link>
                      </Button>
                      <div className="min-w-0 pr-1">
                        <p className="text-[9px] text-muted-foreground font-medium leading-none mb-0.5">
                          Territory
                        </p>
                        <p className="text-xs font-bold text-foreground truncate leading-tight max-w-45">
                          #{territory.number} {territory.name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Draw Boundary button — inline map control, right side */}
                  {/* Rendered in the fixed bottom-left cluster below */}
                  {/* Top HUD — stats + coverage bar (below back button) */}
                  <div className="absolute left-3 top-16 z-20 w-[min(20rem,calc(100%-1.5rem))] pointer-events-none">
                    <div className="rounded-xl border border-border bg-background/95 px-3 py-2 shadow-md space-y-1.5">
                      {/* Stats row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-semibold text-foreground">
                            {householdsInTerritory.length}{' '}
                            <span className="text-muted-foreground font-normal">households</span>
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

                  {/* Assignment strip — absolute bottom, inside map */}
                  {(() => {
                    const active = assignments.find((a) => a.status === 'active');
                    if (!active) return null;
                    return (
                      <div className="absolute bottom-0 left-0 right-0 z-30">
                        <div className="border-t border-border bg-background/95 shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
                          <button
                            type="button"
                            onClick={() => setAssignmentExpanded((p) => !p)}
                            className="w-full flex items-center justify-between px-4 py-2.5"
                          >
                            <div className="flex items-center gap-2">
                              {active.groupName ? (
                                <Users className="h-3.5 w-3.5 text-blue-500" />
                              ) : (
                                <User className="h-3.5 w-3.5 text-blue-500" />
                              )}
                              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                                Assigned to {getAssigneeDisplayName(active)}
                              </span>
                            </div>
                            {assignmentExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </button>
                          {assignmentExpanded && (
                            <div className="px-4 pb-4 flex items-end justify-between gap-2 border-t border-blue-100/50">
                              <div>
                                <p className="font-semibold text-sm text-foreground mt-2">
                                  {getAssigneeDisplayName(active)}
                                </p>
                                {active.assignedAt && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Since {new Date(active.assignedAt).toLocaleDateString()}
                                    {active.dueAt &&
                                      ` · Due ${new Date(active.dueAt).toLocaleDateString()}`}
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
                </div>
              );
            })()}
          </div>
          {/* end flex-1 map wrapper */}

          {/* AddHouseholdSheet — opens when a long-press pin is confirmed */}
          {pendingPinCoords && (
            <AddHouseholdSheet
              lat={pendingPinCoords.lat}
              lng={pendingPinCoords.lng}
              territoryId={territoryId}
              congregationId={congregationId}
              onClose={() => setPendingPinCoords(null)}
              onSuccess={() => setPendingPinCoords(null)}
            />
          )}

          <HouseholdLogVisitSheet
            household={logVisitHousehold as Household | null}
            assignmentId={activeAssignment?.id ?? null}
            open={!!logVisitHouseholdId}
            onOpenChange={(open) => {
              if (!open) setLogVisitHouseholdId(null);
            }}
          />

          <HouseholdEncounterSheet
            household={encounterHousehold as Household | null}
            open={!!encounterHouseholdId}
            onOpenChange={(open) => {
              if (!open) setEncounterHouseholdId(null);
            }}
          />

          {/* Manual calibration overlay */}
          {showCalibPrompt && <CalibrationOverlay onDone={() => setShowCalibPrompt(false)} />}

          {/* Clear boundary confirmation dialog */}
          <Dialog open={clearConfirmPending} onOpenChange={setClearConfirmPending}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Clear boundary?</DialogTitle>
                <DialogDescription>
                  This will permanently remove the boundary for this territory. This action cannot
                  be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setClearConfirmPending(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setClearConfirmPending(false);
                    handleClearBoundary();
                  }}
                >
                  Clear boundary
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <ConfirmDialog
            open={Boolean(deleteHouseholdId)}
            onOpenChange={(open) => {
              if (!open) {
                setDeleteHouseholdId(null);
              }
            }}
            title="Delete household?"
            description={
              householdToDelete
                ? `Remove ${householdToDelete.address || 'this pinned household'} from your local-first records?`
                : 'Remove this pinned household from your local-first records?'
            }
            confirmLabel={deletingHousehold ? 'Deleting…' : 'Delete'}
            confirmVariant="destructive"
            loading={deletingHousehold}
            onConfirm={handleDeleteHousehold}
          />
        </main>
      )}
    </ProtectedPage>
  );
}
