'use client';

import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  FolderOpen,
  HelpCircle,
  Home,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardContextProps } from './types';

export function RecordsAndResourcesDock({
  congregationId,
  isExecutiveTier,
  isTerritoryServantTier,
  isGroupLeaderTier,
  groups,
  members,
  households,
  territories,
  overdueTerritoriesCount,
  totalCongregationUnpinnedCount,
  ledGroup,
  groupHouseholds,
  onStartTour,
}: DashboardContextProps) {
  return (
    <Card data-tour="records-hub" className="bg-card border-border shadow-xs rounded-3xl min-w-0">
      <CardHeader className="pb-3 min-w-0">
        <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 min-w-0">
          <FileText size={16} className="text-primary shrink-0" />
          <span className="truncate">
            {isExecutiveTier
              ? 'Executive Hub & Records'
              : isTerritoryServantTier
                ? 'Territory Hub'
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
              className="flex items-center justify-between p-3 rounded-2xl border border-border/80 bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                  <BarChart3 size={15} />
                </div>
                <div>
                  <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                    Monthly Ministry Reports
                  </p>
                  <p className="text-[10px] text-muted-foreground">Activity & S-13/S-89 records</p>
                </div>
              </div>
              <ArrowRight size={14} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href={`/congregation/${congregationId}/members`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border/80 bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                  <Users size={15} />
                </div>
                <div>
                  <p className="font-semibold text-xs text-foreground group-hover:text-emerald-600 transition-colors">
                    Publisher Directory
                  </p>
                  <p className="text-[10px] text-muted-foreground">{members.length} active publishers</p>
                </div>
              </div>
              <ArrowRight size={14} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </Link>
          </>
        ) : isTerritoryServantTier ? (
          <>
            <Link
              href={`/congregation/${congregationId}/territories`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border/80 bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                  <Compass size={15} />
                </div>
                <div>
                  <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                    All Territories Inventory
                  </p>
                  <p className="text-[10px] text-muted-foreground">{territories.length} territory zones</p>
                </div>
              </div>
              <ArrowRight size={14} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href={`/congregation/${congregationId}/records/households?filter=unpinned&scope=congregation`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border/80 bg-background hover:bg-muted/50 hover:border-amber-500/30 transition-all group shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                  <MapPin size={15} />
                </div>
                <div>
                  <p className="font-semibold text-xs text-foreground group-hover:text-amber-600 transition-colors">
                    Coordinate Cleanup
                  </p>
                  <p className="text-[10px] text-muted-foreground">{totalCongregationUnpinnedCount} unpinned doors</p>
                </div>
              </div>
              <ArrowRight size={14} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </Link>
          </>
        ) : (
          <>
            <Link
              href={`/congregation/${congregationId}/records/households`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border/80 bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                  <Home size={15} />
                </div>
                <div>
                  <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                    Household Directory
                  </p>
                  <p className="text-[10px] text-muted-foreground">{households.length} door records</p>
                </div>
              </div>
              <ArrowRight size={14} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href={`/congregation/${congregationId}/records/visits`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border/80 bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group shadow-2xs"
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
              <ArrowRight size={14} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </Link>
          </>
        )}

        {/* Overview Map Link */}
        <Link
          href={`/congregation/${congregationId}/territories/overview`}
          className="flex items-center justify-between p-3 rounded-2xl border border-border/80 bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <Compass size={15} />
            </div>
            <div>
              <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                Congregation Map Overview
              </p>
              <p className="text-[10px] text-muted-foreground">All boundary zones</p>
            </div>
          </div>
          <ArrowRight size={14} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        </Link>
      </CardContent>
    </Card>
  );
}
