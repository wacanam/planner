'use client';

import { Activity, CheckCircle2, Clock, Plus, User } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVisitRecords } from '@/hooks/use-visits';
import { timeAgo } from '@/lib/time-ago';
import type { DashboardContextProps } from './types';

export function RecentActivityFeed({
  congregationId,
  isExecutiveTier,
  isGroupLeaderTier,
  ledGroup,
  onLogVisit,
  households,
}: DashboardContextProps) {
  const { visits = [], isLoading } = useVisitRecords({ congregationId });

  const recentVisits = useMemo(() => {
    return visits.slice(0, 4);
  }, [visits]);

  if (!isLoading && recentVisits.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card border-border shadow-xs overflow-hidden rounded-3xl">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Activity size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span>Recent Ministry Activity</span>
        </CardTitle>
        <Button asChild variant="ghost" size="sm" className="text-xs h-8">
          <Link href={`/congregation/${congregationId}/records/visits`}>
            View History
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          recentVisits.map((v) => {
            const h = households.find((item) => item.id === v.householdId);
            const address = v.householdAddress || (h ? `${h.houseNumber ? '#' + h.houseNumber + ' ' : ''}${h.streetName || h.address}` : 'Household');
            const outcomeName = v.outcome?.replace(/_/g, ' ') || 'Visited';

            return (
              <div
                key={v.id}
                className="p-3 rounded-2xl border border-border bg-background flex items-center justify-between gap-3 hover:border-emerald-500/40 transition-all"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/congregation/${congregationId}/records/households/${v.householdId}`}
                      className="font-bold text-xs text-foreground hover:text-primary transition-colors truncate"
                    >
                      {address}
                    </Link>
                    <Badge
                      variant="outline"
                      className="text-[9px] uppercase font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200"
                    >
                      {outcomeName}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
                    {v.publisherName && (
                      <span className="flex items-center gap-1 truncate">
                        <User size={10} className="text-muted-foreground shrink-0" />
                        <span className="truncate">{v.publisherName}</span>
                      </span>
                    )}
                    <span>•</span>
                    <span className="flex items-center gap-1 shrink-0">
                      <Clock size={10} className="text-muted-foreground" />
                      <span>{v.visitDate ? timeAgo(v.visitDate) : 'Recently'}</span>
                    </span>
                  </div>
                </div>

                {h && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onLogVisit(h)}
                    className="rounded-xl text-xs gap-1 h-8 px-2.5 shrink-0 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
                    title="Log visit on this door"
                  >
                    <Plus size={12} />
                    <span>Log</span>
                  </Button>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
