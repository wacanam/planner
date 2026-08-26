'use client';

import {
  AlertCircle,
  Compass,
  Home,
  MapPin,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import type { DashboardContextProps } from './types';

export function DashboardMetricStrip({
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
  if (isExecutiveTier) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link
          href={`/congregation/${congregationId}/reports`}
          className="p-3.5 rounded-2xl bg-card border border-border hover:border-blue-500/40 hover:bg-blue-50/10 transition-all group flex items-center justify-between shadow-2xs"
        >
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Coverage</p>
            <p className="text-xl font-extrabold text-foreground">{congregationCoveragePercent}%</p>
            <p className="text-[10px] text-muted-foreground truncate">{workedDoorsCount}/{totalDoorsCount} doors worked</p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
            <TrendingUp size={18} />
          </div>
        </Link>

        <Link
          href={`/congregation/${congregationId}/territories?status=assigned`}
          className="p-3.5 rounded-2xl bg-card border border-border hover:border-emerald-500/40 hover:bg-emerald-50/10 transition-all group flex items-center justify-between shadow-2xs"
        >
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">In Work</p>
            <p className="text-xl font-extrabold text-foreground">{inWorkTerritoriesCount}</p>
            <p className="text-[10px] text-muted-foreground truncate">{overdueTerritoriesCount} overdue (&gt;4 mos)</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
            <Compass size={18} />
          </div>
        </Link>

        <Link
          href={`/congregation/${congregationId}/members`}
          className="p-3.5 rounded-2xl bg-card border border-border hover:border-purple-500/40 hover:bg-purple-50/10 transition-all group flex items-center justify-between shadow-2xs"
        >
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Publishers</p>
            <p className="text-xl font-extrabold text-foreground">{members.length}</p>
            <p className="text-[10px] text-muted-foreground truncate">{groups.length} service groups</p>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
            <Users size={18} />
          </div>
        </Link>

        <Link
          href={`/congregation/${congregationId}/records/households`}
          className="p-3.5 rounded-2xl bg-card border border-border hover:border-amber-500/40 hover:bg-amber-50/10 transition-all group flex items-center justify-between shadow-2xs"
        >
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Door Records</p>
            <p className="text-xl font-extrabold text-foreground">{households.length}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {totalCongregationUnpinnedCount > 0 ? `📍 ${totalCongregationUnpinnedCount} to pin` : 'All pinned'}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
            <Home size={18} />
          </div>
        </Link>
      </div>
    );
  }

  if (isTerritoryServantTier) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link
          href={`/congregation/${congregationId}/territories?status=available`}
          className="p-3.5 rounded-2xl bg-card border border-border hover:border-blue-500/40 hover:bg-blue-50/10 transition-all group flex items-center justify-between shadow-2xs"
        >
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Available</p>
            <p className="text-xl font-extrabold text-foreground">{availableTerritories.length}</p>
            <p className="text-[10px] text-muted-foreground truncate">{territories.length} total zones</p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
            <Compass size={18} />
          </div>
        </Link>

        <Link
          href={`/congregation/${congregationId}/territories?status=assigned`}
          className="p-3.5 rounded-2xl bg-card border border-border hover:border-emerald-500/40 hover:bg-emerald-50/10 transition-all group flex items-center justify-between shadow-2xs"
        >
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">In Work</p>
            <p className="text-xl font-extrabold text-foreground">{inWorkTerritoriesCount}</p>
            <p className="text-[10px] text-muted-foreground truncate">Checked out</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
            <MapPin size={18} />
          </div>
        </Link>

        <Link
          href={`/congregation/${congregationId}/territories?status=overdue`}
          className="p-3.5 rounded-2xl bg-card border border-border hover:border-rose-500/40 hover:bg-rose-50/10 transition-all group flex items-center justify-between shadow-2xs"
        >
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Overdue</p>
            <p className="text-xl font-extrabold text-foreground">{overdueTerritoriesCount}</p>
            <p className="text-[10px] text-muted-foreground truncate">&gt;4 months active</p>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
            <AlertCircle size={18} />
          </div>
        </Link>

        <Link
          href={`/congregation/${congregationId}/records/households?filter=unpinned&scope=congregation`}
          className="p-3.5 rounded-2xl bg-card border border-border hover:border-amber-500/40 hover:bg-amber-50/10 transition-all group flex items-center justify-between shadow-2xs"
        >
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">To Pin</p>
            <p className="text-xl font-extrabold text-foreground">{totalCongregationUnpinnedCount}</p>
            <p className="text-[10px] text-muted-foreground truncate">Needs coordinates</p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
            <MapPin size={18} />
          </div>
        </Link>
      </div>
    );
  }

  if (isGroupLeaderTier) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link
          href={`/congregation/${congregationId}/territories`}
          className="p-3.5 rounded-2xl bg-card border border-border hover:border-purple-500/40 hover:bg-purple-50/10 transition-all group flex items-center justify-between shadow-2xs"
        >
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Group Zones</p>
            <p className="text-xl font-extrabold text-foreground">{groupActiveAssignments.length}</p>
            <p className="text-[10px] text-muted-foreground truncate">{ledGroup?.name || 'Group'}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
            <Compass size={18} />
          </div>
        </Link>

        <Link
          href={`/congregation/${congregationId}/groups`}
          className="p-3.5 rounded-2xl bg-card border border-border hover:border-blue-500/40 hover:bg-blue-50/10 transition-all group flex items-center justify-between shadow-2xs"
        >
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Publishers</p>
            <p className="text-xl font-extrabold text-foreground">{ledGroup?.members?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground truncate">In group roster</p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
            <Users size={18} />
          </div>
        </Link>

        <Link
          href={`/congregation/${congregationId}/records/households`}
          className="p-3.5 rounded-2xl bg-card border border-border hover:border-emerald-500/40 hover:bg-emerald-50/10 transition-all group flex items-center justify-between shadow-2xs"
        >
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Group Doors</p>
            <p className="text-xl font-extrabold text-foreground">{groupHouseholds.length}</p>
            <p className="text-[10px] text-muted-foreground truncate">{groupCoverage.coveragePercent}% completed</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
            <Home size={18} />
          </div>
        </Link>

        <Link
          href={`/congregation/${congregationId}/records/households?filter=return_visit`}
          className="p-3.5 rounded-2xl bg-card border border-border hover:border-amber-500/40 hover:bg-amber-50/10 transition-all group flex items-center justify-between shadow-2xs"
        >
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Follow-ups</p>
            <p className="text-xl font-extrabold text-foreground">{groupReturnVisits.length}</p>
            <p className="text-[10px] text-muted-foreground truncate">Group visits</p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
            <UserCheck size={18} />
          </div>
        </Link>
      </div>
    );
  }

  // Publisher Tier
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Link
        href={`/congregation/${congregationId}/territories?status=available`}
        className="p-3.5 rounded-2xl bg-card border border-border hover:border-blue-500/40 hover:bg-blue-50/10 transition-all group flex items-center justify-between shadow-2xs"
      >
        <div className="space-y-0.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Available</p>
          <p className="text-xl font-extrabold text-foreground">{availableTerritories.length}</p>
          <p className="text-[10px] text-muted-foreground truncate">Ready to assign</p>
        </div>
        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
          <Compass size={18} />
        </div>
      </Link>

      <Link
        href={`/congregation/${congregationId}/my-assignments`}
        className="p-3.5 rounded-2xl bg-card border border-border hover:border-emerald-500/40 hover:bg-emerald-50/10 transition-all group flex items-center justify-between shadow-2xs"
      >
        <div className="space-y-0.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Assignments</p>
          <p className="text-xl font-extrabold text-foreground">{activeAssignments.length}</p>
          <p className="text-[10px] text-muted-foreground truncate">Active zones</p>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
          <MapPin size={18} />
        </div>
      </Link>

      <Link
        href={`/congregation/${congregationId}/records/households?filter=unpinned&scope=mine`}
        className="p-3.5 rounded-2xl bg-card border border-border hover:border-amber-500/40 hover:bg-amber-50/10 transition-all group flex items-center justify-between shadow-2xs"
      >
        <div className="space-y-0.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pin Doors</p>
          <p className="text-xl font-extrabold text-foreground">
            {myUnpinnedDoorsCount > 0 ? myUnpinnedDoorsCount : '0'}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {myUnpinnedDoorsCount > 0 ? '📍 Needs coordinates' : 'All pinned'}
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
          <Home size={18} />
        </div>
      </Link>

      <Link
        href={`/congregation/${congregationId}/groups`}
        className="p-3.5 rounded-2xl bg-card border border-border hover:border-purple-500/40 hover:bg-purple-50/10 transition-all group flex items-center justify-between shadow-2xs"
      >
        <div className="space-y-0.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Service Group</p>
          <p className="text-sm font-extrabold text-foreground truncate">{userGroup?.name || 'Group'}</p>
          <p className="text-[10px] text-muted-foreground truncate">{userGroup?.members?.length || 0} publishers</p>
        </div>
        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
          <Users size={18} />
        </div>
      </Link>
    </div>
  );
}
