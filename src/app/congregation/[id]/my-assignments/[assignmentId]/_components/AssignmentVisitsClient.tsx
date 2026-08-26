'use client';

import {
  ArrowLeft,
  BarChart2,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  Home,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { DashboardHeader } from '@/components/dashboard-header';
import { HouseholdLogVisitSheet } from '@/components/households/household-action-sheets';
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
  useCurrentUser,
  useHouseholds,
  useReturnAssignment,
  useTerritoryAssignments,
  useTerritoryDetail,
  useTerritoryEncounters,
  useTerritoryVisits,
} from '@/hooks';
import {
  canAdjustAssignmentDates,
  canLogVisitOrEncounter,
  canReturnAssignment,
} from '@/lib/permissions';
import { formatDate } from '@/lib/date-utils';
import { calculateTerritoryCoverage } from '@/lib/territory-coverage';
import { timeAgo } from '@/lib/time-ago';
import type { Household } from '@/types/api';

const statusBadgeColors: Record<string, string> = {
  new: 'bg-muted text-muted-foreground border-border',
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  not_home: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  busy: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  return_visit: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  foreign_language: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
  vacant: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
  inaccessible: 'bg-stone-500/10 text-stone-700 dark:text-stone-400 border-stone-500/20',
  do_not_visit: 'bg-destructive/10 text-destructive border-destructive/20',
  moved: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
  inactive: 'bg-muted text-muted-foreground border-border',
};

const outcomeBadgeColors: Record<string, string> = {
  answered: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  not_home: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  busy: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  return_visit: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  study_conducted: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  minor_only: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  foreign_language: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
  inaccessible: 'bg-stone-500/10 text-stone-700 dark:text-stone-400 border-stone-500/20',
  vacant: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
  do_not_visit: 'bg-destructive/10 text-destructive border-destructive/20',
  moved: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
  other: 'bg-muted text-muted-foreground border-border',
};

