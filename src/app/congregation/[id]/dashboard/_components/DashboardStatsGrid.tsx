'use client';

import {
  AlertCircle,
  Compass,
  FolderOpen,
  Home,
  MapPin,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import type { DashboardContextProps } from './types';

export function DashboardStatsGrid({
  congregationId,
  isExecutiveTier,
  isTerritoryServantTier,
  isGroupLeaderTier,
  congregationCoveragePercent,
  workedDoorsCount,
  totalDoorsCount,
  inWorkTerritoriesCount,
  overdueTerritoriesCount,
  members,
  groups,
  households,
  totalCongregationUnpinnedCount,
  territories,
  territoriesLoading,
  assignmentsLoading,
  availableTerritories,
  groupActiveAssignments,
  ledGroup,
  groupHouseholds,
  groupCoverage,
  groupReturnVisits,
  activeAssignments,
  myUnpinnedDoorsCount,
  userGroup,
}: DashboardContextProps) {
  return (
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
            icon={AlertCircle}
            color={overdueTerritoriesCount > 0 ? 'red' : 'gray'}
            href={`/congregation/${congregationId}/territories?status=overdue`}
          />
          <StatCard
            title="Needs Pinning"
            value={totalCongregationUnpinnedCount}
            description="Unpinned door coordinates"
            icon={MapPin}
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
                ? '📍 Needs coordinates in your zone'
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
  );
}
