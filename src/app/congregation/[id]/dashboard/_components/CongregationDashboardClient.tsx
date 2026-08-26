'use client';

import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  FolderOpen,
  HelpCircle,
  Home,
  Info,
  MapPin,
  Plus,
  RotateCcw,
  Sparkles,
  TrendingUp,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardTourGuide } from '@/components/dashboard-tour-guide';
import { HouseholdLogVisitSheet } from '@/components/households/household-action-sheets';
import { ProtectedPage } from '@/components/protected-page';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { StatCard } from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCongregation,
  useCongregationGroups,
  useCongregationMembers,
  useCongregationTerritories,
  useCurrentUser,
  useDashboardTour,
  useHouseholds,
  useMyAssignments,
  useReturnAssignment,
} from '@/hooks';
import { formatDate, formatDaysAgo } from '@/lib/date-utils';
import {
  canAdjustAssignmentDates,
  canCreateTerritory,
  canReturnAssignment,
  canViewAllCongregationRecords,
  filterActiveAssignments,
  getUserGroupIds,
  resolveUserAssignments,
} from '@/lib/permissions';
import { calculateTerritoryCoverage } from '@/lib/territory-coverage';
import { timeAgo } from '@/lib/time-ago';
import type { Assignment, Household } from '@/types/api';