export default function AssignmentVisitsClient() {
  const router = useRouter();
  const params = useParams<{
    id: string;
    assignmentId: string;
  }>();
  const congregationId = params?.id;
  const territoryId = params?.assignmentId ?? null;
  const backHref = `/congregation/${congregationId}/my-assignments`;

  const { user } = useCurrentUser();
  const { territory, isLoading: territoryLoading } = useTerritoryDetail(territoryId);
  const { assignments, isLoading: assignmentsLoading } = useTerritoryAssignments(territoryId);
  const { groups = [] } = useCongregationGroups(congregationId);
  const { data: members = [] } = useCongregationMembers(congregationId);
  const { households = [], isLoading: householdsLoading } = useHouseholds({
    territoryId: territoryId ?? undefined,
    congregationId,
  });
  const { visits = [], isLoading: visitsLoading } = useTerritoryVisits(territoryId, congregationId);
  const { encounters = [], isLoading: encountersLoading } = useTerritoryEncounters(
    territoryId,
    congregationId
  );
  const { returnTerritory, isPending: returning } = useReturnAssignment();

  const [returnConfirmOpen, setReturnConfirmOpen] = useState(false);
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [logVisitHousehold, setLogVisitHousehold] = useState<Household | null>(null);
  const [doorSearch, setDoorSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const canAdjust = canAdjustAssignmentDates(user?.role);

  const _loading =
    territoryLoading ||
    assignmentsLoading ||
    householdsLoading ||
    visitsLoading ||
    encountersLoading;

  const activeAssignment =
    assignments.find((a) => a.status === 'assigned' || a.status === 'active') ??
    assignments[0] ??
    null;

  const assignedGroup = groups.find((g) => g.id === activeAssignment?.serviceGroupId);
  const canReturn = canReturnAssignment(user, activeAssignment, assignedGroup);

  // Map of userId -> Real Full Name
  const userNameMap = useMemo(() => {
    const map = new Map<string, string>();

    // 1. Current user
    if (user?.id) {
      map.set(user.id, user.name || user.email || 'You');
    }

    // 2. Members from congregation
    for (const m of members) {
      const name = m.user?.name || m.user?.email;
      if (name) {
        if (m.userId) map.set(m.userId, name);
        if (m.id) map.set(m.id, name);
      }
    }

    // 3. Groups members and overseers
    for (const g of groups) {
      if (g.overseerId && g.overseerName) {
        map.set(g.overseerId, g.overseerName);
      }
      if (g.assistantOverseerId && g.assistantOverseerName) {
        map.set(g.assistantOverseerId, g.assistantOverseerName);
      }
      if (g.members) {
        for (const gm of g.members) {
          const name = gm.user?.name || gm.user?.email;
          if (name) {
            if (gm.userId) map.set(gm.userId, name);
            if (gm.id) map.set(gm.id, name);
          }
        }
      }
    }

    // 4. Assignments
    for (const a of assignments) {
      if (a.userId && a.assigneeName) {
        map.set(a.userId, a.assigneeName);
      }
    }

    // 5. Households creators
    for (const h of households) {
      if (h.createdById && h.creatorName) {
        map.set(h.createdById, h.creatorName);
      }
    }

    return map;
  }, [user, members, groups, assignments, households]);

  const resolvePublisherName = useMemo(() => {
    return (userId?: string | null, publisherName?: string | null): string => {
      if (userId && userId === user?.id) {
        return user.name || 'You';
      }
      if (publisherName?.trim() && publisherName.trim().toLowerCase() !== 'publisher') {
        return publisherName.trim();
      }
      if (userId && userNameMap.has(userId)) {
        return userNameMap.get(userId)!;
      }
      if (activeAssignment?.userId === userId && activeAssignment?.assigneeName) {
        return activeAssignment.assigneeName;
      }
      if (assignedGroup?.overseerName) {
        return assignedGroup.overseerName;
      }
      if (activeAssignment?.assigneeName) {
        return activeAssignment.assigneeName;
      }
      return 'Group Publisher';
    };
  }, [user, userNameMap, activeAssignment, assignedGroup]);

  // Coverage Stats
  const coverageStats = useMemo(() => {
    if (households && households.length > 0) {
      return calculateTerritoryCoverage(households);
    }
    const fallbackPercent = territory
      ? Math.round(parseFloat(territory.coveragePercent ?? '0'))
      : 0;
    const fallbackTotal = territory?.householdsCount ?? 0;
    return {
      totalDoors: fallbackTotal,
      workedDoors: Math.round((fallbackPercent / 100) * fallbackTotal),
      unworkedDoors: Math.max(
        0,
        fallbackTotal - Math.round((fallbackPercent / 100) * fallbackTotal)
      ),
      coveragePercent: fallbackPercent,
    };
  }, [households, territory]);

  // Demographic & Outcome Stats Breakdown
  const demographicStats = useMemo(() => {
    let answered = 0;
    let notHome = 0;
    let busy = 0;
    let returnVisit = 0;
    let foreignLanguage = 0;
    let vacant = 0;
    let inaccessible = 0;
    let doNotCall = 0;
    let moved = 0;

    for (const h of households) {
      if (h.status === 'active' || h.lastVisitOutcome === 'answered') answered++;
      if (h.status === 'not_home' || h.lastVisitOutcome === 'not_home') notHome++;
      if (h.status === 'busy' || h.lastVisitOutcome === 'busy') busy++;
      if (h.status === 'return_visit' || h.lastVisitOutcome === 'return_visit') returnVisit++;
      if (h.status === 'foreign_language' || h.lastVisitOutcome === 'foreign_language')
        foreignLanguage++;
      if (h.status === 'vacant' || h.lastVisitOutcome === 'vacant') vacant++;
      if (h.status === 'inaccessible' || h.lastVisitOutcome === 'inaccessible') inaccessible++;
      if (h.status === 'do_not_visit' || h.lastVisitOutcome === 'do_not_visit') doNotCall++;
      if (h.status === 'moved' || h.lastVisitOutcome === 'moved') moved++;
    }

    const scheduledRVs = visits.filter((v) => v.returnVisitPlanned && v.nextVisitDate).length;
    const studyInterests = encounters.filter(
      (e) =>
        e.bibleStudyInterest ||
        e.returnVisitRequested ||
        e.response === 'receptive' ||
        e.response === 'study_accepted'
    ).length;

    return {
      answered,
      notHome,
      busy,
      returnVisit,
      foreignLanguage,
      vacant,
      inaccessible,
      doNotCall,
      moved,
      scheduledRVs,
      studyInterests,
    };
  }, [households, visits, encounters]);

  // Publisher Collaboration Breakdown (Assignee + Groupmates)
  const publisherStats = useMemo(() => {
    const pubMap = new Map<
      string,
      {
        name: string;
        visitsCount: number;
        encountersCount: number;
        lastActive: string | null;
        isCurrentUser: boolean;
      }
    >();

    // Count visits by publisher
    for (const v of visits) {
      const name = resolvePublisherName(v.userId, v.publisherName);
      const key = v.userId || name;
      const isCurrentUser = Boolean(user?.id && v.userId === user.id);
      const current = pubMap.get(key) || {
        name,
        visitsCount: 0,
        encountersCount: 0,
        lastActive: null,
        isCurrentUser,
      };
      current.visitsCount++;
      if (!current.lastActive || v.visitDate > current.lastActive) {
        current.lastActive = v.visitDate;
      }
      pubMap.set(key, current);
    }

    // Count encounters by publisher
    for (const e of encounters) {
      const name = resolvePublisherName(e.userId, e.publisherName);
      const key = e.userId || name;
      const isCurrentUser = Boolean(user?.id && e.userId === user.id);
      const current = pubMap.get(key) || {
        name,
        visitsCount: 0,
        encountersCount: 0,
        lastActive: null,
        isCurrentUser,
      };
      current.encountersCount++;
      const date = e.visitDate || e.createdAt;
      if (date && (!current.lastActive || date > current.lastActive)) {
        current.lastActive = date;
      }
      pubMap.set(key, current);
    }

    return Array.from(pubMap.values()).sort((a, b) => b.visitsCount - a.visitsCount);
  }, [visits, encounters, resolvePublisherName, user]);

  // Filtered Doors List
  const filteredHouseholds = useMemo(() => {
    return households.filter((h) => {
      const matchesSearch =
        !doorSearch.trim() ||
        h.address.toLowerCase().includes(doorSearch.toLowerCase()) ||
        h.city?.toLowerCase().includes(doorSearch.toLowerCase()) ||
        h.notes?.toLowerCase().includes(doorSearch.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'worked') {
        return (
          h.lastVisitDate || (typeof h.totalVisitsCount === 'number' && h.totalVisitsCount > 0)
        );
      }
      if (statusFilter === 'unworked') {
        return !h.lastVisitDate && (!h.totalVisitsCount || h.totalVisitsCount === 0);
      }
      return h.status === statusFilter || h.lastVisitOutcome === statusFilter;
    });
  }, [households, doorSearch, statusFilter]);

  const handleReturn = async () => {
    if (!activeAssignment) return;
    await returnTerritory(activeAssignment.id, canAdjust ? returnDate : undefined);
    toast.success('Territory returned to congregation');
    setReturnConfirmOpen(false);
    setReturnDate(new Date().toISOString().slice(0, 10));
    router.push(backHref);
  };

  return (
    <ProtectedPage congregationId={congregationId}>
      <DashboardHeader />
      <main className="max-w-6xl mx-auto min-w-0 w-full py-8 px-4 sm:px-6 lg:px-8 space-y-6 pb-28 lg:pb-12">
        {/* Header Title & Back Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 mt-0.5 rounded-xl"
            >
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
                  #{territory?.number || ''}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground line-clamp-2 leading-snug break-words">
                  {territory?.name || 'Assignment Details'}
                </h1>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 shrink-0 whitespace-nowrap gap-1 py-0.5 px-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Stats</span>
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                {territory?.city && <span>{territory.city}</span>}
                {territory?.city && <span>•</span>}
                {activeAssignment?.serviceGroupId || activeAssignment?.groupName ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                    <Crown size={12} />
                    <span>
                      Group: {assignedGroup?.name || activeAssignment?.groupName || 'Service Group'}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-primary">
                    <UserCheck size={12} />
                    <span>
                      Assignee: {activeAssignment?.assigneeName || user?.name || 'Personal'}
                    </span>
                  </span>
                )}
                {activeAssignment?.assignedAt && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={12} />
                      <span>
                        Assigned {formatDate(activeAssignment.assignedAt)}
                      </span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Map Studio Direct Link */}
          <div className="flex items-center gap-2 shrink-0">
            <Button asChild className="rounded-xl gap-2 font-semibold shadow-xs h-10 px-4">
              <Link href={`/congregation/${congregationId}/territories/${territoryId}`}>
                <MapPin size={15} />
                <span>Open Territory Map Studio</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Coverage Progress Bar */}
        <Card className="bg-card border-border shadow-xs overflow-hidden">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                <span className="text-sm font-bold text-foreground">
                  Overall Territory Coverage
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-primary">
                  {coverageStats.coveragePercent}%
                </span>
                <span className="text-xs text-muted-foreground">
                  ({coverageStats.workedDoors} of {coverageStats.totalDoors} doors worked)
                </span>
              </div>
            </div>

            <div className="w-full bg-muted h-3 rounded-full overflow-hidden flex">
              <div
                className="bg-primary h-full transition-all duration-500"
                style={{ width: `${coverageStats.coveragePercent}%` }}
                title={`Worked: ${coverageStats.workedDoors}`}
              />
              <div
                className="bg-muted-foreground/20 h-full transition-all duration-500"
                style={{ width: `${100 - coverageStats.coveragePercent}%` }}
                title={`Remaining: ${coverageStats.unworkedDoors}`}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span>Worked ({coverageStats.workedDoors})</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
                  <span>Remaining ({coverageStats.unworkedDoors})</span>
                </span>
              </div>
              <span>{coverageStats.totalDoors} total doors mapped</span>
            </div>
          </CardContent>
        </Card>

        {/* Full Territory Statistics KPI Grid */}
        <div>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <BarChart2 size={15} className="text-primary" />
            <span>Territory Statistics & Demographics</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* KPI 1: Total Doors */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Doors</span>
                <Home size={15} className="text-primary" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-foreground">
                {coverageStats.totalDoors}
              </p>
              <p className="text-xs text-muted-foreground">Mapped in territory</p>
            </div>

            {/* KPI 2: Worked Doors */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-bold uppercase tracking-wider">Worked Doors</span>
                <CheckCircle2 size={15} className="text-emerald-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {coverageStats.workedDoors}
              </p>
              <p className="text-xs text-muted-foreground">
                {coverageStats.coveragePercent}% territory coverage
              </p>
            </div>

            {/* KPI 3: Total Visits Logged */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Visits Logged
                </span>
                <Clock size={15} className="text-blue-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
                {visits.length}
              </p>
              <p className="text-xs text-muted-foreground">Across all publishers</p>
            </div>

            {/* KPI 4: People Met / Encounters */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-bold uppercase tracking-wider">People Met</span>
                <Users size={15} className="text-purple-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
                {encounters.length}
              </p>
              <p className="text-xs text-muted-foreground">Individual encounters</p>
            </div>

            {/* KPI 5: Return Visits / Follow-ups */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Return Visits
                </span>
                <Sparkles size={15} className="text-purple-500" />
              </div>
              <p className="text-2xl font-black text-purple-700 dark:text-purple-300">
                {demographicStats.returnVisit}
              </p>
              <p className="text-xs text-muted-foreground">Active follow-ups scheduled</p>
            </div>

            {/* KPI 6: Not Home Doors */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-bold uppercase tracking-wider">Not Home</span>
                <XCircle size={15} className="text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {demographicStats.notHome}
              </p>
              <p className="text-xs text-muted-foreground">Require re-call</p>
            </div>

            {/* KPI 7: Do Not Call / Sensitive */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-bold uppercase tracking-wider">Do Not Visit</span>
                <ShieldAlert size={15} className="text-destructive" />
              </div>
              <p className="text-2xl font-black text-destructive">{demographicStats.doNotCall}</p>
              <p className="text-xs text-muted-foreground">Flagged sensitive addresses</p>
            </div>

            {/* KPI 8: Bible Study / Receptive Interests */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Study Interests
                </span>
                <BookOpen size={15} className="text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {demographicStats.studyInterests}
              </p>
              <p className="text-xs text-muted-foreground">Receptive / study requests</p>
            </div>
          </div>
        </div>

        {/* Group Collaboration & Publisher Breakdown */}
        {publisherStats.length > 0 && (
          <Card className="bg-card border-border shadow-xs">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-primary" />
                  <h2 className="text-sm font-bold text-foreground">
                    Publisher & Groupmate Activity in this Territory
                  </h2>
                </div>
                <span className="text-xs text-muted-foreground">
                  {publisherStats.length}{' '}
                  {publisherStats.length === 1 ? 'contributor' : 'contributors'}
                </span>
              </div>

              <div className="divide-y divide-border/60">
                {publisherStats.map((pub, idx) => (
                  <div
                    key={idx}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] shrink-0">
                        {pub.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {pub.name}{' '}
                          {pub.isCurrentUser && (
                            <span className="text-primary font-normal">(You)</span>
                          )}
                        </p>
                        {pub.lastActive && (
                          <p className="text-[10px] text-muted-foreground">
                            Active {timeAgo(pub.lastActive)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right shrink-0">
                      <div>
                        <p className="font-bold text-foreground">{pub.visitsCount}</p>
                        <p className="text-[10px] text-muted-foreground">visits</p>
                      </div>
                      {pub.encountersCount > 0 && (
                        <div>
                          <p className="font-bold text-purple-600 dark:text-purple-400">
                            {pub.encountersCount}
                          </p>
                          <p className="text-[10px] text-muted-foreground">people met</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Territory Doors & Households Directory */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Home size={16} className="text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                Territory Doors & Addresses ({households.length})
              </h2>
            </div>
            <div className="relative w-full sm:w-64">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Search door address…"
                value={doorSearch}
                onChange={(e) => setDoorSearch(e.target.value)}
                className="pl-8 h-8 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Quick Filter Pills */}
          <div className="w-full overflow-x-auto scrollbar-none pb-1">
            <div className="inline-flex items-center gap-1.5 p-1 bg-muted/40 rounded-2xl border border-border min-w-max">
              {[
                { key: 'all', label: `All (${households.length})` },
                { key: 'worked', label: `Worked (${coverageStats.workedDoors})` },
                { key: 'unworked', label: `Unworked (${coverageStats.unworkedDoors})` },
                { key: 'return_visit', label: `Return Visits (${demographicStats.returnVisit})` },
                { key: 'not_home', label: `Not Home (${demographicStats.notHome})` },
                { key: 'busy', label: `Busy (${demographicStats.busy})` },
                {
                  key: 'foreign_language',
                  label: `Foreign Lang (${demographicStats.foreignLanguage})`,
                },
                { key: 'vacant', label: `Vacant (${demographicStats.vacant})` },
                { key: 'inaccessible', label: `Inaccessible (${demographicStats.inaccessible})` },
                { key: 'do_not_visit', label: `Do Not Call (${demographicStats.doNotCall})` },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === f.key
                      ? 'bg-card text-primary shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Doors List */}
          {filteredHouseholds.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center space-y-2">
                <Home size={28} className="mx-auto text-muted-foreground/50" />
                <p className="text-sm font-semibold text-foreground">No doors match your filter</p>
                <p className="text-xs text-muted-foreground">
                  Try selecting another filter or searching a different address.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredHouseholds.map((h) => (
                <div
                  key={h.id}
                  className="rounded-2xl border border-border bg-card p-3.5 flex items-start justify-between gap-3 shadow-2xs hover:border-primary/30 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-xs text-foreground truncate">
                        {h.houseNumber ? `#${h.houseNumber} ` : ''}
                        {h.streetName || h.address}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[9px] capitalize py-0 ${statusBadgeColors[h.status] ?? statusBadgeColors.new}`}
                      >
                        {h.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                      {h.streetName && h.address && <span>{h.address}</span>}
                      {h.city && <span>• {h.city}</span>}
                      {h.lastVisitDate ? (
                        <span>• Last visit {timeAgo(h.lastVisitDate)}</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          • Not yet worked
                        </span>
                      )}
                      {h.occupantsCount && h.occupantsCount > 1 && (
                        <span>• {h.occupantsCount} occupants</span>
                      )}
                    </div>

                    {h.notes && (
                      <p className="text-[11px] text-muted-foreground italic line-clamp-1">
                        &ldquo;{h.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {canLogVisitOrEncounter(user, h) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLogVisitHousehold(h)}
                      className="h-8 rounded-xl text-xs gap-1 font-semibold shrink-0"
                    >
                      <Plus size={12} />
                      <span>Log</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Timeline */}
        {visits.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                Recent Territory Activity History ({visits.length})
              </h2>
            </div>

            <div className="space-y-2">
              {visits.slice(0, 10).map((v) => (
                <div
                  key={v.id}
                  className="rounded-2xl border border-border bg-card p-3.5 flex items-start justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-foreground">
                        {v.houseNumber ? `#${v.houseNumber} ` : ''}
                        {v.streetName || v.householdAddress || 'Mapped Door'}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] capitalize py-0 ${outcomeBadgeColors[v.outcome] ?? outcomeBadgeColors.other}`}
                      >
                        {v.outcome.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {timeAgo(v.visitDate)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                      <span className="font-medium text-foreground/80">
                        Logged by {resolvePublisherName(v.userId, v.publisherName)}
                      </span>
                      {v.bibleTopicDiscussed && <span>• Topic: {v.bibleTopicDiscussed}</span>}
                      {(v.literaturePlaced || v.literatureLeft) && (
                        <span className="text-primary font-medium">
                          • Left: {v.literaturePlaced || v.literatureLeft}
                        </span>
                      )}
                    </div>

                    {v.returnVisitPlanned && v.nextVisitDate && (
                      <p className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                        📅 Next Visit Scheduled: {formatDate(v.nextVisitDate)}
                        {v.nextVisitTime ? ` at ${v.nextVisitTime}` : ''}
                      </p>
                    )}

                    {v.notes && (
                      <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                        &ldquo;{v.notes}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Return Territory Action */}
        <div className="pt-2">
          {activeAssignment &&
            (canReturn ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setReturnConfirmOpen(true)}
                className="w-full h-11 rounded-2xl gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60"
              >
                <RotateCcw size={14} />
                <span>Return Territory Assignment to Congregation</span>
              </Button>
            ) : (
              <div className="p-3 rounded-2xl bg-muted/30 border border-border/60 text-center">
                <p className="text-xs text-muted-foreground italic flex items-center justify-center gap-1.5">
                  <Crown size={13} className="text-amber-500 shrink-0" />
                  <span>
                    Territory return is managed by your Group Overseer
                    {assignedGroup?.overseerName ? ` (${assignedGroup.overseerName})` : ''},
                    Territory Servant, or Service Overseer.
                  </span>
                </p>
              </div>
            ))}
        </div>

        {/* Log Visit Dialog */}
        <HouseholdLogVisitSheet
          open={Boolean(logVisitHousehold)}
          onOpenChange={(open) => {
            if (!open) setLogVisitHousehold(null);
          }}
          household={logVisitHousehold}
          assignmentId={activeAssignment?.id}
          onSaved={() => {
            toast.success('Visit logged successfully');
          }}
        />

        {/* Return Territory Confirmation Modal */}
        <ResponsiveDialog
          open={returnConfirmOpen}
          onOpenChange={(op) => {
            if (!op) {
              setReturnConfirmOpen(false);
              setReturnDate(new Date().toISOString().slice(0, 10));
            }
          }}
          title="Return Territory Assignment"
          description={`Are you sure you want to return Territory #${territory?.number || ''} to the congregation?`}
        >
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              This will mark your assignment for Territory #{territory?.number || ''} as completed
              and return the territory to Available status.
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
                  setReturnConfirmOpen(false);
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
                onClick={handleReturn}
              >
                {returning ? 'Returning…' : 'Confirm Return'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>
      </main>
      <BottomTabBar />
    </ProtectedPage>
  );
}
