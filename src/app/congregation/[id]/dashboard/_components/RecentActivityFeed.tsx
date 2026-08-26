'use client';

import { Activity, Clock, Plus, User, Users } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVisitRecords } from '@/hooks/use-visits';
import { timeAgo } from '@/lib/time-ago';
import type { Household, Visit } from '@/types/api';
import type { DashboardContextProps } from './types';

export function RecentActivityFeed({
  congregationId,
  user,
  onLogVisit,
  households,
}: DashboardContextProps) {
  const { visits = [], isLoading } = useVisitRecords({ congregationId });

  const { myVisits, congregationVisits } = useMemo(() => {
    const my: typeof visits = [];
    const others: typeof visits = [];

    for (const v of visits) {
      const isMine =
        (v.userId && v.userId === user.id) ||
        Boolean(user.name && v.publisherName === user.name);
      if (isMine) {
        my.push(v);
      } else {
        others.push(v);
      }
    }

    return {
      myVisits: my.slice(0, 3),
      congregationVisits: others.slice(0, 4),
    };
  }, [visits, user.id, user.name]);

  const renderVisitItem = (v: (typeof visits)[0], isPersonal = false) => {
    const h = households.find((item) => item.id === v.householdId);
    const address =
      v.householdAddress ||
      (h
        ? `${h.houseNumber ? '#' + h.houseNumber + ' ' : ''}${h.streetName || h.address}`
        : 'Household');
    const outcomeName = v.outcome?.replace(/_/g, ' ') || 'Visited';

    return (
      <div
        key={v.id}
        className="p-3 rounded-2xl border border-border bg-background flex items-center justify-between gap-3 hover:border-emerald-500/40 transition-all shadow-2xs"
      >
        <div className="min-w-0 flex-1 space-y-1">
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
            {isPersonal ? (
              <span className="flex items-center gap-1 font-semibold text-primary">
                <User size={10} className="shrink-0" />
                <span>You</span>
              </span>
            ) : (
              v.publisherName && (
                <span className="flex items-center gap-1 truncate">
                  <User size={10} className="text-muted-foreground shrink-0" />
                  <span className="truncate">{v.publisherName}</span>
                </span>
              )
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
  };

  const hasAnyVisits = myVisits.length > 0 || congregationVisits.length > 0;

  if (!isLoading && !hasAnyVisits) {
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
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            {/* 1. Primary: My Recent Activity */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <User size={13} className="text-primary" />
                <span>My Activity</span>
                {myVisits.length > 0 && (
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    ({myVisits.length})
                  </span>
                )}
              </div>

              {myVisits.length > 0 ? (
                <div className="space-y-2">
                  {myVisits.map((v) => renderVisitItem(v, true))}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl border border-dashed border-border/80 bg-background/50 text-center text-xs text-muted-foreground">
                  No personal visits recorded recently.
                </div>
              )}
            </div>

            {/* 2. Secondary: Congregation Activity */}
            <div className="space-y-2 pt-1 border-t border-border/50">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground pt-1">
                <Users size={13} className="text-purple-600 dark:text-purple-400" />
                <span>Congregation Activity</span>
                {congregationVisits.length > 0 && (
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    ({congregationVisits.length})
                  </span>
                )}
              </div>

              {congregationVisits.length > 0 ? (
                <div className="space-y-2">
                  {congregationVisits.map((v) => renderVisitItem(v, false))}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl border border-dashed border-border/80 bg-background/50 text-center text-xs text-muted-foreground">
                  No other congregation activity recorded recently.
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
