'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Users, MapPin } from 'lucide-react';
import Link from 'next/link';
import { ProtectedPage } from '@/components/protected-page';
import { useTerritoryDetail, useTerritoryAssignments, useCongregationTerritories } from '@/hooks';
import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';

// Dynamic import — Leaflet requires browser APIs
import type { TerritoryMapProps } from '@/components/territory-map';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Derive bbox from territory boundary to fetch households within it
  const boundaryStr = territory?.boundary ?? null;
  const householdsBboxKey = React.useMemo(() => {
    if (!boundaryStr) return null;
    try {
      const geo = JSON.parse(boundaryStr);
      const coords: [number, number][] = geo?.geometry?.coordinates?.[0] ?? [];
      if (!coords.length) return null;
      const lngs = coords.map(([lng]) => lng);
      const lats = coords.map(([, lat]) => lat);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      return `/api/households?minLat=${minLat}&maxLat=${maxLat}&minLng=${minLng}&maxLng=${maxLng}`;
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
            {/* Hero stats — 2 col, no redundant Status */}
            <div className="rounded-2xl bg-muted/40 border border-border p-4 grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-foreground">{territory.householdsCount}</p>
                <p className="text-xs text-muted-foreground">Households</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {Number(territory.coveragePercent).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Coverage</p>
              </div>
            </div>

            {/* Coverage bar */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Coverage progress</span>
                <span className="font-medium text-foreground">
                  {Number(territory.coveragePercent).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, Number(territory.coveragePercent))}%` }}
                />
              </div>
            </div>

            {/* Map — active territory highlighted, all congregation polygons as context layers */}
            <div className="rounded-2xl border border-border overflow-hidden h-96">
              <TerritoryMap
                boundary={territory.boundary}
                households={householdsInTerritory}
                allBoundaries={(allTerritoriesData as Array<{id: string; name: string; boundary?: string | null}>)
                  .filter(t => t.boundary && t.id !== territory.id)
                  .map(t => ({ id: t.id, name: t.name, boundary: t.boundary! }))}
                className="h-full"
              />
            </div>

            {/* Current assignment */}
            {(() => {
              const active = assignments.find((a) => a.status === 'active');
              if (!active) return null;
              return (
                <div className="rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-900/10 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {active.groupName ? (
                      <Users className="h-4 w-4 text-blue-500 shrink-0" />
                    ) : (
                      <User className="h-4 w-4 text-blue-500 shrink-0" />
                    )}
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                      Currently Assigned
                    </p>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        {getAssigneeDisplayName(active)}
                      </p>
                      {active.assignedAt && (
                        <p className="text-xs text-muted-foreground">
                          Since {new Date(active.assignedAt).toLocaleDateString()}
                          {active.dueAt && ` · Due ${new Date(active.dueAt).toLocaleDateString()}`}
                        </p>
                      )}
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="shrink-0 bg-background/80"
                    >
                      <Link href={`/congregation/${congregationId}/my-assignments`}>
                        <MapPin className="h-3.5 w-3.5" />
                        Log Visits
                      </Link>
                    </Button>
                  </div>
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
