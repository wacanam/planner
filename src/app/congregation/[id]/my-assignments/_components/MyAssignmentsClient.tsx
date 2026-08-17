'use client';

import { BarChart2, Calendar, Clock, Compass, Home, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { DashboardHeader } from '@/components/dashboard-header';
import { ProtectedPage } from '@/components/protected-page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCongregationTerritories, useMyAssignments } from '@/hooks';

export default function MyAssignmentsClient() {
  const params = useParams();
  const congregationId = (params?.id as string) || '';
  const { assignments = [], isLoading: loadingAssignments } = useMyAssignments(congregationId);
  const { data: territories = [], isLoading: loadingTerritories } =
    useCongregationTerritories(congregationId);

  const territoryMap = useMemo(() => {
    return new Map(territories.map((t) => [t.id, t]));
  }, [territories]);

  const active = assignments.filter((a) => a.status === 'assigned' || a.status === 'active');
  const past = assignments.filter((a) => a.status !== 'assigned' && a.status !== 'active');
  const isLoading = loadingAssignments || loadingTerritories;

  return (
    <ProtectedPage congregationId={congregationId}>
      <DashboardHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24 lg:pb-8 w-full min-w-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Territory Assignments</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Territory cards currently assigned to you for field ministry coverage
          </p>
        </div>

        {/* Active Assignments */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Compass size={18} className="text-primary" />
              <span>Currently Assigned ({active.length})</span>
            </h2>
            {active.length > 0 && (
              <Button asChild variant="outline" size="sm" className="rounded-xl text-xs">
                <Link href={`/congregation/${congregationId}/territories`}>
                  Browse All Territories
                </Link>
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 bg-muted animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : active.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-3xl border border-border p-8">
              <Compass size={40} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">No active assignments</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                You do not have an active territory assigned right now. Browse available congregation
                territories to get started.
              </p>
              <Button asChild size="sm" className="mt-5 rounded-xl text-xs font-semibold">
                <Link href={`/congregation/${congregationId}/territories`}>
                  Browse Congregation Territories
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {active.map((assignment) => {
                const terr = territoryMap.get(assignment.territoryId);
                const number = terr?.number || assignment.territoryNumber || '—';
                const name = terr?.name || assignment.territoryName || 'Territory';
                const coverage = Math.round(parseFloat(terr?.coveragePercent ?? '0'));
                const householdsCount = terr?.householdsCount ?? 0;

                return (
                  <Card
                    key={assignment.id}
                    className="bg-card border-border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between"
                  >
                    <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-extrabold text-sm text-primary">#{number}</span>
                            <h3 className="font-bold text-base text-foreground truncate mt-0.5">
                              {name}
                            </h3>
                            {terr?.city && (
                              <p className="text-[11px] text-muted-foreground">{terr.city}</p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 shrink-0"
                          >
                            Active
                          </Badge>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Home size={13} className="text-muted-foreground/70" />
                            <span>{householdsCount} doors</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <BarChart2 size={13} className="text-muted-foreground/70" />
                            <span>{coverage}% coverage</span>
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="space-y-1 text-xs text-muted-foreground pt-1">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-muted-foreground/70" />
                            <span>
                              Assigned{' '}
                              {assignment.assignedAt
                                ? new Date(assignment.assignedAt).toLocaleDateString()
                                : 'Recently'}
                            </span>
                          </div>
                          {assignment.dueAt && (
                            <div className="flex items-center gap-1.5">
                              <Clock size={12} className="text-muted-foreground/70" />
                              <span>Due {new Date(assignment.dueAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-3 border-t border-border">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="flex-1 rounded-xl text-xs"
                        >
                          <Link
                            href={`/congregation/${congregationId}/my-assignments/${assignment.territoryId}`}
                          >
                            View Details
                          </Link>
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          className="flex-1 rounded-xl text-xs gap-1.5 font-semibold shadow-xs"
                        >
                          <Link
                            href={`/congregation/${congregationId}/territories/${assignment.territoryId}`}
                          >
                            <MapPin size={13} />
                            <span>Open Studio</span>
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Past Assignments */}
        {past.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-border">
            <h2 className="text-base font-bold text-foreground">Past Completed Assignments</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {past.map((assignment) => {
                const terr = territoryMap.get(assignment.territoryId);
                const number = terr?.number || assignment.territoryNumber || '';
                const name = terr?.name || assignment.territoryName || 'Territory';

                return (
                  <div
                    key={assignment.id}
                    className="p-4 rounded-2xl border border-border bg-card flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <p className="font-bold text-foreground">
                        #{number} — {name}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Returned{' '}
                        {assignment.returnedAt
                          ? new Date(assignment.returnedAt).toLocaleDateString()
                          : '—'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[9px] capitalize">
                      {assignment.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
      <BottomTabBar />
    </ProtectedPage>
  );
}
