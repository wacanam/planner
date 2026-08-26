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
  Home,
  MapPin,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardContextProps } from './types';

export function RecordsHubCard({
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
}: DashboardContextProps) {
  return (
    <Card data-tour="records-hub" className="bg-card border-border shadow-xs rounded-3xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <FileText size={16} className="text-primary" />
          <span>
            {isExecutiveTier
              ? 'Executive & Reports Hub'
              : isTerritoryServantTier
                ? 'Territory Management Hub'
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
              className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
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
              <ArrowRight
                size={14}
                className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
              />
            </Link>

            <Link
              href={`/congregation/${congregationId}/groups`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                  <FolderOpen size={15} />
                </div>
                <div>
                  <p className="font-semibold text-xs text-foreground group-hover:text-purple-600 transition-colors">
                    Service Groups Management
                  </p>
                  <p className="text-[10px] text-muted-foreground">{groups.length} groups arranged</p>
                </div>
              </div>
              <ArrowRight
                size={14}
                className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
              />
            </Link>

            <Link
              href={`/congregation/${congregationId}/members`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
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
              <ArrowRight
                size={14}
                className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
              />
            </Link>
          </>
        ) : isTerritoryServantTier ? (
          <>
            <Link
              href={`/congregation/${congregationId}/territories`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
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
              <ArrowRight
                size={14}
                className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
              />
            </Link>

            <Link
              href={`/congregation/${congregationId}/territories?status=overdue`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-rose-500/30 transition-all group"
            >
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
                <Clock size={15} />
              </div>
              <div>
                <p className="font-semibold text-xs text-foreground group-hover:text-rose-600 transition-colors">
                  Overdue Territories
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {overdueTerritoriesCount} active &gt;4 months
                </p>
              </div>
              <ArrowRight
                size={14}
                className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
              />
            </Link>

            <Link
              href={`/congregation/${congregationId}/records/households?filter=unpinned&scope=congregation`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-amber-500/30 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                  <MapPin size={15} />
                </div>
                <div>
                  <p className="font-semibold text-xs text-foreground group-hover:text-amber-600 transition-colors">
                    Coordinate Cleanup
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {totalCongregationUnpinnedCount} unpinned doors
                  </p>
                </div>
              </div>
              <ArrowRight
                size={14}
                className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
              />
            </Link>
          </>
        ) : isGroupLeaderTier ? (
          <>
            <Link
              href={`/congregation/${congregationId}/records/households`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                  <Home size={15} />
                </div>
                <div>
                  <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                    Group Household Records
                  </p>
                  <p className="text-[10px] text-muted-foreground">{groupHouseholds.length} door records</p>
                </div>
              </div>
              <ArrowRight
                size={14}
                className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
              />
            </Link>

            <Link
              href={`/congregation/${congregationId}/records/visits`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                  <CheckCircle2 size={15} />
                </div>
                <div>
                  <p className="font-semibold text-xs text-foreground group-hover:text-emerald-600 transition-colors">
                    Group Visit Logs
                  </p>
                  <p className="text-[10px] text-muted-foreground">Field activity</p>
                </div>
              </div>
              <ArrowRight
                size={14}
                className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
              />
            </Link>

            <Link
              href={`/congregation/${congregationId}/records/shared`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                  <Users size={15} />
                </div>
                <div>
                  <p className="font-semibold text-xs text-foreground group-hover:text-purple-600 transition-colors">
                    Group Shared Records
                  </p>
                  <p className="text-[10px] text-muted-foreground">Collaborate in {ledGroup?.name || 'Group'}</p>
                </div>
              </div>
              <ArrowRight
                size={14}
                className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
              />
            </Link>
          </>
        ) : (
          // Publisher Tier
          <>
            <Link
              href={`/congregation/${congregationId}/records/households`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
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
              <ArrowRight
                size={14}
                className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
              />
            </Link>

            <Link
              href={`/congregation/${congregationId}/records/visits`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
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
              <ArrowRight
                size={14}
                className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
              />
            </Link>

            <Link
              href={`/congregation/${congregationId}/records/shared`}
              className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                  <Users size={15} />
                </div>
                <div>
                  <p className="font-semibold text-xs text-foreground group-hover:text-purple-600 transition-colors">
                    Shared Records
                  </p>
                  <p className="text-[10px] text-muted-foreground">Collaborate with publishers</p>
                </div>
              </div>
              <ArrowRight
                size={14}
                className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
              />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