function getAssignmentPacing(assignedAt?: string | null) {
  if (!assignedAt) return { label: 'Assigned recently', isOverdue: false, isWarning: false };
  const assignedTime = new Date(assignedAt).getTime();
  if (Number.isNaN(assignedTime))
    return { label: 'Assigned recently', isOverdue: false, isWarning: false };
  const elapsedDays = Math.max(
    0,
    Math.floor((Date.now() - assignedTime) / (1000 * 60 * 60 * 24))
  );
  const termDays = 120; // 4-month cycle
  const remainingDays = termDays - elapsedDays;
  if (elapsedDays > termDays) {
    return {
      label: `⚠️ Overdue (${elapsedDays}d active)`,
      isOverdue: true,
      isWarning: false,
      elapsedDays,
    };
  }
  if (remainingDays <= 30) {
    return {
      label: `⏳ ${remainingDays}d remaining`,
      isOverdue: false,
      isWarning: true,
      elapsedDays,
    };
  }
  return {
    label: `⚡ On Track (~${remainingDays}d remaining)`,
    isOverdue: false,
    isWarning: false,
    elapsedDays,
  };
}

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

  // Quick Visit Sheet & Return Confirmation state
  const [logVisitHousehold, setLogVisitHousehold] = useState<Household | null>(null);
  const [returnConfirmAssignment, setReturnConfirmAssignment] = useState<Assignment | null>(null);
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const { returnTerritory, isPending: returning } = useReturnAssignment();
  const canAdjust = canAdjustAssignmentDates(user?.role, user?.congregationRole);

  const tour = useDashboardTour({
    userId: user.id,
    autoStart: true,
  });

  const territoryMap = useMemo(() => {
    return new Map(territories.map((t) => [t.id, t]));
  }, [territories]);

  // Real-time door counts, coverage, return visits, and unpinned doors per territory
  const territoryStatsById = useMemo(() => {
    const map = new Map<
      string,
      {
        totalDoors: number;
        workedDoors: number;
        unworkedDoors: number;
        coveragePercent: number;
        returnVisitsCount: number;
        unpinnedCount: number;
      }
    >();
    const byTerritory = new Map<string, Household[]>();
    for (const h of households) {
      if (h.territoryId) {
        if (!byTerritory.has(h.territoryId)) byTerritory.set(h.territoryId, []);
        byTerritory.get(h.territoryId)?.push(h);
      }
    }
    for (const [tId, hList] of byTerritory.entries()) {
      const cov = calculateTerritoryCoverage(hList);
      const returnVisits = hList.filter((h) => h.status === 'return_visit').length;
      const unpinned = hList.filter((h) => !h.latitude || !h.longitude).length;
      map.set(tId, {
        totalDoors: cov.totalDoors,
        workedDoors: cov.workedDoors,
        unworkedDoors: cov.unworkedDoors,
        coveragePercent: cov.coveragePercent,
        returnVisitsCount: returnVisits,
        unpinnedCount: unpinned,
      });
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

  const displayRole = (() => {
    const r = (user.congregationRole || user.role || '').toUpperCase().replace(/\s+/g, '_');
    if (r === 'SUPER_ADMIN') return 'Super Admin';
    if (r === 'ADMIN') return 'Admin';
    if (r === 'CIRCUIT_OVERSEER') return 'Circuit Overseer';
    if (r === 'SERVICE_OVERSEER') return 'Service Overseer';
    if (r === 'SECRETARY' || r === 'CONGREGATION_SECRETARY') return 'Secretary';
    if (r === 'TERRITORY_SERVANT') return 'Territory Servant';
    if (r === 'VISITING_PUBLISHER') return 'Visiting Publisher';
    return 'Publisher';
  })();

  const isManager =
    canCreateTerritory(user.role, user.congregationRole) ||
    canViewAllCongregationRecords(user.role, user.congregationRole);

  const canManageTerritories = canCreateTerritory(user.role, user.congregationRole);

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
    if (total === 0) return { totalDoorsCount: 0, workedDoorsCount: 0, congregationCoveragePercent: 0 };
    const worked = households.filter((h) => {
      if (!h) return false;
      if (h.lastVisitDate) return true;
      if (typeof h.totalVisitsCount === 'number' && h.totalVisitsCount > 0) return true;
      if (h.status && h.status.trim().toLowerCase() !== 'new') return true;
      return false;
    }).length;
    const percent = Math.min(100, Math.max(0, Math.round((worked / total) * 100)));
    return { totalDoorsCount: total, workedDoorsCount: worked, congregationCoveragePercent: percent };
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
              {userGroup && (
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
                — Field ministry territory & visit tracking
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {canManageTerritories && (
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
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => tour.startTour()}
              className="rounded-2xl text-xs font-semibold gap-1.5 h-9 px-3 bg-card/80 hover:bg-muted border-border hover:border-primary/40 transition-all cursor-pointer shrink-0"
              title="Start guided tour of Kanataran"
            >
              <Sparkles size={14} className="text-amber-500" />
              <span>Tour Guide</span>
            </Button>
          </div>
        </div>

        {/* Quick Ministry Action Shortcuts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              <p className="text-xs font-bold text-foreground truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Visit History
              </p>
              <p className="text-[11px] text-muted-foreground truncate">Door-to-door logs</p>
            </div>
          </Link>

          <Link
            href={
              displayUnpinnedCount > 0
                ? isManager
                  ? `/congregation/${congregationId}/records/households?filter=unpinned&scope=congregation`
                  : activeAssignments[0]?.territoryId
                    ? `/congregation/${congregationId}/territories/${activeAssignments[0].territoryId}`
                    : `/congregation/${congregationId}/records/households?filter=unpinned&scope=mine`
                : activeAssignments[0]?.territoryId
                  ? `/congregation/${congregationId}/territories/${activeAssignments[0].territoryId}`
                  : `/congregation/${congregationId}/records/households`
            }
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-amber-500/40 hover:bg-muted/50 hover:shadow-xs transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <MapPin size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-foreground truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Pin Doors
                </p>
                {displayUnpinnedCount > 0 && (
                  <Badge className="text-[9px] px-1.5 py-0 h-4 bg-amber-500 text-white font-bold">
                    {displayUnpinnedCount}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {displayUnpinnedCount > 0
                  ? isManager
                    ? `${displayUnpinnedCount} needs pinning`
                    : `${displayUnpinnedCount} in your territory`
                  : isManager
                    ? 'All pinned'
                    : 'All your doors pinned'}
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
                <p className="text-xs font-bold text-foreground truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
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
                <p className="text-xs font-bold text-foreground truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Households
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{households.length} door records</p>
              </div>
            </Link>
          )}
        </div>

        {/* Interactive Stats Grid */}
        <div data-tour="stats-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total Territories"
            value={territoriesLoading ? '—' : territories.length}
            description={`${availableTerritories.length} available to assign`}
            icon={MapPin}
            color="blue"
            loading={territoriesLoading}
            href={`/congregation/${congregationId}/territories?status=available`}
          />
          <StatCard
            title="My Assignments"
            value={assignmentsLoading ? '—' : activeAssignments.length}
            description="Active territories in work"
            icon={Compass}
            color="green"
            loading={assignmentsLoading}
            href={`/congregation/${congregationId}/my-assignments`}
          />
          <StatCard
            title="Door Records"
            value={householdsLoading ? '—' : households.length}
            description={
              isManager
                ? totalCongregationUnpinnedCount > 0
                  ? `📍 ${totalCongregationUnpinnedCount} needs pinning`
                  : 'All pinned on map'
                : myUnpinnedDoorsCount > 0
                  ? `📍 ${myUnpinnedDoorsCount} to pin in your territory`
                  : 'All your doors pinned'
            }
            icon={Home}
            color={displayUnpinnedCount > 0 ? 'orange' : 'purple'}
            loading={householdsLoading}
            href={
              displayUnpinnedCount > 0
                ? isManager
                  ? `/congregation/${congregationId}/records/households?filter=unpinned&scope=congregation`
                  : `/congregation/${congregationId}/records/households?filter=unpinned&scope=mine`
                : `/congregation/${congregationId}/records/households`
            }
          />
          <StatCard
            title="Publishers"
            value={members.length}
            description="Congregation members"
            icon={Users}
            color="gray"
            href={`/congregation/${congregationId}/members`}
          />
        </div>

        {/* Congregation Territory Coverage Progress Gauge */}
        <Card data-tour="congregation-coverage" className="bg-card border-border shadow-xs overflow-hidden">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground tracking-tight">
                    Congregation Territory Progress
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

        {/* Main 2-Column Action & Record Hub */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Active Assignments + Return Visits */}
          <div className="lg:col-span-2 space-y-6">
            {/* My Active Working Territories */}
            <Card
              data-tour="active-assignments"
              className="bg-card border-border shadow-xs overflow-hidden"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Compass size={16} className="text-primary" />
                  <span>My Active Assignments</span>
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="text-xs h-8">
                  <Link href={`/congregation/${congregationId}/my-assignments`}>
                    View All ({activeAssignments.length})
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
                ) : activeAssignments.length === 0 ? (
                  <div className="text-center py-8 px-4 rounded-2xl bg-muted/20 border border-dashed border-border">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                      <Compass size={24} />
                    </div>
                    <p className="text-sm font-bold text-foreground">Ready for field ministry?</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                      You don&apos;t have any active territories checked out right now. Browse available zones or check your return visits.
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                      <Button asChild size="sm" className="rounded-xl text-xs font-semibold gap-1.5 shadow-xs">
                        <Link href={`/congregation/${congregationId}/territories?status=available`}>
                          <Compass size={14} />
                          <span>Browse Available Territories</span>
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-semibold">
                        <Link href={`/congregation/${congregationId}/records/households`}>
                          <span>View Door Records</span>
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeAssignments.map((assignment) => {
                      const terr = territoryMap.get(assignment.territoryId);
                      const number = terr?.number || assignment.territoryNumber || '—';
                      const name = terr?.name || assignment.territoryName || 'Territory';
                      const stats = territoryStatsById.get(assignment.territoryId) || {
                        totalDoors: 0,
                        workedDoors: 0,
                        unworkedDoors: 0,
                        coveragePercent: 0,
                        returnVisitsCount: 0,
                        unpinnedCount: 0,
                      };
                      const isGroupAssignment = Boolean(assignment.serviceGroupId);
                      const assignedGroup = groups.find((g) => g.id === assignment.serviceGroupId);
                      const canReturn = canReturnAssignment(user, assignment, assignedGroup);
                      const pacing = getAssignmentPacing(assignment.assignedAt);

                      return (
                        <div
                          key={assignment.id}
                          className="p-4 sm:p-5 rounded-2xl border border-border bg-background space-y-3.5 hover:border-primary/40 transition-all min-w-0 shadow-2xs"
                        >
                          {/* Header Row */}
                          <div className="flex items-start justify-between gap-3 min-w-0">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <Link
                                  href={`/congregation/${congregationId}/territories/${assignment.territoryId}`}
                                  className="font-bold text-sm sm:text-base text-foreground hover:text-primary transition-colors truncate"
                                  title={`#${number} — ${name}`}
                                >
                                  #{number} — {name}
                                </Link>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] uppercase font-semibold text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/40 shrink-0"
                                >
                                  Working
                                </Badge>
                                {isGroupAssignment ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 border-purple-200 gap-1 shrink-0"
                                  >
                                    <FolderOpen size={10} />
                                    <span>{assignedGroup?.name || 'Group'} Assignment</span>
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-semibold bg-primary/5 text-primary border-primary/20 gap-1 shrink-0"
                                  >
                                    <User size={10} />
                                    <span>Personal</span>
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                {terr?.city && (
                                  <>
                                    <span className="flex items-center gap-1 text-muted-foreground/90 font-medium truncate">
                                      <MapPin size={11} className="shrink-0 text-primary" />
                                      <span>{terr.city}</span>
                                    </span>
                                    <span>•</span>
                                  </>
                                )}
                                <span className="flex items-center gap-1 truncate">
                                  <Clock size={11} className="shrink-0 text-muted-foreground/70" />
                                  <span>
                                    Assigned{' '}
                                    {assignment.assignedAt
                                      ? formatDaysAgo(assignment.assignedAt)
                                      : 'recently'}
                                  </span>
                                </span>
                                <span>•</span>
                                <span
                                  className={`font-semibold text-[11px] ${
                                    pacing.isOverdue
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : pacing.isWarning
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-emerald-600 dark:text-emerald-400'
                                  }`}
                                >
                                  {pacing.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Door Coverage Progress Bar */}
                          {stats.totalDoors > 0 ? (
                            <div className="space-y-1.5 pt-2 border-t border-border/60">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                  <strong className="text-foreground">{stats.workedDoors}</strong>{' '}
                                  of{' '}
                                  <strong className="text-foreground">{stats.totalDoors}</strong>{' '}
                                  doors completed
                                </span>
                                <span className="font-bold text-foreground">
                                  {stats.coveragePercent}%
                                </span>
                              </div>
                              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                  style={{ width: `${stats.coveragePercent}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                              <span>No door records registered in this zone yet</span>
                              <Link
                                href={`/congregation/${congregationId}/territories/${assignment.territoryId}`}
                                className="text-primary hover:underline text-xs font-semibold"
                              >
                                Add first door →
                              </Link>
                            </div>
                          )}

                          {/* At-a-glance Door Status Chips */}
                          {stats.totalDoors > 0 && (
                            <div className="flex items-center gap-2 flex-wrap pt-1">
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2
                                  size={12}
                                  className="text-emerald-600 dark:text-emerald-400"
                                />
                                <span>{stats.workedDoors} Worked</span>
                              </div>

                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/50 border border-border text-[11px] font-medium text-muted-foreground">
                                <Home size={12} />
                                <span>{stats.unworkedDoors} Remaining</span>
                              </div>

                              {stats.returnVisitsCount > 0 && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 text-[11px] font-medium text-purple-700 dark:text-purple-300">
                                  <UserCheck
                                    size={12}
                                    className="text-purple-600 dark:text-purple-400"
                                  />
                                  <span>
                                    {stats.returnVisitsCount} Return Visit
                                    {stats.returnVisitsCount > 1 ? 's' : ''}
                                  </span>
                                </div>
                              )}

                              {stats.unpinnedCount > 0 && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                                  <MapPin
                                    size={12}
                                    className="text-amber-600 dark:text-amber-400"
                                  />
                                  <span>{stats.unpinnedCount} Needs Pinning</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* In-Card Action Footer */}
                          <div className="flex items-center gap-2 pt-2 border-t border-border/60 flex-wrap sm:flex-nowrap">
                            <Button
                              asChild
                              size="sm"
                              className="rounded-xl text-xs gap-1.5 font-semibold shadow-xs flex-1"
                            >
                              <Link
                                href={`/congregation/${congregationId}/territories/${assignment.territoryId}`}
                              >
                                <MapPin size={13} />
                                <span>Open Map Studio</span>
                              </Link>
                            </Button>

                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="rounded-xl text-xs gap-1.5 font-semibold flex-1"
                            >
                              <Link
                                href={`/congregation/${congregationId}/my-assignments/${assignment.territoryId}`}
                              >
                                <Info size={13} />
                                <span>View Details</span>
                              </Link>
                            </Button>

                            {canReturn && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setReturnConfirmAssignment(assignment)}
                                className="rounded-xl text-xs gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0"
                              >
                                <RotateCcw size={13} />
                                <span className="hidden sm:inline">Check In</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Return Visits & Follow-Up Reminders */}
            {myReturnVisits.length > 0 && (
              <Card className="bg-card border-border shadow-xs overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <UserCheck size={16} className="text-purple-600 dark:text-purple-400" />
                    <span>My Return Visits & Follow-ups</span>
                  </CardTitle>
                  <Button asChild variant="ghost" size="sm" className="text-xs h-8">
                    <Link href={`/congregation/${congregationId}/records/households?filter=return_visit`}>
                      View All
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {myReturnVisits.map((h) => {
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
                            {h.lastVisitDate ? `Visited ${timeAgo(h.lastVisitDate)}` : 'No recent visit'}
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
            {/* Records Hub */}
            <Card data-tour="records-hub" className="bg-card border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText size={16} className="text-primary" />
                  <span>Records & Directory</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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
                  <ArrowRight size={14} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
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
                      <p className="font-semibold text-xs text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        Visit History
                      </p>
                      <p className="text-[10px] text-muted-foreground">Door-to-door logs</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
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
                      <p className="font-semibold text-xs text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        Shared Records
                      </p>
                      <p className="text-[10px] text-muted-foreground">Collaborate with publishers</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </Link>
              </CardContent>
            </Card>

            {/* Ministry Resources & Help */}
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
                  <ArrowRight size={14} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </Link>

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
                      <p className="text-[10px] text-muted-foreground">{groups.length} groups arranged</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </Link>

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

      {/* Return Territory Confirmation Modal */}
      <ResponsiveDialog
        open={Boolean(returnConfirmAssignment)}
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
              as completed and return it to available congregation territories.
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
                      canAdjust ? returnDate : undefined,
                      user.role,
                      user.congregationRole,
                      user.id,
                      user.name
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
