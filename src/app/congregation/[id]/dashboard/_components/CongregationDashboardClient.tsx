'use client';

import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  FolderOpen,
  HelpCircle,
  Home,
  MapPin,
  Plus,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardTourGuide } from '@/components/dashboard-tour-guide';
import { HouseholdLogVisitSheet } from '@/components/households/household-action-sheets';
import { ProtectedPage } from '@/components/protected-page';
import { StatCard } from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useCongregation,
  useCongregationGroups,
  useCongregationMembers,
  useCongregationTerritories,
  useCurrentUser,
  useDashboardTour,
  useHouseholds,
  useMyAssignments,
} from '@/hooks';
import { formatDate, formatDaysAgo } from '@/lib/date-utils';
import {
  canCreateTerritory,
  canViewAllCongregationRecords,
  filterActiveAssignments,
  getUserGroupIds,
  isCircuitOverseer,
  isCongregationSecretary,
  isGroupLeader,
  isGroupOverseer,
  isGroupOverseerAssistant,
  isPublisher,
  isServiceOverseer,
  isSystemAdmin,
  isTerritoryServant,
  resolveUserAssignments,
} from '@/lib/permissions';
import { calculateTerritoryCoverage } from '@/lib/territory-coverage';
import { timeAgo } from '@/lib/time-ago';
import type { Household } from '@/types/api';

