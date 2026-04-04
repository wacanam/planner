'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Users, MapPin, ChevronUp, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { ProtectedPage } from '@/components/protected-page';
import { useTerritoryDetail, useTerritoryAssignments, useCongregationTerritories } from '@/hooks';
import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';

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

const statusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-800 border-green-200',
  assigned: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-purple-100 text-purple-800 border-purple-200',
  archived: 'bg-gray-100 text-gray-600 border-gray-200',
};

const assignmentStatusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-purple-100 text-purple-800 border-purple-200',
  returned: 'bg-gray-100 text-gray-600 border-gray-200',
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
      return `/api/households?boundary=${encodeURIComponent(geomStr)}`;
    } catch { return null; }
  }, [boundaryStr]);

  type HouseholdItem = { id: string; address: string; latitude?: string | null; longitude?: string | null; status?: string | null; type?: string | null };
  const { data: householdsResp } = useSWR<HouseholdItem[]>(
    householdsBboxKey,
    (url: string) => apiClient.get<HouseholdItem[]>(url),
    { revalidateOnFocus: false }
  );
  const householdsInTerritory = householdsResp ?? [];

  const backHref = `/congregation/${congregationId}/territories`;
  const [assignmentExpanded, setAssignmentExpanded] = useState(false);
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
        <main className="max-w-2xl mx-auto min-w-0 w-full">
          {/* Sticky compact header */}
          <div className="sticky top-16 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Territory</p>
              <p className="text-sm font-bold text-foreground truncate leading-tight">
                #{territory.number} {territory.name}
              </p>
            </div>
            <Badge
              className={`text-xs border shrink-0 ${statusColors[territory.status] ?? ''}`}
              variant="outline"
            >
              {territory.status}
            </Badge>
          </div>

          <div className="px-4 py-4 space-y-3">
            {/* Hero stats — households only, coverage shown on map */}
            <div className="rounded-2xl bg-muted/40 border border-border p-4 flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-lg font-bold text-foreground">{territory.householdsCount}</p>
                <p className="text-xs text-muted-foreground">Households</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center flex-1">
                <p className="text-lg font-bold text-foreground">{Number(territory.coveragePercent).toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Covered</p>
              </div>
            </div>

            {/* Map + Assignment overlay + Coverage HUD */}

            {(() => {
              const active = assignments.find((a) => a.status === 'active');
              return (
                <div className="relative rounded-2xl border border-border overflow-hidden h-[520px]">
                  <TerritoryMap
                    boundary={territory.boundary}
                    households={householdsInTerritory}
                    onHouseholdClick={handleHouseholdClick}
                    allBoundaries={(allTerritoriesData as Array<{id: string; name: string; boundary?: string | null}>)
                      .filter(t => t.boundary && t.id !== territory.id)
                      .map(t => ({ id: t.id, name: t.name, boundary: t.boundary as string }))}
                    className="h-full"
                  />

                  {/* Coverage HUD — top of map */}
                  <div className="absolute top-0 left-0 right-0 z-[1000] px-3 pt-2 pointer-events-none">
                    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-sm">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Coverage</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Number(territory.coveragePercent))}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-foreground tabular-nums whitespace-nowrap">
                        {Number(territory.coveragePercent).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Assignment overlay — docked to map bottom */}
                  {active && (
                    <div
                      className="absolute bottom-0 left-0 right-0 z-[1000]"
                      style={{ pointerEvents: 'auto' }}
                    >
                      {/* Collapsed handle — always visible */}
                      <button
                        type="button"
                        onClick={() => setAssignmentExpanded(p => !p)}
                        className="w-full flex items-center justify-between px-4 py-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-t border-blue-200 dark:border-blue-900/40"
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

                      {/* Expanded panel */}
                      {assignmentExpanded && (
                        <div className="px-4 py-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-blue-100 dark:border-blue-900/20 flex items-end justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm text-foreground">
                              {getAssigneeDisplayName(active)}
                            </p>
                            {active.assignedAt && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Since {new Date(active.assignedAt).toLocaleDateString()}
                                {active.dueAt && ` · Due ${new Date(active.dueAt).toLocaleDateString()}`}
                              </p>
                            )}
                          </div>
                          <Button asChild size="sm" variant="outline" className="shrink-0 bg-background/80">
                            <Link href={`/congregation/${congregationId}/my-assignments`}>
                              <MapPin className="h-3.5 w-3.5" />
                              Log Visits
                            </Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Notes */}
            {territory.notes && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground font-medium mb-1">Notes</p>
                <p className="text-sm text-foreground">{territory.notes}</p>
              </div>
            )}

            {/* Assignment history — collapsed rows */}
            {(() => {
              const history = assignments.filter((a) => a.status !== 'active');
              if (history.length === 0) return null;
              return (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium px-1">
                    History
                  </p>
                  {history.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{getAssigneeDisplayName(a)}</p>
                        {a.assignedAt && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(a.assignedAt).toLocaleDateString()}
                            {a.returnedAt && ` → ${new Date(a.returnedAt).toLocaleDateString()}`}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize shrink-0 ml-3 ${assignmentStatusColors[a.status] ?? ''}`}
                      >
                        {a.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </main>
      )}
    </ProtectedPage>
  );
}
