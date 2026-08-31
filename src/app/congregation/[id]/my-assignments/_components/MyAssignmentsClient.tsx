'use client';

import {
  AlertCircle,
  BarChart2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Compass,
  Crown,
  Home,
  Layers,
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
import { formatDate, getDueStatus } from '@/lib/date-utils';
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
  const [showPast, setShowPast] = useState(false);
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
      const assignment = assignments.find((a) => a.territoryId === tId);
      map.set(
        tId,
        calculateTerritoryCoverage(hList, {
          assignedAt: assignment?.assignedAt,
          returnedAt: assignment?.returnedAt,
          assignmentId: assignment?.id,
        })
      );
    }
    return map;
  }, [households, assignments]);

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
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 pb-24 lg:pb-8 w-full min-w-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            My Territory Assignments
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Territory cards assigned to you directly or inherited through your service group
          </p>
        </div>

        {/* My Service Group Banner */}
        {myGroup && (
          <Link
            href={`/congregation/${congregationId}/groups`}
            className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 group hover:border-primary/40 transition-all shadow-xs"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
                <Users size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-sm sm:text-base text-foreground">{myGroup.name}</h2>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20 px-2 py-0.5"
                  >
                    {groupmateCount} Publishers
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap truncate">
                  <span>
                    Overseer:{' '}
                    <strong className="text-foreground font-medium">
                      {myGroup.overseerName || 'Unassigned'}
                    </strong>
                  </span>
                  {myGroup.assistantOverseerName && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <span>
                        Assistant:{' '}
                        <strong className="text-foreground font-medium">
                          {myGroup.assistantOverseerName}
                        </strong>
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-semibold text-primary self-end sm:self-center shrink-0 bg-primary/5 sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-lg">
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
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Compass size={18} className="text-primary" />
              <span>Currently Assigned ({active.length})</span>
            </h2>
            {active.length > 0 && (
              <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-8 px-3">
                <Link href={`/congregation/${congregationId}/territories`}>
                  Browse All Territories
                </Link>
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-56 bg-muted animate-pulse rounded-2xl" />
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
                const totalDoors = liveStats?.totalDoors ?? terr?.householdsCount ?? 0;
                const workedDoors = liveStats?.workedDoors ?? 0;
                const coverage =
                  liveStats?.coveragePercent ??
                  Math.round(parseFloat(terr?.coveragePercent ?? '0'));
                const isGroupAssignment = Boolean(assignment.serviceGroupId);
                const assignedGroup = groups.find((g) => g.id === assignment.serviceGroupId);
                const canReturn = canReturnAssignment(user, assignment, assignedGroup);
                const dueStatus = getDueStatus(assignment.dueAt);

                return (
                  <Card
                    key={assignment.id}
                    className="bg-card border-border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between min-w-0 rounded-2xl overflow-hidden"
                  >
                    <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between min-w-0">
                      <div className="space-y-3.5 min-w-0">
                        {/* Header: Number, Name & Group Badge */}
                        <div className="flex items-start justify-between gap-2.5 min-w-0">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div className="px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-extrabold text-xs shrink-0 mt-0.5">
                              #{number}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3
                                className="font-bold text-base text-foreground line-clamp-2 leading-snug break-words"
                                title={name}
                              >
                                {name}
                              </h3>
                              {terr?.city && (
                                <p
                                  className="text-xs text-muted-foreground truncate mt-0.5"
                                  title={terr.city}
                                >
                                  {terr.city}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Assignment Type Badge */}
                          {isGroupAssignment ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold text-blue-700 bg-blue-50 dark:bg-blue-950/40 border-blue-200 shrink-0 gap-1 px-2 py-0.5"
                            >
                              <Users size={11} />
                              <span>{assignment.groupName || assignedGroup?.name || 'Group'}</span>
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold text-primary bg-primary/10 border-primary/30 shrink-0 gap-1 px-2 py-0.5"
                            >
                              <User size={11} />
                              <span>Personal</span>
                            </Badge>
                          )}
                        </div>

                        {/* Progress Bar & Stats */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                              <Home size={13} className="text-muted-foreground/70" />
                              <span>
                                {workedDoors} of {totalDoors} doors worked
                              </span>
                            </span>
                            <span className="font-bold text-foreground">{coverage}%</span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                coverage >= 100 ? 'bg-emerald-500' : 'bg-primary'
                              }`}
                              style={{ width: `${Math.min(coverage, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Dates & Urgency Status */}
                        <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-muted-foreground/70 shrink-0" />
                            <span>
                              Assigned{' '}
                              {assignment.assignedAt
                                ? formatDate(assignment.assignedAt)
                                : 'Recently'}
                            </span>
                          </div>

                          {assignment.dueAt && (
                            <div className="flex items-center gap-1.5">
                              {dueStatus.status === 'overdue' ? (
                                <Badge
                                  variant="destructive"
                                  className="text-[10px] px-2 py-0.5 gap-1 font-semibold"
                                >
                                  <AlertCircle size={11} />
                                  <span>{dueStatus.label}</span>
                                </Badge>
                              ) : dueStatus.status === 'due-soon' ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-2 py-0.5 gap-1 font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                >
                                  <Clock size={11} />
                                  <span>{dueStatus.label}</span>
                                </Badge>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <Clock size={12} className="text-muted-foreground/70 shrink-0" />
                                  <span>{dueStatus.label}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-3 border-t border-border">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            asChild
                            size="sm"
                            className="rounded-xl text-xs gap-1.5 font-semibold shadow-xs h-9"
                          >
                            <Link
                              href={`/congregation/${congregationId}/my-assignments/${assignment.territoryId}`}
                            >
                              <CheckCircle2 size={14} />
                              <span>Work Territory</span>
                            </Link>
                          </Button>
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-xs gap-1.5 h-9"
                          >
                            <Link
                              href={`/congregation/${congregationId}/territories/${assignment.territoryId}`}
                            >
                              <Layers size={14} />
                              <span>Studio / Map</span>
                            </Link>
                          </Button>
                        </div>

                        {canReturn ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setReturnConfirmAssignment(assignment)}
                            className="w-full h-8 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 gap-1.5"
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

        {/* Past Assignments Collapsible Section */}
        {past.length > 0 && (
          <div className="space-y-3 pt-6 border-t border-border">
            <button
              type="button"
              onClick={() => setShowPast((prev) => !prev)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border/70 hover:border-border transition-colors text-left group"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-foreground">
                  Past Completed Assignments
                </h2>
                <Badge variant="secondary" className="text-[10px] px-2 py-0.2">
                  {past.length}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground">
                <span>{showPast ? 'Hide' : 'Show'}</span>
                {showPast ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {showPast && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                {past.map((assignment) => {
                  const terr = territoryMap.get(assignment.territoryId);
                  const number = terr?.number || assignment.territoryNumber || '';
                  const name = terr?.name || assignment.territoryName || 'Territory';

                  return (
                    <div
                      key={assignment.id}
                      className="p-3.5 rounded-2xl border border-border bg-card flex items-center justify-between gap-3 text-xs shadow-2xs hover:border-primary/30 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">#{number}</span>
                          <p className="font-semibold text-foreground truncate">{name}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Returned {assignment.returnedAt ? formatDate(assignment.returnedAt) : '—'}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[9px] capitalize shrink-0">
                        {assignment.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
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
