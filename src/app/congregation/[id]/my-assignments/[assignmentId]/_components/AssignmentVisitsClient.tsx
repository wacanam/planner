'use client';

import { ArrowLeft, BarChart2, Calendar, Home, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTerritoryAssignments, useTerritoryDetail } from '@/hooks';
import { ProtectedPage } from '@/components/protected-page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const STATUS_COLORS: Record<string, string> = {
  assigned: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  available: 'bg-gray-100 text-gray-700 border-gray-200',
  completed: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  archived: 'bg-gray-100 text-gray-400 border-gray-100',
};

export default function AssignmentVisitsClient() {
  const { id: congregationId, assignmentId } = useParams<{
    id: string;
    assignmentId: string;
  }>();
  const territoryId = assignmentId ?? null;
  const backHref = `/congregation/${congregationId}/my-assignments`;

  const { territory, isLoading: territoryLoading } = useTerritoryDetail(territoryId);
  const { assignments, isLoading: assignmentsLoading } = useTerritoryAssignments(territoryId);

  const loading = territoryLoading || assignmentsLoading;

  // Find the latest active assignment for this territory
  const activeAssignment = assignments.find((a) => a.status === 'assigned') ?? assignments[0] ?? null;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const coverageNum = territory ? parseFloat(territory.coveragePercent ?? '0') : 0;

  return (
    <ProtectedPage congregationId={congregationId}>
      <main className="max-w-lg mx-auto min-w-0 w-full pb-24 md:pb-8">
        {/* Sticky header */}
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center gap-2 px-4 py-3">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="space-y-1">
                  <div className="h-3 w-20 bg-muted animate-pulse rounded-full" />
                  <div className="h-4 w-36 bg-muted animate-pulse rounded-full" />
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground font-medium">
                    {territory?.number ? `Territory ${territory.number}` : 'My Work'}
                  </p>
                  <p className="text-sm font-semibold text-foreground truncate leading-tight">
                    {territory?.name ?? 'Assignment Details'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {loading ? (
            <>
              <div className="h-28 bg-muted animate-pulse rounded-2xl" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-24 bg-muted animate-pulse rounded-2xl" />
                <div className="h-24 bg-muted animate-pulse rounded-2xl" />
              </div>
            </>
          ) : (
            <>
              {/* Territory card */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-primary font-medium uppercase tracking-wide">
                      Active Territory
                    </p>
                    <p className="text-lg font-bold text-foreground mt-0.5 leading-tight">
                      #{territory?.number} {territory?.name}
                    </p>
                    {territory?.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {territory.notes}
                      </p>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin size={18} className="text-primary" />
                  </div>
                </div>

                {/* Assignment info */}
                {activeAssignment && (
                  <div className="pt-2 border-t border-border space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${STATUS_COLORS[activeAssignment.status] ?? ''}`}
                      >
                        {activeAssignment.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        Assigned: {formatDate(activeAssignment.assignedAt)}
                      </span>
                      {activeAssignment.dueAt && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          Due: {formatDate(activeAssignment.dueAt)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Home size={14} />
                    <span className="text-xs font-medium">Total Doors</span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    {territory?.householdsCount ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">households</p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BarChart2 size={14} />
                    <span className="text-xs font-medium">Coverage</span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    {Math.round(coverageNum)}
                    <span className="text-lg font-semibold text-muted-foreground">%</span>
                  </p>
                  {/* Coverage bar */}
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(coverageNum, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button asChild className="w-full gap-2">
                  <Link href={`/congregation/${congregationId}/territories/${territoryId}`}>
                    <MapPin size={16} />
                    View Territory Map
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full gap-2">
                  <Link href={`/congregation/${congregationId}/records/households`}>
                    <Home size={16} />
                    View Households & Log Visits
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </ProtectedPage>
  );
}