export default function CongregationDashboardClient() {
  const params = useParams();
  const _router = useRouter();
  const congregationId = (params?.id as string) || '';
  const { user } = useCurrentUser();
  const { congregation } = useCongregation(congregationId);

  const { data: territories = [], isLoading: territoriesLoading } =
    useCongregationTerritories(congregationId);
  const { assignments = [], isLoading: assignmentsLoading } = useMyAssignments(congregationId);
  const { groups = [] } = useCongregationGroups(congregationId);
  const { households = [], isLoading: householdsLoading } = useHouseholds({ congregationId });
  const { data: members = [] } = useCongregationMembers(congregationId);

  // Quick Visit Sheet state
  const [logVisitHousehold, setLogVisitHousehold] = useState<Household | null>(null);

  const tour = useDashboardTour({
    userId: user.id,
    autoStart: true,
  });

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

  const userGroup = useMemo(() => {
    return groups.find((g) => userGroupIds.has(g.id));
  }, [groups, userGroupIds]);

  // Role Tier Checks
  const userIsAdmin = isSystemAdmin(user?.role) || isSystemAdmin(user?.congregationRole);
  const userIsServiceOverseer =
    isServiceOverseer(user?.congregationRole) || isServiceOverseer(user?.role);
  const userIsSecretary =
    isCongregationSecretary(user?.congregationRole) || isCongregationSecretary(user?.role);
  const userIsCircuitOverseer =
    isCircuitOverseer(user?.congregationRole) || isCircuitOverseer(user?.role);
  const userIsTerritoryServant =
    isTerritoryServant(user?.congregationRole) || isTerritoryServant(user?.role);

  // Group Leadership checks
  const userIsGroupOverseer = useMemo(() => {
    return groups.some((g) => isGroupOverseer(user?.id, g, user?.role, user?.congregationRole));
  }, [groups, user]);

  const userIsGroupAssistant = useMemo(() => {
    return (
      !userIsGroupOverseer &&
      groups.some((g) =>
        isGroupOverseerAssistant(user?.id, g, user?.role, user?.congregationRole)
      )
    );
  }, [groups, user, userIsGroupOverseer]);

  const userIsGroupLeader = userIsGroupOverseer || userIsGroupAssistant;

  // Primary Role Presentation Tier
  const isExecutiveTier =
    userIsAdmin || userIsServiceOverseer || userIsSecretary || userIsCircuitOverseer;
  const isTerritoryServantTier = !isExecutiveTier && userIsTerritoryServant;
  const isGroupLeaderTier = !isExecutiveTier && !isTerritoryServantTier && userIsGroupLeader;
  const _isPublisherTier = !isExecutiveTier && !isTerritoryServantTier && !isGroupLeaderTier;

  // For group leaders: which group do they lead?
  const ledGroup = useMemo(() => {
    return (
      groups.find((g) => isGroupLeader(user?.id, g, user?.role, user?.congregationRole)) ||
      userGroup
    );
  }, [groups, user, userGroup]);

  // Group assignments, territories, households & metrics for Group Leader
  const ledGroupMemberIds = useMemo(() => {
    if (!ledGroup) return new Set<string>();
    const ids = new Set<string>(
      (ledGroup.members || [])
        .map((m) => m.userId || m.id)
        .filter((x): x is string => Boolean(x))
    );
    if (ledGroup.overseerId) ids.add(ledGroup.overseerId);
    if (ledGroup.assistantOverseerId) ids.add(ledGroup.assistantOverseerId);
    return ids;
  }, [ledGroup]);

  const groupAssignments = useMemo(() => {
    if (!ledGroup) return [];
    return assignments.filter((a) => {
      if (a.serviceGroupId && a.serviceGroupId === ledGroup.id) return true;
      return a.userId && ledGroupMemberIds.has(a.userId);
    });
  }, [assignments, ledGroup, ledGroupMemberIds]);

  const groupActiveAssignments = useMemo(() => {
    return filterActiveAssignments(groupAssignments);
  }, [groupAssignments]);

  const groupActiveTerritoryIds = useMemo(() => {
    return new Set(groupActiveAssignments.map((a) => a.territoryId).filter(Boolean));
  }, [groupActiveAssignments]);

  const groupHouseholds = useMemo(() => {
    if (!ledGroup) return [];
    return households.filter((h) => {
      if (h.territoryId && groupActiveTerritoryIds.has(h.territoryId)) return true;
      return h.createdById && ledGroupMemberIds.has(h.createdById);
    });
  }, [households, groupActiveTerritoryIds, ledGroup, ledGroupMemberIds]);

  const groupCoverage = useMemo(() => {
    return calculateTerritoryCoverage(groupHouseholds);
  }, [groupHouseholds]);

  const groupUnpinnedCount = useMemo(() => {
    return groupHouseholds.filter((h) => !h.latitude || !h.longitude).length;
  }, [groupHouseholds]);

  const groupReturnVisits = useMemo(() => {
    return groupHouseholds
      .filter(
        (h) =>
          h.status === 'return_visit' ||
          h.status === 'busy' ||
          Boolean(h.notes && h.lastVisitDate)
      )
      .sort((a, b) => (b.lastVisitDate || '').localeCompare(a.lastVisitDate || ''))
      .slice(0, 3);
  }, [groupHouseholds]);

  const displayRole = (() => {
    if (userIsAdmin) return user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin';
    if (userIsCircuitOverseer) return 'Circuit Overseer';
    if (userIsServiceOverseer) return 'Service Overseer';
    if (userIsSecretary) return 'Secretary';
    if (userIsTerritoryServant) return 'Territory Servant';
    if (userIsGroupOverseer) return `${ledGroup?.name || 'Group'} Overseer`;
    if (userIsGroupAssistant) return `${ledGroup?.name || 'Group'} Assistant`;
    if (
      user.congregationRole === 'VISITING_PUBLISHER' ||
      user.role === 'VISITING_PUBLISHER'
    )
      return 'Visiting Publisher';
    return 'Publisher';
  })();

  const isManager =
    canCreateTerritory(user.role, user.congregationRole) ||
    canViewAllCongregationRecords(user.role, user.congregationRole);

  const availableTerritories = territories.filter((t) => t.status === 'available');
  const inWorkTerritoriesCount = territories.filter(
    (t) => t.status === 'assigned' || t.status === 'pending'
  ).length;
  const overdueTerritoriesCount = territories.filter((t) => t.status === 'overdue').length;

  const activeAssignments = useMemo(() => {
    const userAssignments = resolveUserAssignments(
      user,
      assignments,
      territories,
      userGroupIds,
      congregationId
    );
    return filterActiveAssignments(userAssignments);
  }, [assignments, territories, user, userGroupIds, congregationId]);

  const myActiveTerritoryIds = useMemo(() => {
    return new Set(activeAssignments.map((a) => a.territoryId).filter(Boolean));
  }, [activeAssignments]);

  const myUnpinnedDoorsCount = useMemo(() => {
    return households.filter((h) => {
      const isUnpinned = !h.latitude || !h.longitude;
      if (!isUnpinned) return false;
      const isInMyTerritory = Boolean(h.territoryId && myActiveTerritoryIds.has(h.territoryId));
      const isCreatedByMe = h.createdById === user?.id;
      return isInMyTerritory || isCreatedByMe;
    }).length;
  }, [households, myActiveTerritoryIds, user?.id]);

  const totalCongregationUnpinnedCount = useMemo(() => {
    return households.filter((h) => !h.latitude || !h.longitude).length;
  }, [households]);

  const displayUnpinnedCount = isManager ? totalCongregationUnpinnedCount : myUnpinnedDoorsCount;

  // Congregation-wide territory door coverage
  const { totalDoorsCount, workedDoorsCount, congregationCoveragePercent } = useMemo(() => {
    const total = households.length;
    if (total === 0)
      return { totalDoorsCount: 0, workedDoorsCount: 0, congregationCoveragePercent: 0 };
    const worked = households.filter((h) => {
      if (!h) return false;
      if (h.lastVisitDate) return true;
      if (typeof h.totalVisitsCount === 'number' && h.totalVisitsCount > 0) return true;
      if (h.status && h.status.trim().toLowerCase() !== 'new') return true;
      return false;
    }).length;
    const percent = Math.min(100, Math.max(0, Math.round((worked / total) * 100)));
    return {
      totalDoorsCount: total,
      workedDoorsCount: worked,
      congregationCoveragePercent: percent,
    };
  }, [households]);

  // Personal Return Visits / Follow-ups
  const myReturnVisits = useMemo(() => {
    if (!user?.id) return [];
    return households
      .filter((h) => {
        const isMine = h.createdById === user.id || h.collaboratorIds?.includes(user.id);
        const isFollowup =
          h.status === 'return_visit' ||
          h.status === 'busy' ||
          Boolean(h.notes && h.notes.trim().length > 0 && h.lastVisitDate);
        return isMine && isFollowup;
      })
      .sort((a, b) => (b.lastVisitDate || '').localeCompare(a.lastVisitDate || ''))
      .slice(0, 3);
  }, [households, user?.id]);

  return (
    <ProtectedPage congregationId={congregationId}>
      <DashboardHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 pb-24 lg:pb-8 w-full min-w-0">
        {/* Welcome & Context Banner */}
        <div
          data-tour="welcome-banner"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-5 sm:p-6 rounded-3xl border border-primary/20"
        >
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                Welcome back, {user.name || 'Publisher'}! 👋
              </h1>
              <Badge
                variant="outline"
                className="text-xs uppercase font-bold bg-primary/10 text-primary border-primary/30"
              >
                {displayRole}
              </Badge>
              {userGroup && !userIsGroupLeader && (
                <Badge
                  variant="outline"
                  className="text-xs font-semibold bg-muted/60 text-muted-foreground border-border gap-1"
                >
                  <FolderOpen size={11} className="text-primary" />
                  <span>{userGroup.name}</span>
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5 font-bold text-foreground">
                <Building2 size={15} className="text-primary shrink-0" />
                {congregation?.name || 'Congregation Workspace'}
              </span>
              {congregation?.city && <span>• {congregation.city}</span>}
              <span className="hidden md:inline text-muted-foreground/80">
                {isExecutiveTier
                  ? '— Ministry oversight, activity reports & group arrangements'
                  : isTerritoryServantTier
                    ? '— Territory checkout inventory & coordinate maintenance'
                    : isGroupLeaderTier
                      ? `— ${ledGroup?.name || 'Service Group'} field service & publisher support`
                      : '— Field ministry territory & visit tracking'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {isExecutiveTier ? (
              <>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-2xl text-xs font-semibold gap-1.5 shadow-2xs h-9 px-3.5 bg-card/80 hover:bg-muted border-border shrink-0"
                >
                  <Link href={`/congregation/${congregationId}/reports`}>
                    <BarChart3 size={14} className="text-primary" />
                    <span>Reports</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-2xl text-xs font-semibold gap-1.5 shadow-2xs h-9 px-3.5 bg-card/80 hover:bg-muted border-border shrink-0"
                >
                  <Link href={`/congregation/${congregationId}/groups`}>
                    <FolderOpen size={14} className="text-primary" />
                    <span>Groups</span>
                  </Link>
                </Button>
              </>
            ) : isTerritoryServantTier ? (
              <>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-2xl text-xs font-semibold gap-1.5 shadow-2xs h-9 px-3.5 bg-card/80 hover:bg-muted border-border shrink-0"
                >
                  <Link href={`/congregation/${congregationId}/territories`}>
                    <Compass size={14} className="text-primary" />
                    <span>Manage Territories</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-2xl text-xs font-semibold gap-1.5 shadow-2xs h-9 px-3.5 bg-card/80 hover:bg-muted border-border shrink-0"
                >
                  <Link href={`/congregation/${congregationId}/territories/overview`}>
                    <MapPin size={14} className="text-primary" />
                    <span>Overview Map</span>
                  </Link>
                </Button>
              </>
            ) : isGroupLeaderTier ? (
              <Button
                asChild
                variant="outline"
                className="rounded-2xl text-xs font-semibold gap-1.5 shadow-2xs h-9 px-3.5 bg-card/80 hover:bg-muted border-border shrink-0"
              >
                <Link href={`/congregation/${congregationId}/groups`}>
                  <FolderOpen size={14} className="text-primary" />
                  <span>Manage {ledGroup?.name || 'Group'}</span>
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="rounded-2xl text-xs font-semibold gap-1.5 shadow-2xs h-9 px-3.5 bg-card/80 hover:bg-muted border-border shrink-0"
              >
                <Link href={`/congregation/${congregationId}/territories?status=available`}>
                  <Compass size={14} className="text-primary" />
                  <span>Available Zones</span>
                </Link>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => tour.startTour()}
              className="rounded-2xl text-xs font-semibold gap-1.5 h-9 px-3 bg-card/80 hover:bg-muted border-border hover:border-primary/40 transition-all cursor-pointer shrink-0"
              title="Start guided tour"
            >
              <Sparkles size={14} className="text-amber-500" />
              <span>Tour Guide</span>
            </Button>
          </div>
        </div>

        {/* Quick Ministry Action Shortcuts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {isExecutiveTier ? (
            <>
              <Link
                href={`/congregation/${congregationId}/reports`}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-blue-500/40 hover:bg-muted/50 hover:shadow-xs transition-all group"
              >
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                  <BarChart3 size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate group-hover:text-blue-600 transition-colors">
                    Ministry Reports
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">Activity & S-13</p>
                </div>
              </Link>

              <Link
                href={`/congregation/${congregationId}/groups`}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-purple-500/40 hover:bg-muted/50 hover:shadow-xs transition-all group"
              >
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                  <FolderOpen size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate group-hover:text-purple-600 transition-colors">
                    Service Groups
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {groups.length} groups arranged
                  </p>
                </div>
              </Link>

              <Link
                href={`/congregation/${congregationId}/members`}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-emerald-500/40 hover:bg-muted/50 hover:shadow-xs transition-all group"
              >
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                  <Users size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate group-hover:text-emerald-600 transition-colors">
                    Publishers
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {members.length} members
                  </p>
                </div>
              </Link>

              <Link
                href={`/congregation/${congregationId}/territories/overview`}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-amber-500/40 hover:bg-muted/50 hover:shadow-xs transition-all group"
              >
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                  <Compass size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate group-hover:text-amber-600 transition-colors">
                    Congregation Map
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">All boundary zones</p>
                </div>
              </Link>
            </>
          ) : isTerritoryServantTier ? (
            <>
              <Link
                href={`/congregation/${congregationId}/territories`}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:bg-muted/50 hover:shadow-xs transition-all group"
              >
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                  <Compass size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    All Territories
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {territories.length} total zones
                  </p>
                </div>
              </Link>

              <Link
                href={`/congregation/${congregationId}/territories?status=overdue`}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-red-500/40 hover:bg-muted/50 hover:shadow-xs transition-all group"
              >
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 group-hover:scale-105 transition-transform">
                  <Clock size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate group-hover:text-rose-600 transition-colors">
                    Overdue Zones
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {overdueTerritoriesCount} &gt;4 months
                  </p>
                </div>
              </Link>

              <Link
                href={`/congregation/${congregationId}/records/households?filter=unpinned&scope=congregation`}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-amber-500/40 hover:bg-muted/50 hover:shadow-xs transition-all group"
              >
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                  <MapPin size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-foreground truncate group-hover:text-amber-600 transition-colors">
                      Pin Doors
                    </p>
                    {totalCongregationUnpinnedCount > 0 && (
                      <Badge className="text-[9px] px-1.5 py-0 h-4 bg-amber-500 text-white font-bold">
                        {totalCongregationUnpinnedCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {totalCongregationUnpinnedCount > 0
                      ? `${totalCongregationUnpinnedCount} need coordinates`
                      : 'All pinned'}
                  </p>
                </div>
              </Link>

              <Link
                href={`/congregation/${congregationId}/territories/overview`}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-blue-500/40 hover:bg-muted/50 hover:shadow-xs transition-all group"
              >
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                  <Compass size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate group-hover:text-blue-600 transition-colors">
                    Overview Map
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">Boundary zones</p>
                </div>
              </Link>
            </>
          ) : isGroupLeaderTier ? (
            <>
              {groupActiveAssignments.length > 0 && groupActiveAssignments[0]?.territoryId ? (
                <Link
                  href={`/congregation/${congregationId}/territories/${groupActiveAssignments[0].territoryId}`}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:bg-muted/50 hover:shadow-xs transition-all group"
                >
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                    <MapPin size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      Group Map
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      #{groupActiveAssignments[0].territoryNumber || 'Active'} Studio
                    </p>
                  </div>
                </Link>
              ) : (
                <Link
                  href={`/congregation/${congregationId}/territories?status=available`}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:bg-muted/50 hover:shadow-xs transition-all group"
                >
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                    <Compass size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      Available Zones
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {availableTerritories.length} for checkout
                    </p>
                  </div>
                </Link>
              )}

              <Link
                href={`/congregation/${congregationId}/groups`}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-purple-500/40 hover:bg-muted/50 hover:shadow-xs transition-all group"
              >
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                  <Users size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate group-hover:text-purple-600 transition-colors">
                    Group Roster
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {ledGroup?.members?.length || 0} publishers
                  </p>
                </div>
              </Link>

              <Link
                href={`/congregation/${congregationId}/records/households?filter=unpinned&scope=group`}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-amber-500/40 hover:bg-muted/50 hover:shadow-xs transition-all group"
              >
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                  <MapPin size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-foreground truncate group-hover:text-amber-600 transition-colors">
                      Pin Group Doors
                    </p>
                    {groupUnpinnedCount > 0 && (
                      <Badge className="text-[9px] px-1.5 py-0 h-4 bg-amber-500 text-white font-bold">
                        {groupUnpinnedCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {groupUnpinnedCount > 0
                      ? `${groupUnpinnedCount} in group zones`
                      : 'All pinned'}
                  </p>
                </div>
              </Link>

              <Link
                href={`/congregation/${congregationId}/groups`}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-blue-500/40 hover:bg-muted/50 hover:shadow-xs transition-all group"
              >
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                  <FolderOpen size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate group-hover:text-blue-600 transition-colors">
                    {ledGroup?.name || 'Group'} Hub
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Territory & arrangements
                  </p>
                </div>
              </Link>
            </>
          ) : (
            // Publisher Tier
            <>
              {activeAssignments.length > 0 && activeAssignments[0]?.territoryId ? (
                <Link
                  href={`/congregation/${congregationId}/territories/${activeAssignments[0].territoryId}`}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:bg-muted/50 hover:shadow-xs transition-all group"
                >
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                    <MapPin size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      Territory Map
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      #{activeAssignments[0].territoryNumber || 'Active'} Studio
                    </p>
                  </div>
                </Link>
              ) : (
                <Link
                  href={`/congregation/${congregationId}/territories?status=available`}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:bg-muted/50 hover:shadow-xs transition-all group"
                >
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                    <Compass size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      Available Zones
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {availableTerritories.length} for checkout
                    </p>
                  </div>
                </Link>
              )}

              <Link
                href={`/congregation/${congregationId}/records/visits`}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-emerald-500/40 hover:bg-muted/50 hover:shadow-xs transition-all group"
              >
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                  <CheckCircle2 size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate group-hover:text-emerald-600 transition-colors">
                    Visit History
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">Door-to-door logs</p>
                </div>
              </Link>

              <Link
                href={`/congregation/${congregationId}/records/households?filter=unpinned&scope=mine`}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-amber-500/40 hover:bg-muted/50 hover:shadow-xs transition-all group"
              >
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                  <MapPin size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-foreground truncate group-hover:text-amber-600 transition-colors">
                      Pin Doors
                    </p>
                    {myUnpinnedDoorsCount > 0 && (
                      <Badge className="text-[9px] px-1.5 py-0 h-4 bg-amber-500 text-white font-bold">
                        {myUnpinnedDoorsCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {myUnpinnedDoorsCount > 0
                      ? `${myUnpinnedDoorsCount} in your territory`
                      : 'All pinned'}
                  </p>
                </div>
              </Link>

              {userGroup ? (
                <Link
                  href={`/congregation/${congregationId}/groups`}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-purple-500/40 hover:bg-muted/50 hover:shadow-xs transition-all group"
                >
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                    <FolderOpen size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate group-hover:text-purple-600 transition-colors">
                      Service Group
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{userGroup.name}</p>
                  </div>
                </Link>
              ) : (
                <Link
                  href={`/congregation/${congregationId}/records/households`}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-purple-500/40 hover:bg-muted/50 hover:shadow-xs transition-all group"
                >
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                    <Home size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate group-hover:text-purple-600 transition-colors">
                      Households
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {households.length} door records
                    </p>
                  </div>
                </Link>
              )}
            </>
          )}
        </div>

        {/* Interactive Stats Grid */}
        <div data-tour="stats-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {isExecutiveTier ? (
            <>
              <StatCard
                title="Territory Progress"
                value={`${congregationCoveragePercent}%`}
                description={`${workedDoorsCount} of ${totalDoorsCount} doors worked`}
                icon={TrendingUp}
                color="blue"
                href={`/congregation/${congregationId}/reports`}
              />
              <StatCard
                title="Active in Work"
                value={inWorkTerritoriesCount}
                description={`${overdueTerritoriesCount} overdue (>4 mos)`}
                icon={Compass}
                color="green"
                href={`/congregation/${congregationId}/territories?status=assigned`}
              />
              <StatCard
                title="Publishers"
                value={members.length}
                description={`Across ${groups.length} service groups`}
                icon={Users}
                color="purple"
                href={`/congregation/${congregationId}/members`}
              />
              <StatCard
                title="Door Records"
                value={households.length}
                description={
                  totalCongregationUnpinnedCount > 0
                    ? `📍 ${totalCongregationUnpinnedCount} need coordinates`
                    : 'All doors pinned on map'
                }
                icon={Home}
                color={totalCongregationUnpinnedCount > 0 ? 'orange' : 'gray'}
                href={`/congregation/${congregationId}/records/households`}
              />
            </>
          ) : isTerritoryServantTier ? (
            <>
              <StatCard
                title="Total Territories"
                value={territoriesLoading ? '—' : territories.length}
                description={`${availableTerritories.length} available to assign`}
                icon={Compass}
                color="blue"
                loading={territoriesLoading}
                href={`/congregation/${congregationId}/territories?status=available`}
              />
              <StatCard
                title="Active in Work"
                value={inWorkTerritoriesCount}
                description="Checked out to publishers"
                icon={MapPin}
                color="green"
                href={`/congregation/${congregationId}/territories?status=assigned`}
              />
              <StatCard
                title="Overdue Zones"
                value={overdueTerritoriesCount}
                description="Active >4 months"
                icon={Clock}
                color={overdueTerritoriesCount > 0 ? 'red' : 'gray'}
                href={`/congregation/${congregationId}/territories?status=overdue`}
              />
              <StatCard
                title="Needs Pinning"
                value={totalCongregationUnpinnedCount}
                description="Unpinned door coordinates"
                icon={AlertCircle}
                color={totalCongregationUnpinnedCount > 0 ? 'orange' : 'green'}
                href={`/congregation/${congregationId}/records/households?filter=unpinned&scope=congregation`}
              />
            </>
          ) : isGroupLeaderTier ? (
            <>
              <StatCard
                title="Group Territories"
                value={groupActiveAssignments.length}
                description={`Active in ${ledGroup?.name || 'Group'}`}
                icon={Compass}
                color="blue"
                href={`/congregation/${congregationId}/territories`}
              />
              <StatCard
                title="Group Publishers"
                value={ledGroup?.members?.length || 0}
                description={`Members in ${ledGroup?.name || 'Group'}`}
                icon={Users}
                color="purple"
                href={`/congregation/${congregationId}/groups`}
              />
              <StatCard
                title="Group Doors"
                value={groupHouseholds.length}
                description={`${groupCoverage.workedDoors} worked (${groupCoverage.coveragePercent}%)`}
                icon={Home}
                color="green"
                href={`/congregation/${congregationId}/records/households`}
              />
              <StatCard
                title="Group Follow-ups"
                value={groupReturnVisits.length}
                description="Return visits in group"
                icon={UserCheck}
                color={groupReturnVisits.length > 0 ? 'orange' : 'gray'}
                href={`/congregation/${congregationId}/records/households?filter=return_visit`}
              />
            </>
          ) : (
            // Publisher Tier
            <>
              <StatCard
                title="Available Zones"
                value={territoriesLoading ? '—' : availableTerritories.length}
                description="Available for checkout"
                icon={Compass}
                color="blue"
                loading={territoriesLoading}
                href={`/congregation/${congregationId}/territories?status=available`}
              />
              <StatCard
                title="My Assignments"
                value={assignmentsLoading ? '—' : activeAssignments.length}
                description="Active territories in work"
                icon={MapPin}
                color="green"
                loading={assignmentsLoading}
                href={`/congregation/${congregationId}/my-assignments`}
              />
              <StatCard
                title="My Door Records"
                value={myUnpinnedDoorsCount > 0 ? `${myUnpinnedDoorsCount} To Pin` : 'All Pinned'}
                description={
                  myUnpinnedDoorsCount > 0
                    ? `📍 Needs pinning in your zone`
                    : 'Coordinates set on map'
                }
                icon={Home}
                color={myUnpinnedDoorsCount > 0 ? 'orange' : 'purple'}
                href={`/congregation/${congregationId}/records/households?filter=unpinned&scope=mine`}
              />
              <StatCard
                title="My Service Group"
                value={userGroup?.name || 'Service Group'}
                description={`${userGroup?.members?.length || 0} publishers`}
                icon={FolderOpen}
                color="gray"
                href={`/congregation/${congregationId}/groups`}
              />
            </>
          )}
        </div>

        {/* Progress Gauge: Congregation-wide for Executive/Servant, Group-scoped for Group Leader */}
        {(isExecutiveTier || isTerritoryServantTier) && (
          <Card
            data-tour="congregation-coverage"
            className="bg-card border-border shadow-xs overflow-hidden"
          >
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground tracking-tight">
                      Congregation Territory Campaign Progress
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {workedDoorsCount} of {totalDoorsCount} door records worked in field service
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-xs font-bold px-2.5 py-0.5 border-primary/30 text-primary bg-primary/5"
                  >
                    {congregationCoveragePercent}% Worked
                  </Badge>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="space-y-1.5">
                <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-primary transition-all duration-500 rounded-full"
                    style={{ width: `${congregationCoveragePercent}%` }}
                  />
                </div>
              </div>

              {/* Quick Status Filters */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <Link
                  href={`/congregation/${congregationId}/territories?status=available`}
                  className="p-2.5 rounded-xl bg-background border border-border hover:border-emerald-500/40 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all block group"
                >
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                    {availableTerritories.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Available to Assign</p>
                </Link>
                <Link
                  href={`/congregation/${congregationId}/territories?status=assigned`}
                  className="p-2.5 rounded-xl bg-background border border-border hover:border-blue-500/40 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all block group"
                >
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                    {inWorkTerritoriesCount}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Active in Work</p>
                </Link>
                <Link
                  href={`/congregation/${congregationId}/territories?status=overdue`}
                  className="p-2.5 rounded-xl bg-background border border-border hover:border-rose-500/40 hover:bg-rose-50/20 dark:hover:bg-rose-950/20 transition-all block group"
                >
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
                    {overdueTerritoriesCount}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Overdue (&gt;4 mos)</p>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {isGroupLeaderTier && (
          <Card
            data-tour="congregation-coverage"
            className="bg-card border-border shadow-xs overflow-hidden"
          >
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                    <FolderOpen size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground tracking-tight">
                      {ledGroup?.name || 'Service Group'} Territory Progress
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {groupCoverage.workedDoors} of {groupCoverage.totalDoors} doors completed in
                      group zones
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-xs font-bold px-2.5 py-0.5 border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/30"
                  >
                    {groupCoverage.coveragePercent}% Completed
                  </Badge>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="space-y-1.5">
                <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-purple-600 dark:bg-purple-500 transition-all duration-500 rounded-full"
                    style={{ width: `${groupCoverage.coveragePercent}%` }}
                  />
                </div>
              </div>

              {/* Group Quick Status Filters */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <Link
                  href={`/congregation/${congregationId}/territories`}
                  className="p-2.5 rounded-xl bg-background border border-border hover:border-purple-500/40 hover:bg-purple-50/20 dark:hover:bg-purple-950/20 transition-all block group"
                >
                  <p className="text-xs font-bold text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                    {groupActiveAssignments.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Group Active Zones</p>
                </Link>
                <Link
                  href={`/congregation/${congregationId}/records/households`}
                  className="p-2.5 rounded-xl bg-background border border-border hover:border-blue-500/40 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all block group"
                >
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                    {groupHouseholds.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Group Doors</p>
                </Link>
                <Link
                  href={`/congregation/${congregationId}/records/households?filter=return_visit`}
                  className="p-2.5 rounded-xl bg-background border border-border hover:border-emerald-500/40 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all block group"
                >
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                    {groupReturnVisits.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Group Follow-ups</p>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main 2-Column Action & Record Hub */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Active Assignments + Return Visits */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Working Territories */}
            <Card
              data-tour="active-assignments"
              className="bg-card border-border shadow-xs overflow-hidden"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Compass size={16} className="text-primary" />
                  <span>
                    {isGroupLeaderTier
                      ? `${ledGroup?.name || 'Group'} Territory in Work`
                      : 'Territory In Work'}
                  </span>
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="text-xs h-8">
                  <Link
                    href={
                      isGroupLeaderTier
                        ? `/congregation/${congregationId}/territories`
                        : `/congregation/${congregationId}/my-assignments`
                    }
                  >
                    View All (
                    {isGroupLeaderTier
                      ? groupActiveAssignments.length
                      : activeAssignments.length}
                    )
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {assignmentsLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
                    ))}
                  </div>
                ) : (isGroupLeaderTier ? groupActiveAssignments.length === 0 : activeAssignments.length === 0) ? (
                  <div className="text-center py-8 px-4 rounded-2xl bg-muted/20 border border-dashed border-border">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                      <Compass size={24} />
                    </div>
                    <p className="text-sm font-bold text-foreground">Ready for field ministry?</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                      {isGroupLeaderTier
                        ? `No active territories are currently checked out in ${ledGroup?.name || 'your group'}. Check out a territory for your group to work together.`
                        : "You don't have any active territories checked out right now. Browse available zones or check your return visits."}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                      <Button
                        asChild
                        size="sm"
                        className="rounded-xl text-xs font-semibold gap-1.5 shadow-xs"
                      >
                        <Link href={`/congregation/${congregationId}/territories?status=available`}>
                          <Compass size={14} />
                          <span>Browse Available Territories</span>
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs font-semibold"
                      >
                        <Link href={`/congregation/${congregationId}/records/households`}>
                          <span>View Door Records</span>
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {(isGroupLeaderTier ? groupActiveAssignments : activeAssignments).map(
                      (assignment, idx) => {
                        const terr = territoryMap.get(assignment.territoryId);
                        const number = terr?.number || assignment.territoryNumber || '—';
                        const name = terr?.name || assignment.territoryName || 'Territory';
                        const cov = coverageByTerritoryId.get(assignment.territoryId) || {
                          totalDoors: 0,
                          workedDoors: 0,
                          coveragePercent: 0,
                        };
                        const isGroupAssignment = Boolean(assignment.serviceGroupId);
                        const assignedGroup = groups.find(
                          (g) => g.id === assignment.serviceGroupId
                        );

                        return (
                          <div
                            key={assignment.id}
                            className={`space-y-3.5 ${
                              idx > 0 ? 'pt-4 border-t border-border/60' : ''
                            }`}
                          >
                            {/* Main Row: Title & Subtitle + Action Button */}
                            <div className="flex items-start justify-between gap-3 min-w-0">
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                  <Link
                                    href={`/congregation/${congregationId}/territories/${assignment.territoryId}`}
                                    className="font-bold text-base sm:text-lg text-foreground hover:text-primary transition-colors truncate"
                                    title={`#${number} — ${name}`}
                                  >
                                    #{number} — {name}
                                  </Link>
                                  {isGroupAssignment && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 border-purple-200 gap-1 shrink-0"
                                    >
                                      <FolderOpen size={10} />
                                      <span>{assignedGroup?.name || 'Group'}</span>
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                                  {terr?.city && (
                                    <>
                                      <span className="truncate">{terr.city}</span>
                                      <span>•</span>
                                    </>
                                  )}
                                  <span>
                                    Assigned{' '}
                                    {assignment.assignedAt
                                      ? formatDaysAgo(assignment.assignedAt)
                                      : 'recently'}
                                  </span>
                                </p>
                              </div>

                              <Button
                                asChild
                                size="sm"
                                className="rounded-xl text-xs gap-1.5 shrink-0 shadow-xs h-9 px-3.5"
                              >
                                <Link
                                  href={`/congregation/${congregationId}/territories/${assignment.territoryId}`}
                                >
                                  <MapPin size={14} />
                                  <span>Open Map</span>
                                </Link>
                              </Button>
                            </div>

                            {/* Full-width Door Progress Bar */}
                            {cov.totalDoors > 0 ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                                  <span className="font-semibold text-foreground">
                                    {cov.coveragePercent}% Completed
                                  </span>
                                  <span>
                                    {cov.workedDoors} of {cov.totalDoors} doors worked
                                  </span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: `${cov.coveragePercent}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                                <span>No door records registered yet</span>
                                <Link
                                  href={`/congregation/${congregationId}/territories/${assignment.territoryId}`}
                                  className="text-primary hover:underline text-xs font-semibold"
                                >
                                  Add first door →
                                </Link>
                              </div>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Return Visits & Follow-Up Reminders (Role Scoped) */}
            {((isGroupLeaderTier ? groupReturnVisits : myReturnVisits).length > 0) && (
              <Card className="bg-card border-border shadow-xs overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <UserCheck size={16} className="text-purple-600 dark:text-purple-400" />
                    <span>
                      {isGroupLeaderTier
                        ? `${ledGroup?.name || 'Group'} Return Visits & Follow-ups`
                        : 'My Return Visits & Follow-ups'}
                    </span>
                  </CardTitle>
                  <Button asChild variant="ghost" size="sm" className="text-xs h-8">
                    <Link
                      href={
                        isGroupLeaderTier
                          ? `/congregation/${congregationId}/records/households?filter=return_visit`
                          : `/congregation/${congregationId}/records/households?filter=return_visit`
                      }
                    >
                      View All
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {(isGroupLeaderTier ? groupReturnVisits : myReturnVisits).map((h) => {
                    const terr = h.territoryId ? territoryMap.get(h.territoryId) : null;
                    return (
                      <div
                        key={h.id}
                        className="p-3 rounded-2xl border border-border bg-background flex items-center justify-between gap-3 hover:border-purple-400/40 transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/congregation/${congregationId}/records/households/${h.id}`}
                              className="font-bold text-xs text-foreground hover:text-primary transition-colors truncate"
                            >
                              {h.houseNumber ? `#${h.houseNumber} ` : ''}
                              {h.streetName || h.address || 'Household'}
                            </Link>
                            <Badge
                              variant="outline"
                              className="text-[9px] uppercase font-bold text-purple-700 bg-purple-50 dark:bg-purple-950/40 border-purple-200"
                            >
                              {h.status === 'return_visit' ? 'Return Visit' : h.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {terr ? `#${terr.number} — ${terr.name} • ` : ''}
                            {h.lastVisitDate
                              ? `Visited ${timeAgo(h.lastVisitDate)}`
                              : 'No recent visit'}
                          </p>
                          {h.notes && (
                            <p className="text-[10px] text-muted-foreground/80 italic line-clamp-1 mt-0.5">
                              &ldquo;{h.notes}&rdquo;
                            </p>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLogVisitHousehold(h)}
                          className="rounded-xl text-xs gap-1 h-8 px-2.5 shrink-0 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950/40"
                        >
                          <Plus size={12} />
                          <span>Log Visit</span>
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Column 3: Records Hub Navigator & Quick Links */}
          <div className="space-y-6">
            {/* Records Hub (Role Tailored) */}
            <Card data-tour="records-hub" className="bg-card border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText size={16} className="text-primary" />
                  <span>
                    {isExecutiveTier
                      ? 'Executive & Reports Hub'
                      : isTerritoryServantTier
                        ? 'Territory Management Hub'
                        : isGroupLeaderTier
                          ? `${ledGroup?.name || 'Group'} Records Hub`
                          : 'Records & Directory'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isExecutiveTier ? (
                  <>
                    <Link
                      href={`/congregation/${congregationId}/reports`}
                      className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                          <BarChart3 size={15} />
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                            Monthly Ministry Reports
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Activity & S-13/S-89 records
                          </p>
                        </div>
                      </div>
                      <ArrowRight
                        size={14}
                        className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                      />
                    </Link>

                    <Link
                      href={`/congregation/${congregationId}/groups`}
                      className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                          <FolderOpen size={15} />
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-foreground group-hover:text-purple-600 transition-colors">
                            Service Groups Management
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {groups.length} groups arranged
                          </p>
                        </div>
                      </div>
                      <ArrowRight
                        size={14}
                        className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                      />
                    </Link>

                    <Link
                      href={`/congregation/${congregationId}/members`}
                      className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                          <Users size={15} />
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-foreground group-hover:text-emerald-600 transition-colors">
                            Publisher Directory
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {members.length} active publishers
                          </p>
                        </div>
                      </div>
                      <ArrowRight
                        size={14}
                        className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                      />
                    </Link>
                  </>
                ) : isTerritoryServantTier ? (
                  <>
                    <Link
                      href={`/congregation/${congregationId}/territories`}
                      className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                          <Compass size={15} />
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                            All Territories Inventory
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {territories.length} territory zones
                          </p>
                        </div>
                      </div>
                      <ArrowRight
                        size={14}
                        className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                      />
                    </Link>

                    <Link
                      href={`/congregation/${congregationId}/territories?status=overdue`}
                      className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-rose-500/30 transition-all group"
                    >
                      <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
                        <Clock size={15} />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-foreground group-hover:text-rose-600 transition-colors">
                          Overdue Territories
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {overdueTerritoriesCount} active &gt;4 months
                        </p>
                      </div>
                      <ArrowRight
                        size={14}
                        className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                      />
                    </Link>

                    <Link
                      href={`/congregation/${congregationId}/records/households?filter=unpinned&scope=congregation`}
                      className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-amber-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                          <MapPin size={15} />
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-foreground group-hover:text-amber-600 transition-colors">
                            Coordinate Cleanup
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {totalCongregationUnpinnedCount} unpinned doors
                          </p>
                        </div>
                      </div>
                      <ArrowRight
                        size={14}
                        className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                      />
                    </Link>
                  </>
                ) : isGroupLeaderTier ? (
                  <>
                    <Link
                      href={`/congregation/${congregationId}/records/households`}
                      className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                          <Home size={15} />
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                            Group Household Records
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {groupHouseholds.length} door records
                          </p>
                        </div>
                      </div>
                      <ArrowRight
                        size={14}
                        className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                      />
                    </Link>

                    <Link
                      href={`/congregation/${congregationId}/records/visits`}
                      className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                          <CheckCircle2 size={15} />
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-foreground group-hover:text-emerald-600 transition-colors">
                            Group Visit Logs
                          </p>
                          <p className="text-[10px] text-muted-foreground">Field activity</p>
                        </div>
                      </div>
                      <ArrowRight
                        size={14}
                        className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                      />
                    </Link>

                    <Link
                      href={`/congregation/${congregationId}/records/shared`}
                      className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                          <Users size={15} />
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-foreground group-hover:text-purple-600 transition-colors">
                            Group Shared Records
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Collaborate in {ledGroup?.name || 'Group'}
                          </p>
                        </div>
                      </div>
                      <ArrowRight
                        size={14}
                        className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                      />
                    </Link>
                  </>
                ) : (
                  // Publisher Tier
                  <>
                    <Link
                      href={`/congregation/${congregationId}/records/households`}
                      className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                          <Home size={15} />
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                            Household Directory
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {households.length} door records
                          </p>
                        </div>
                      </div>
                      <ArrowRight
                        size={14}
                        className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                      />
                    </Link>

                    <Link
                      href={`/congregation/${congregationId}/records/visits`}
                      className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                          <CheckCircle2 size={15} />
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-foreground group-hover:text-emerald-600 transition-colors">
                            Visit History
                          </p>
                          <p className="text-[10px] text-muted-foreground">Door-to-door logs</p>
                        </div>
                      </div>
                      <ArrowRight
                        size={14}
                        className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                      />
                    </Link>

                    <Link
                      href={`/congregation/${congregationId}/records/shared`}
                      className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                          <Users size={15} />
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-foreground group-hover:text-purple-600 transition-colors">
                            Shared Records
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Collaborate with publishers
                          </p>
                        </div>
                      </div>
                      <ArrowRight
                        size={14}
                        className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                      />
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Ministry Resources & Help (Role Tailored) */}
            <Card className="bg-card border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" />
                  <span>Ministry Resources</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link
                  href={`/congregation/${congregationId}/territories/overview`}
                  className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                      <Compass size={15} />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                        Congregation Map
                      </p>
                      <p className="text-[10px] text-muted-foreground">All boundary zones</p>
                    </div>
                  </div>
                  <ArrowRight
                    size={14}
                    className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                  />
                </Link>

                {isGroupLeaderTier ? (
                  <Link
                    href={`/congregation/${congregationId}/groups`}
                    className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                        <FolderOpen size={15} />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-foreground group-hover:text-purple-600 transition-colors">
                          Manage {ledGroup?.name || 'Group'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {ledGroup?.members?.length || 0} publishers in roster
                        </p>
                      </div>
                    </div>
                    <ArrowRight
                      size={14}
                      className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                    />
                  </Link>
                ) : (
                  <Link
                    href={`/congregation/${congregationId}/groups`}
                    className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                        <FolderOpen size={15} />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                          Service Groups
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {groups.length} groups arranged
                        </p>
                      </div>
                    </div>
                    <ArrowRight
                      size={14}
                      className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                    />
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => tour.startTour()}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                      <HelpCircle size={15} />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                        Tour Guide
                      </p>
                      <p className="text-[10px] text-muted-foreground">Interactive walkthrough</p>
                    </div>
                  </div>
                  <Sparkles size={14} className="text-amber-500" />
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Household Quick Log Visit Sheet */}
      {logVisitHousehold && (
        <HouseholdLogVisitSheet
          open={Boolean(logVisitHousehold)}
          onOpenChange={(open) => {
            if (!open) setLogVisitHousehold(null);
          }}
          household={logVisitHousehold}
          assignmentId={logVisitHousehold.territoryId || null}
          onSaved={() => setLogVisitHousehold(null)}
        />
      )}

      <BottomTabBar />
      <DashboardTourGuide
        isOpen={tour.isOpen}
        currentStepIndex={tour.currentStepIndex}
        totalSteps={tour.totalSteps}
        activeStep={tour.activeStep}
        isFirstStep={tour.isFirstStep}
        isLastStep={tour.isLastStep}
        progressPercent={tour.progressPercent}
        steps={tour.steps}
        onNext={tour.nextStep}
        onPrev={tour.prevStep}
        onGoToStep={tour.goToStep}
        onSkip={tour.skipTour}
        onComplete={tour.completeTour}
      />
    </ProtectedPage>
  );
}
