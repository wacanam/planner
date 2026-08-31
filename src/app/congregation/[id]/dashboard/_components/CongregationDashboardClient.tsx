'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardTourGuide } from '@/components/dashboard-tour-guide';
import { HouseholdLogVisitSheet } from '@/components/households/household-action-sheets';
import { ProtectedPage } from '@/components/protected-page';
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
  canCreateTerritory,
  canViewAllCongregationRecords,
  filterActiveAssignments,
  getUserGroupIds,
  isCircuitOverseer,
  isCongregationSecretary,
  isGroupLeader,
  isGroupOverseer,
  isGroupOverseerAssistant,
  isServiceOverseer,
  isSystemAdmin,
  isTerritoryServant,
  resolveUserAssignments,
} from '@/lib/permissions';
import { calculateTerritoryCoverage } from '@/lib/territory-coverage';
import type { Household } from '@/types/api';
import { ActiveTerritoryCard } from './ActiveTerritoryCard';
import { DashboardHeroDeck } from './DashboardHeroDeck';
import { DashboardMetricStrip } from './DashboardMetricStrip';
import { DashboardProgressGauge } from './DashboardProgressGauge';
import { RecentActivityFeed } from './RecentActivityFeed';
import { RecordsAndResourcesDock } from './RecordsAndResourcesDock';
import { ReturnVisitsCard } from './ReturnVisitsCard';
import { ServiceArrangementsWidget } from './ServiceArrangementsWidget';
import type { DashboardContextProps } from './types';

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
      const activeAssignment = assignments.find(
        (a) => a.territoryId === tId && (a.status === 'assigned' || a.status === 'active')
      );
      const latestCompleted = !activeAssignment
        ? assignments
            .filter((a) => a.territoryId === tId && (a.status === 'completed' || a.returnedAt))
            .sort((a, b) => (b.returnedAt || '').localeCompare(a.returnedAt || ''))[0]
        : null;

      const targetAssignment = activeAssignment || latestCompleted;
      map.set(
        tId,
        calculateTerritoryCoverage(hList, {
          assignedAt: targetAssignment?.assignedAt,
          returnedAt: targetAssignment?.returnedAt,
          assignmentId: targetAssignment?.id,
        })
      );
    }
    return map;
  }, [households, assignments]);

  // Find all service groups that the current user belongs to (as overseer, assistant, or member)
  const userGroupIds = useMemo(() => {
    return getUserGroupIds(user, groups);
  }, [groups, user]);

  const userGroup = useMemo(() => {
    return groups.find((g) => userGroupIds.has(g.id));
  }, [groups, userGroupIds]);

  // Natural Role Tier Checks
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
      groups.some((g) => isGroupOverseerAssistant(user?.id, g, user?.role, user?.congregationRole))
    );
  }, [groups, user, userIsGroupOverseer]);

  const userIsGroupLeader = userIsGroupOverseer || userIsGroupAssistant;

  // Role Presentation Tier
  const isExecutiveTier =
    userIsAdmin || userIsServiceOverseer || userIsSecretary || userIsCircuitOverseer;
  const isTerritoryServantTier = !isExecutiveTier && userIsTerritoryServant;
  const isGroupLeaderTier = !isExecutiveTier && !isTerritoryServantTier && userIsGroupLeader;
  const isPublisherTier = !isExecutiveTier && !isTerritoryServantTier && !isGroupLeaderTier;

  // For group leaders: which group do they lead?
  const ledGroup = useMemo(() => {
    return (
      groups.find((g) => isGroupLeader(user?.id, g, user?.role, user?.congregationRole)) ||
      userGroup ||
      groups[0]
    );
  }, [groups, user, userGroup]);

  // Group assignments, territories, households & metrics for Group Leader
  const ledGroupMemberIds = useMemo(() => {
    if (!ledGroup) return new Set<string>();
    const ids = new Set<string>(
      (ledGroup.members || []).map((m) => m.userId || m.id).filter((x): x is string => Boolean(x))
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
          h.status === 'return_visit' || h.status === 'busy' || Boolean(h.notes && h.lastVisitDate)
      )
      .sort((a, b) => (b.lastVisitDate || '').localeCompare(a.lastVisitDate || ''))
      .slice(0, 3);
  }, [groupHouseholds]);

  const effectiveRole = useMemo(() => {
    if (userIsAdmin) return user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin';
    if (userIsCircuitOverseer) return 'Circuit Overseer';
    if (userIsServiceOverseer) return 'Service Overseer';
    if (userIsSecretary) return 'Secretary';
    if (userIsTerritoryServant) return 'Territory Servant';
    if (userIsGroupOverseer) return `${ledGroup?.name || 'Group'} Overseer`;
    if (userIsGroupAssistant) return `${ledGroup?.name || 'Group'} Assistant`;
    if (user.congregationRole === 'VISITING_PUBLISHER' || user.role === 'VISITING_PUBLISHER')
      return 'Visiting Publisher';
    return 'Publisher';
  }, [
    userIsAdmin,
    user.role,
    userIsCircuitOverseer,
    userIsServiceOverseer,
    userIsSecretary,
    userIsTerritoryServant,
    userIsGroupOverseer,
    userIsGroupAssistant,
    user.congregationRole,
    ledGroup?.name,
  ]);

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

  const contextProps: DashboardContextProps = {
    congregationId,
    user,
    congregation,
    territories,
    territoriesLoading,
    assignments,
    assignmentsLoading,
    groups,
    households,
    householdsLoading,
    members,
    activeAssignments,
    effectiveRole,
    isExecutiveTier,
    isTerritoryServantTier,
    isGroupLeaderTier,
    isPublisherTier,
    ledGroup,
    userGroup,
    groupActiveAssignments,
    groupHouseholds,
    groupCoverage,
    groupUnpinnedCount,
    groupReturnVisits,
    myReturnVisits,
    myUnpinnedDoorsCount,
    totalCongregationUnpinnedCount,
    displayUnpinnedCount,
    congregationCoveragePercent,
    totalDoorsCount,
    workedDoorsCount,
    availableTerritories,
    inWorkTerritoriesCount,
    overdueTerritoriesCount,
    territoryMap,
    coverageByTerritoryId,
    onLogVisit: setLogVisitHousehold,
    onStartTour: tour.startTour,
  };

  return (
    <ProtectedPage congregationId={congregationId}>
      <DashboardHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-5 sm:space-y-6 pb-24 lg:pb-8 w-full min-w-0">
        {/* 1. Welcome Greeting Header */}
        <DashboardHeroDeck {...contextProps} />

        {/* 2. Active Territory in Work Spotlight Card */}
        <ActiveTerritoryCard {...contextProps} />

        {/* 3. Compact Bento Metric Strip (4 high-density interactive cards) */}
        <DashboardMetricStrip {...contextProps} />

        {/* 4. Campaign / Group Progress Gauge */}
        <DashboardProgressGauge {...contextProps} />

        {/* 4. 2-Column Responsive Bento Grid */}
        <div className="grid lg:grid-cols-3 gap-5 min-w-0">
          {/* Main Left Column (2 cols wide) */}
          <div className="lg:col-span-2 space-y-5 min-w-0">
            {/* Follow-ups & Return Visits Radar */}
            <ReturnVisitsCard {...contextProps} />

            {/* Live Real-time Ministry Feed */}
            <RecentActivityFeed {...contextProps} />
          </div>

          {/* Main Right Column (1 col wide) */}
          <div className="space-y-5 min-w-0">
            {/* Service Group & Meeting Arrangements */}
            <ServiceArrangementsWidget {...contextProps} />

            {/* Combined Records & Ministry Resources Dock */}
            <RecordsAndResourcesDock {...contextProps} />
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
