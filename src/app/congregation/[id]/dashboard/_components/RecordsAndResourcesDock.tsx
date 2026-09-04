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
      <CardHeader className="p-4 sm:p-6 pb-3 min-w-0">
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
      <CardContent className="p-4 sm:p-6 pt-0 space-y-2 min-w-0">
        {isExecutiveTier ? (
          <>
            <Link
              href={`/congregation/${congregationId}/reports`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border/80 bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group shadow-2xs min-w-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform shrink-0">
                  <BarChart3 size={15} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                    Monthly Ministry Reports
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    Activity & S-13/S-89 records
                  </p>
                </div>
              </div>
              <ArrowRight
                size={14}
                className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5"
              />
            </Link>

            <Link
              href={`/congregation/${congregationId}/members`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border/80 bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group shadow-2xs min-w-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                  <Users size={15} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-foreground group-hover:text-emerald-600 transition-colors truncate">
                    Publisher Directory
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {members.length} active publishers
                  </p>
                </div>
              </div>
              <ArrowRight
                size={14}
                className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5"
              />
            </Link>
          </>
        ) : isTerritoryServantTier ? (
          <>
            <Link
              href={`/congregation/${congregationId}/territories`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border/80 bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group shadow-2xs min-w-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform shrink-0">
                  <Compass size={15} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                    All Territories Inventory
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {territories.length} territory zones
                  </p>
                </div>
              </div>
              <ArrowRight
                size={14}
                className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5"
              />
            </Link>

            <Link
              href={`/congregation/${congregationId}/records/households?filter=unpinned&scope=congregation`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border/80 bg-background hover:bg-muted/50 hover:border-amber-500/30 transition-all group shadow-2xs min-w-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform shrink-0">
                  <MapPin size={15} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-foreground group-hover:text-amber-600 transition-colors truncate">
                    Coordinate Cleanup
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {totalCongregationUnpinnedCount} unpinned households
                  </p>
                </div>
              </div>
              <ArrowRight
                size={14}
                className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5"
              />
            </Link>
          </>
        ) : (
          <>
            <Link
              href={`/congregation/${congregationId}/records/households`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border/80 bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group shadow-2xs min-w-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform shrink-0">
                  <Home size={15} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                    Household Directory
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {households.length} household records
                  </p>
                </div>
              </div>
              <ArrowRight
                size={14}
                className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5"
              />
            </Link>

            <Link
              href={`/congregation/${congregationId}/records/visits`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border/80 bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group shadow-2xs min-w-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                  <CheckCircle2 size={15} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-foreground group-hover:text-emerald-600 transition-colors truncate">
                    Visit History
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">Household visit logs</p>
                </div>
              </div>
              <ArrowRight
                size={14}
                className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5"
              />
            </Link>
          </>
        )}

        {/* Overview Map Link */}
        <Link
          href={`/congregation/${congregationId}/territories/overview`}
          className="flex items-center justify-between p-3 rounded-2xl border border-border/80 bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group shadow-2xs min-w-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform shrink-0">
              <Compass size={15} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                Congregation Map Overview
              </p>
              <p className="text-[10px] text-muted-foreground truncate">All boundary zones</p>
            </div>
          </div>
          <ArrowRight
            size={14}
            className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5"
          />
        </Link>
      </CardContent>
    </Card>
  );
}
