'use client';

import { Clock, Compass, User, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDaysAgo } from '@/lib/date-utils';
import type { DashboardContextProps } from './types';

export function ActiveTerritoryCard({
  congregationId,
  isGroupLeaderTier,
  ledGroup,
  groupActiveAssignments,
  activeAssignments,
  assignmentsLoading,
  territoryMap,
  coverageByTerritoryId,
  groups,
  availableTerritories,
}: DashboardContextProps) {
  const displayAssignments = isGroupLeaderTier ? groupActiveAssignments : activeAssignments;
  const primaryAssignment = displayAssignments[0];
  const primaryTerritory = primaryAssignment
    ? territoryMap.get(primaryAssignment.territoryId)
    : null;
  const primaryCoverage = primaryAssignment
    ? coverageByTerritoryId.get(primaryAssignment.territoryId) || {
        totalDoors: 0,
        workedDoors: 0,
        coveragePercent: 0,
      }
    : null;

  if (assignmentsLoading) {
    return <div className="h-32 bg-muted/40 animate-pulse rounded-3xl" />;
  }

  if (!primaryAssignment) {
    return (
      <Card className="bg-card border-dashed border-border/80 rounded-3xl shadow-xs">
        <CardContent className="p-5 sm:p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Compass size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Ready for Field Ministry?</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-0.5">
              {isGroupLeaderTier
                ? `No active territory is currently checked out in ${ledGroup?.name || 'your group'}. Check out a zone for group ministry.`
                : 'You do not have any active territory checked out right now. Browse available congregation zones to begin.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
            <Button asChild size="sm" className="rounded-2xl text-xs font-bold gap-1.5 h-9 px-4">
              <Link href={`/congregation/${congregationId}/territories?status=available`}>
                <Compass size={14} />
                <span>Browse Available Zones ({availableTerritories.length})</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-2xl text-xs font-semibold h-9 px-4"
            >
              <Link href={`/congregation/${congregationId}/records/households`}>
                <span>View Household Records</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const assignedGroup = primaryAssignment.serviceGroupId
    ? groups.find((g) => g.id === primaryAssignment.serviceGroupId)
    : null;

  return (
    <Card className="bg-card border-border shadow-xs rounded-3xl overflow-hidden">
      <CardContent className="p-5 sm:p-6 space-y-4">
        {/* Top Header Row: Zone Tag & Launch Map Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg">
                <Zap size={12} />
                <span>
                  {isGroupLeaderTier
                    ? `${ledGroup?.name || 'Group'} Active Zone`
                    : 'Active Territory in Work'}
                </span>
              </span>

              {assignedGroup ? (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 gap-1.5 font-bold py-0.5 px-2"
                >
                  <Users size={11} className="text-purple-600 dark:text-purple-400" />
                  <span>{assignedGroup.name}</span>
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 gap-1.5 font-bold py-0.5 px-2"
                >
                  <User size={11} className="text-blue-600 dark:text-blue-400" />
                  <span>Personal</span>
                </Badge>
              )}
            </div>

            {/* Stylized Territory Number & Name Display */}
            <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
              <Link
                href={`/congregation/${congregationId}/territories/${primaryAssignment.territoryId}`}
                className="group inline-flex items-center gap-2.5 min-w-0"
              >
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-xl bg-primary/10 text-primary font-black text-sm sm:text-base border border-primary/25 shadow-2xs group-hover:bg-primary group-hover:text-primary-foreground transition-all shrink-0">
                  #{primaryTerritory?.number || primaryAssignment.territoryNumber || '1'}
                </span>
                <span className="text-lg sm:text-xl font-extrabold text-foreground group-hover:text-primary transition-colors truncate tracking-tight">
                  {primaryTerritory?.name || primaryAssignment.territoryName || 'Territory'}
                </span>
              </Link>
              {primaryTerritory?.city && (
                <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                  {primaryTerritory.city}
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock size={12} className="text-muted-foreground shrink-0" />
              <span>
                Assigned{' '}
                {primaryAssignment.assignedAt
                  ? formatDaysAgo(primaryAssignment.assignedAt)
                  : 'recently'}
              </span>
            </p>
          </div>

          {/* Action CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              asChild
              className="rounded-2xl font-bold text-xs gap-1.5 h-10 px-5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-102 cursor-pointer w-full sm:w-auto justify-center"
            >
              <Link
                href={`/congregation/${congregationId}/territories/${primaryAssignment.territoryId}`}
              >
                <Compass size={16} />
                <span>Launch Studio Map</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Progress Bar with 3 of 11 doors visited on left, and 27% pushed to top right */}
        {primaryCoverage && primaryCoverage.totalDoors > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">
                <span className="font-bold text-foreground">{primaryCoverage.workedDoors}</span> of{' '}
                <span className="font-bold text-foreground">{primaryCoverage.totalDoors}</span>{' '}
                households visited
              </span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                {primaryCoverage.coveragePercent}%
              </span>
            </div>
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${primaryCoverage.coveragePercent}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
