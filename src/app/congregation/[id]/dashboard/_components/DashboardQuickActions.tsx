'use client';

import {
  BarChart3,
  CheckCircle2,
  Clock,
  Compass,
  FolderOpen,
  Home,
  MapPin,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { DashboardContextProps } from './types';

export function DashboardQuickActions({
  congregationId,
  isExecutiveTier,
  isTerritoryServantTier,
  isGroupLeaderTier,
  activeAssignments,
  availableTerritories,
  overdueTerritoriesCount,
  totalCongregationUnpinnedCount,
  displayUnpinnedCount,
  myUnpinnedDoorsCount,
  groupActiveAssignments,
  groupUnpinnedCount,
  ledGroup,
  userGroup,
  groups,
  members,
  households,
  territories,
}: DashboardContextProps) {
  if (isExecutiveTier) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            <p className="text-[11px] text-muted-foreground truncate">Activity & S-13/S-89</p>
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
            <p className="text-[11px] text-muted-foreground truncate">{groups.length} groups arranged</p>
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
            <p className="text-[11px] text-muted-foreground truncate">{members.length} members</p>
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
      </div>
    );
  }

  if (isTerritoryServantTier) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            <p className="text-[11px] text-muted-foreground truncate">{territories.length} total zones</p>
          </div>
        </Link>

        <Link
          href={`/congregation/${congregationId}/territories?status=overdue`}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-rose-500/40 hover:bg-muted/50 hover:shadow-xs transition-all group"
        >
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
            <Clock size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate group-hover:text-rose-600 transition-colors">
              Overdue Zones
            </p>
            <p className="text-[11px] text-muted-foreground truncate">{overdueTerritoriesCount} &gt;4 months</p>
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
              {totalCongregationUnpinnedCount > 0 ? `${totalCongregationUnpinnedCount} need coordinates` : 'All pinned'}
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
      </div>
    );
  }

  if (isGroupLeaderTier) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              <p className="text-[11px] text-muted-foreground truncate">{availableTerritories.length} for checkout</p>
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
            <p className="text-[11px] text-muted-foreground truncate">{ledGroup?.members?.length || 0} publishers</p>
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
              {groupUnpinnedCount > 0 ? `${groupUnpinnedCount} in group zones` : 'All pinned'}
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
            <p className="text-[11px] text-muted-foreground truncate">Territory & arrangements</p>
          </div>
        </Link>
      </div>
    );
  }

  // Publisher Tier
  return (
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
            <p className="text-[11px] text-muted-foreground truncate">{availableTerritories.length} for checkout</p>
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
            {myUnpinnedDoorsCount > 0 ? `${myUnpinnedDoorsCount} in your territory` : 'All pinned'}
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
            <p className="text-[11px] text-muted-foreground truncate">{households.length} door records</p>
          </div>
        </Link>
      )}
    </div>
  );
}
