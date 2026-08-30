'use client';

import { TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { ServiceYearCountdown } from '@/components/service-year-countdown';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { DashboardContextProps } from './types';

export function DashboardProgressGauge({
  congregationId,
  isExecutiveTier,
  isTerritoryServantTier,
  isGroupLeaderTier,
  workedDoorsCount,
  totalDoorsCount,
  congregationCoveragePercent,
  availableTerritories,
  inWorkTerritoriesCount,
  overdueTerritoriesCount,
  ledGroup,
  groupCoverage,
  groupActiveAssignments,
  groupHouseholds,
  groupReturnVisits,
}: DashboardContextProps) {
  if (isExecutiveTier || isTerritoryServantTier) {
    return (
      <Card
        data-tour="congregation-coverage"
        className="bg-card border-border shadow-xs overflow-hidden rounded-3xl"
      >
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-primary/10 text-primary shrink-0">
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
            <div className="flex items-center gap-2 flex-wrap">
              <ServiceYearCountdown variant="compact" />
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

          {/* Micro Status Indicators */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Link
              href={`/congregation/${congregationId}/territories?status=available`}
              className="p-2.5 rounded-2xl border border-border/70 bg-background/50 hover:bg-muted/50 transition-colors text-center group"
            >
              <p className="text-xs font-bold text-foreground group-hover:scale-105 transition-transform">
                {availableTerritories.length}
              </p>
              <p className="text-[10px] text-muted-foreground">Available</p>
            </Link>

            <Link
              href={`/congregation/${congregationId}/territories?status=assigned`}
              className="p-2.5 rounded-2xl border border-border/70 bg-background/50 hover:bg-muted/50 transition-colors text-center group"
            >
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                {inWorkTerritoriesCount}
              </p>
              <p className="text-[10px] text-muted-foreground">In Work</p>
            </Link>

            <Link
              href={`/congregation/${congregationId}/territories?status=overdue`}
              className="p-2.5 rounded-2xl border border-border/70 bg-background/50 hover:bg-muted/50 transition-colors text-center group"
            >
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
                {overdueTerritoriesCount}
              </p>
              <p className="text-[10px] text-muted-foreground">Overdue (&gt;4 mos)</p>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isGroupLeaderTier) {
    return (
      <Card
        data-tour="congregation-coverage"
        className="bg-card border-border shadow-xs overflow-hidden rounded-3xl"
      >
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                <Users size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground tracking-tight">
                  {ledGroup?.name || 'Service Group'} Territory Progress
                </h2>
                <p className="text-xs text-muted-foreground">
                  {groupCoverage.workedDoors} of {groupCoverage.totalDoors} doors completed in group zones
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
              className="p-2.5 rounded-2xl bg-background border border-border hover:border-purple-500/40 hover:bg-purple-50/20 dark:hover:bg-purple-950/20 transition-all block group"
            >
              <p className="text-xs font-bold text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                {groupActiveAssignments.length}
              </p>
              <p className="text-[10px] text-muted-foreground">Group Active Zones</p>
            </Link>
            <Link
              href={`/congregation/${congregationId}/records/households`}
              className="p-2.5 rounded-2xl bg-background border border-border hover:border-blue-500/40 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all block group"
            >
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                {groupHouseholds.length}
              </p>
              <p className="text-[10px] text-muted-foreground">Group Doors</p>
            </Link>
            <Link
              href={`/congregation/${congregationId}/records/households?filter=return_visit`}
              className="p-2.5 rounded-2xl bg-background border border-border hover:border-emerald-500/40 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all block group"
            >
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                {groupReturnVisits.length}
              </p>
              <p className="text-[10px] text-muted-foreground">Group Follow-ups</p>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
