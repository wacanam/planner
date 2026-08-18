'use client';

import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Compass,
  FileText,
  Home,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardTourGuide } from '@/components/dashboard-tour-guide';
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
import {
  filterActiveAssignments,
  getUserGroupIds,
  isServiceOverseer,
  isTerritoryServant,
  resolveUserAssignments,
} from '@/lib/permissions';
import { calculateTerritoryCoverage } from '@/lib/territory-coverage';
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

  const tour = useDashboardTour({
    userId: user.id,
    autoStart: true,
  });

  const territoryMap = useMemo(() => {
    return new Map(territories.map((t) => [t.id, t]));
  }, [territories]);

  // Real-time door counts and coverage calculation per territory
  const _coverageByTerritoryId = useMemo(() => {
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

  const displayRole = (() => {
    const r = (user.congregationRole || user.role || '').toUpperCase().replace(/\s+/g, '_');
    if (r === 'SUPER_ADMIN') return 'Super Admin';
    if (r === 'ADMIN') return 'Admin';
    if (r === 'SERVICE_OVERSEER') return 'Service Overseer';
    if (r === 'TERRITORY_SERVANT') return 'Territory Servant';
    return 'Publisher';
  })();

  const isServant = isTerritoryServant(user.role);
  const _isOverseer = isServiceOverseer(user.role);

  const availableTerritories = territories.filter((t) => t.status === 'available');
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

  const needsPinningCount = households.filter((h) => !h.latitude || !h.longitude).length;

  return (
    <ProtectedPage congregationId={congregationId}>
      <DashboardHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24 lg:pb-8 w-full min-w-0">
        {/* Welcome & Quick Studio Trigger */}
        <div
          data-tour="welcome-banner"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-6 rounded-3xl border border-primary/20"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Welcome back, {user.name || 'Publisher'}! 👋
              </h1>
              <Badge
                variant="outline"
                className="text-xs uppercase font-bold bg-primary/10 text-primary border-primary/30"
              >
                {displayRole}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5 font-bold text-foreground">
                <Building2 size={15} className="text-primary" />
                {congregation?.name || 'Congregation Workspace'}
              </span>
              {congregation?.city && <span>• {congregation.city}</span>}
              <span className="hidden sm:inline text-muted-foreground/80">
                — Field ministry territory & visit tracking
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => tour.startTour()}
              className="rounded-2xl text-xs font-semibold gap-1.5 h-10 px-3.5 bg-card/80 hover:bg-muted border-primary/20 hover:border-primary/40 transition-all cursor-pointer shrink-0"
              title="Start guided tour of Kanataran"
            >
              <Sparkles size={14} className="text-amber-500" />
              <span>Tour Guide</span>
            </Button>

            {activeAssignments.length > 0 && activeAssignments[0]?.territoryId ? (
              <Button
                asChild
                className="rounded-2xl text-xs font-semibold gap-2 shadow-sm h-10 px-4 shrink-0"
              >
                <Link
                  href={`/congregation/${congregationId}/territories/${activeAssignments[0].territoryId}`}
                >
                  <MapPin size={15} />
                  <span>Launch Territory Studio</span>
                </Link>
              </Button>
            ) : isServant ? (
              <Button
                asChild
                variant="outline"
                className="rounded-2xl text-xs font-semibold gap-2 shadow-sm h-10 px-4 bg-card hover:bg-muted shrink-0"
              >
                <Link href={`/congregation/${congregationId}/territories`}>
                  <MapPin size={15} />
                  <span>Manage Territories</span>
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="rounded-2xl text-xs font-semibold gap-2 shadow-sm h-10 px-4 bg-card hover:bg-muted shrink-0"
              >
                <Link href={`/congregation/${congregationId}/territories`}>
                  <Compass size={15} />
                  <span>Browse Territories</span>
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div data-tour="stats-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Territories"
            value={territoriesLoading ? '—' : territories.length}
            description={`${availableTerritories.length} available to assign`}
            icon={MapPin}
            color="blue"
            loading={territoriesLoading}
          />
          <StatCard
            title="My Assignments"
            value={assignmentsLoading ? '—' : activeAssignments.length}
            description="Active territories in work"
            icon={Compass}
            color="green"
            loading={assignmentsLoading}
          />
          <StatCard
            title="Door Records"
            value={householdsLoading ? '—' : households.length}
            description={
              needsPinningCount > 0 ? `📍 ${needsPinningCount} needs pinning` : 'All pinned on map'
            }
            icon={Home}
            color={needsPinningCount > 0 ? 'orange' : 'purple'}
            loading={householdsLoading}
          />
          <StatCard
            title="Publishers"
            value={members.length}
            description="Congregation members"
            icon={Users}
            color="gray"
          />
        </div>

        {/* Action Sections */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* My Active Working Territories */}
          <Card data-tour="active-assignments" className="lg:col-span-2 bg-card border-border shadow-xs">
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
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />
                  ))}
                </div>
              ) : activeAssignments.length === 0 ? (
                <div className="text-center py-10">
                  <Compass size={36} className="text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No territory assigned right now.</p>
                  <Button asChild variant="outline" size="sm" className="mt-3 text-xs rounded-xl">
                    <Link href={`/congregation/${congregationId}/territories`}>
                      Browse Available Territories
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeAssignments.map((assignment) => {
                    const terr = territoryMap.get(assignment.territoryId);
                    const number = terr?.number || assignment.territoryNumber || '—';
                    const name = terr?.name || assignment.territoryName || 'Territory';

                    return (
                      <div
                        key={assignment.id}
                        className="p-4 rounded-2xl border border-border bg-background flex items-center justify-between gap-4 hover:border-primary/40 transition-all min-w-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="font-bold text-sm text-foreground truncate min-w-0" title={`#${number} — ${name}`}>
                              #{number} — {name}
                            </p>
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase font-semibold text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/40 shrink-0"
                            >
                              Working
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            Assigned on{' '}
                            {assignment.assignedAt
                              ? new Date(assignment.assignedAt).toLocaleDateString()
                              : 'Recently'}
                          </p>
                        </div>

                        <Button asChild size="sm" className="rounded-xl text-xs gap-1 shrink-0">
                          <Link
                            href={`/congregation/${congregationId}/territories/${assignment.territoryId}`}
                          >
                            <MapPin size={13} />
                            <span>Open Map</span>
                          </Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Hub Navigator */}
          <Card data-tour="records-hub" className="bg-card border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                <span>Records & Workspace</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href={`/congregation/${congregationId}/records/households`}
                className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Home size={15} />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-foreground">Household Directory</p>
                    <p className="text-[10px] text-muted-foreground">
                      {households.length} door records
                    </p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-muted-foreground" />
              </Link>

              <Link
                href={`/congregation/${congregationId}/records/visits`}
                className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-green-500/10 text-green-600">
                    <CheckCircle2 size={15} />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-foreground">Visit History</p>
                    <p className="text-[10px] text-muted-foreground">Door-to-door logs</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-muted-foreground" />
              </Link>

              <Link
                href={`/congregation/${congregationId}/records/shared`}
                className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                    <Users size={15} />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-foreground">Shared Records</p>
                    <p className="text-[10px] text-muted-foreground">Collaborate with publishers</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
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
