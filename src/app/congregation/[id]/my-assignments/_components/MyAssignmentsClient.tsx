'use client';

import {
  BarChart2,
  Calendar,
  ChevronRight,
  Clock,
  Compass,
  Crown,
  Home,
  MapPin,
  RotateCcw,
  User,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { DashboardHeader } from '@/components/dashboard-header';
import { ProtectedPage } from '@/components/protected-page';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCongregationGroups,
  useCongregationMembers,
  useCongregationTerritories,
  useCurrentUser,
  useHouseholds,
  useMyAssignments,
  useReturnAssignment,
} from '@/hooks';
import {
  canAdjustAssignmentDates,
  canReturnAssignment,
  filterActiveAssignments,
  getUserGroupIds,
  isUserInGroup,
  resolveUserAssignments,
} from '@/lib/permissions';
import { calculateTerritoryCoverage } from '@/lib/territory-coverage';
import type { Assignment, Household } from '@/types/api';

export default function MyAssignmentsClient() {
  const params = useParams();
  const congregationId = (params?.id as string) || '';
  const { user } = useCurrentUser();
  const { assignments = [], isLoading: loadingAssignments } = useMyAssignments(congregationId);
  const { data: territories = [], isLoading: loadingTerritories } =
    useCongregationTerritories(congregationId);
  const { groups = [], isLoading: loadingGroups } = useCongregationGroups(congregationId);
  const { data: members = [] } = useCongregationMembers(congregationId);
  const { households = [], isLoading: loadingHouseholds } = useHouseholds({ congregationId });
  const { returnTerritory, isPending: returning } = useReturnAssignment();

  const [returnConfirmAssignment, setReturnConfirmAssignment] = useState<Assignment | null>(null);
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const canAdjust = canAdjustAssignmentDates(user?.role);

  // Find user's service group
  const myGroup = useMemo(() => {
    return groups.find((g) => isUserInGroup(user, g) || g.id === user.groupId);
  }, [groups, user]);

  const groupmateCount = useMemo(() => {
    if (!myGroup) return 0;
    const fromGroup = (myGroup.members || []).length;
    const fromMembers = members.filter(
      (m) =>
        (m.status === 'active' || !m.status) &&
        (m.groupId === myGroup.id ||
          myGroup.members?.some((gm) => gm.userId === m.userId || gm.id === m.userId))
    ).length;
    return Math.max(fromGroup, fromMembers);
  }, [members, myGroup]);

  const territoryMap = useMemo(() => {
    return new Map(territories.map((t) => [t.id, t]));
  }, [territories]);

  // Real-time door counts and coverage calculation per territory
  const coverageByTerritoryId = useMemo(() => {
    const map = new Map<
      string,
      { totalDoors: number; workedDoors: number; coveragePercent: number }
    >();
    const byTerritory = new Map<string, Household[]>();
    for (const h of households) {
      if (h.territoryId) {
        if (!byTerritory.has(h.territoryId)) byTerritory.set(h.territoryId, []);
        byTerritory.get(h.territoryId)?.push(h);
      }
    }
    for (const [tId, hList] of byTerritory.entries()) {
      map.set(tId, calculateTerritoryCoverage(hList));
    }
    return map;
  }, [households]);

  // Find all service groups that the current user belongs to (as overseer, assistant, or member)
  const userGroupIds = useMemo(() => {
    return getUserGroupIds(user, groups);
  }, [groups, user]);

  // Filter assignments: either directly assigned to user OR inherited from their service group
  const myAssignments = useMemo(() => {
    return resolveUserAssignments(user, assignments, territories, userGroupIds, congregationId);
  }, [assignments, territories, user, userGroupIds, congregationId]);

  const active = useMemo(() => filterActiveAssignments(myAssignments), [myAssignments]);
  const past = useMemo(() => {
    return myAssignments.filter((a) => {
      const s = a.status?.toLowerCase().trim();
      return s !== 'assigned' && s !== 'active';
    });
  }, [myAssignments]);
  const isLoading = loadingAssignments || loadingTerritories || loadingGroups || loadingHouseholds;

  return (
    <ProtectedPage congregationId={congregationId}>
      <DashboardHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24 lg:pb-8 w-full min-w-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Territory Assignments</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Territory cards assigned to you directly or inherited through your service group
          </p>
        </div>

        {/* My Service Group Banner */}
        {myGroup && (
          <Link
            href={`/congregation/${congregationId}/groups`}
            className="p-4 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:border-primary/40 transition-all shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shrink-0 shadow-xs">
                <Users size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-sm sm:text-base text-foreground">{myGroup.name}</h2>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20"
                  >
                    {groupmateCount} Publishers
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>
                    Overseer:{' '}
                    <strong className="text-foreground">
                      {myGroup.overseerName || 'Unassigned'}
                    </strong>
                  </span>
                  {myGroup.assistantOverseerName && (
                    <>
                      <span>•</span>
                      <span>
                        Assistant:{' '}
                        <strong className="text-foreground">{myGroup.assistantOverseerName}</strong>
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-semibold text-primary self-end sm:self-center">
              <span>View Service Group</span>
              <ChevronRight
                size={15}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </div>
          </Link>
        )}

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
                You do not have a personal or group territory assigned right now. Browse available
                congregation territories to get started.
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
                const liveStats = coverageByTerritoryId.get(assignment.territoryId);
                const coverage =
                  liveStats?.coveragePercent ??
                  Math.round(parseFloat(terr?.coveragePercent ?? '0'));
                const householdsCount = liveStats?.totalDoors ?? terr?.householdsCount ?? 0;
                const isGroupAssignment = Boolean(assignment.serviceGroupId);
                const assignedGroup = groups.find((g) => g.id === assignment.serviceGroupId);
                const canReturn = canReturnAssignment(user, assignment, assignedGroup);

                return (
                  <Card
                    key={assignment.id}
                    className="bg-card border-border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between min-w-0"
                  >
                    <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between min-w-0">
                      <div className="space-y-2.5 min-w-0">
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <div className="min-w-0 flex-1">
                            <span className="font-extrabold text-sm text-primary shrink-0">
                              #{number}
                            </span>
                            <h3
                              className="font-bold text-base text-foreground line-clamp-2 mt-0.5 min-w-0 leading-snug break-words"
                              title={name}
                            >
                              {name}
                            </h3>
                            {terr?.city && (
                              <p
                                className="text-[11px] text-muted-foreground truncate"
                                title={terr.city}
                              >
                                {terr.city}
                              </p>
                            )}
                          </div>

                          {/* Assignment Type Badge */}
                          {isGroupAssignment ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold text-blue-700 bg-blue-50 dark:bg-blue-950/40 border-blue-200 shrink-0 gap-1"
                            >
                              <Users size={11} />
                              <span>{assignment.groupName || 'Service Group'}</span>
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold text-primary bg-primary/10 border-primary/30 shrink-0 gap-1"
                            >
                              <User size={11} />
                              <span>Personal</span>
                            </Badge>
                          )}
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
                      <div className="space-y-2 pt-3 border-t border-border">
                        <div className="flex items-center gap-2">
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
                        {canReturn ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setReturnConfirmAssignment(assignment)}
                            className="w-full h-7 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/80 gap-1.5"
                          >
                            <RotateCcw size={12} />
                            <span>Return Territory to Congregation</span>
                          </Button>
                        ) : (
                          <div className="py-1 px-2.5 rounded-lg bg-muted/30 border border-border/50 text-center">
                            <p className="text-[10px] text-muted-foreground italic flex items-center justify-center gap-1">
                              <Crown size={11} className="text-amber-500 shrink-0" />
                              <span>
                                Return managed by Group Overseer
                                {assignedGroup?.overseerName
                                  ? ` (${assignedGroup.overseerName})`
                                  : ''}
                                , Territory Servant, or Service Overseer
                              </span>
                            </p>
                          </div>
                        )}
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

        {/* Return Territory Confirmation Modal */}
        <ResponsiveDialog
          open={!!returnConfirmAssignment}
          onOpenChange={(op) => {
            if (!op) {
              setReturnConfirmAssignment(null);
              setReturnDate(new Date().toISOString().slice(0, 10));
            }
          }}
          title="Return Territory Assignment"
          description={
            returnConfirmAssignment
              ? `Return Territory #${
                  territoryMap.get(returnConfirmAssignment.territoryId)?.number ||
                  returnConfirmAssignment.territoryNumber ||
                  ''
                } to the congregation`
              : 'Return Territory'
          }
        >
          {returnConfirmAssignment && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                This will mark your assignment for Territory #
                {territoryMap.get(returnConfirmAssignment.territoryId)?.number ||
                  returnConfirmAssignment.territoryNumber ||
                  ''}{' '}
                as completed and make the territory available.
              </p>

              {canAdjust && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Effective Return Date *</Label>
                  <Input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl text-xs"
                  onClick={() => {
                    setReturnConfirmAssignment(null);
                    setReturnDate(new Date().toISOString().slice(0, 10));
                  }}
                  disabled={returning}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="rounded-xl text-xs font-semibold"
                  disabled={returning || (canAdjust && !returnDate)}
                  onClick={async () => {
                    if (returnConfirmAssignment) {
                      await returnTerritory(
                        returnConfirmAssignment.id,
                        canAdjust ? returnDate : undefined
                      );
                      toast.success('Territory returned to congregation');
                      setReturnConfirmAssignment(null);
                      setReturnDate(new Date().toISOString().slice(0, 10));
                    }
                  }}
                >
                  {returning ? 'Returning…' : 'Confirm Return'}
                </Button>
              </div>
            </div>
          )}
        </ResponsiveDialog>
      </main>
      <BottomTabBar />
    </ProtectedPage>
  );
}
