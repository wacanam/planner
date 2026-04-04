'use client';

import React, { useState, useCallback } from 'react';
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
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3 animate-pulse">
          <div className="h-8 w-48 bg-muted rounded-lg" />
          <div className="h-28 bg-muted rounded-2xl" />
          <div className="h-20 bg-muted rounded-2xl" />
          <div className="h-16 bg-muted rounded-2xl" />
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
                    allBoundaries={(allTerritoriesData as Array<{id: string; name: string; boundary?: string | null}>)
                      .filter(t => t.boundary && t.id !== territory.id)
                      .map(t => ({ id: t.id, name: t.name, boundary: t.boundary as string }))}
                    className="h-full"
                  />

                  {/* Fullscreen toggle — top-right */}
                  <div className="absolute top-0 right-0 z-[1001] p-3 pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => setMapFullscreen(p => !p)}
                      className="flex items-center justify-center w-8 h-8 bg-white/25 dark:bg-gray-900/25 backdrop-blur-sm rounded-lg shadow-sm"
                    >
                      {mapFullscreen
                        ? <Minimize2 className="h-4 w-4 text-foreground" />
                        : <Maximize2 className="h-4 w-4 text-foreground" />}
                    </button>
                  </div>

                  {/* Back button + title overlay — top-left of map */}
                  <div className="absolute top-0 left-0 z-[1001] p-3 pointer-events-auto">
                    <div className="flex items-center gap-2 bg-white/25 dark:bg-gray-900/25 backdrop-blur-sm rounded-xl px-2 py-1.5 shadow-sm">
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

                  {/* Top HUD — stats + coverage bar (below back button) */}
                  <div className="absolute top-14 left-0 right-0 z-[1000] px-3 pointer-events-none">
                    <div className="bg-white/25 dark:bg-gray-900/25 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm space-y-1.5">
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
                      'px-2.5 py-1 rounded-lg shadow-sm backdrop-blur-sm transition-all',
                      mapStyle === s.id
                        ? 'bg-primary text-white'
                        : 'bg-white/25 dark:bg-gray-900/25 text-foreground hover:bg-white',
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
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/25 dark:bg-gray-900/25 backdrop-blur-sm shadow-sm text-[10px] font-semibold text-foreground"
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
                <div className="fixed bottom-0 left-0 right-0 z-[1100] border-t border-blue-200/30 dark:border-blue-900/20 bg-white/25 dark:bg-gray-900/25 backdrop-blur-sm">
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
              );
            })()}
        </main>
      )}
    </ProtectedPage>
  );
}
