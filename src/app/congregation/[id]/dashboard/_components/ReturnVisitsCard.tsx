'use client';

import { Plus, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { timeAgo } from '@/lib/time-ago';
import type { DashboardContextProps } from './types';

export function ReturnVisitsCard({
  congregationId,
  isGroupLeaderTier,
  groupReturnVisits,
  myReturnVisits,
  territoryMap,
  ledGroup,
  onLogVisit,
}: DashboardContextProps) {
  const returnVisitsList = isGroupLeaderTier ? groupReturnVisits : myReturnVisits;

  if (returnVisitsList.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card border-border shadow-xs overflow-hidden rounded-3xl">
      <CardHeader className="flex flex-row items-center justify-between pb-3 gap-2">
        <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 whitespace-nowrap">
          <UserCheck size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
          <span>
            {isGroupLeaderTier
              ? `${ledGroup?.name || 'Group'} Follow-ups`
              : 'Return Visits & Follow-ups'}
          </span>
        </CardTitle>
        <Button asChild variant="ghost" size="sm" className="text-xs h-7 px-2 shrink-0 text-muted-foreground hover:text-foreground">
          <Link href={`/congregation/${congregationId}/records/households?filter=return_visit`}>
            View All
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {returnVisitsList.map((h) => {
          const terr = h.territoryId ? territoryMap.get(h.territoryId) : null;
          return (
            <div
              key={h.id}
              className="p-3 rounded-2xl border border-border bg-background flex items-center justify-between gap-3 hover:border-purple-400/40 transition-all shadow-2xs"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/congregation/${congregationId}/records/households/${h.id}`}
                    className="font-bold text-xs text-foreground hover:text-primary transition-colors truncate"
                  >
                    {h.houseNumber ? `#${h.houseNumber} ` : ''}
                    {h.streetName || h.address || 'Household'}
                  </Link>
                  <Badge
                    variant="outline"
                    className="text-[9px] uppercase font-bold text-purple-700 bg-purple-50 dark:bg-purple-950/40 border-purple-200"
                  >
                    Return Visit
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
                  {terr && (
                    <span className="truncate font-medium text-foreground">
                      #{terr.number} {terr.name}
                    </span>
                  )}
                  {terr && <span>•</span>}
                  <span className="shrink-0">
                    Last visit {h.lastVisitDate ? timeAgo(h.lastVisitDate) : 'previously'}
                  </span>
                </div>

                {h.notes && (
                  <p className="text-[11px] text-muted-foreground line-clamp-1 italic pt-0.5">
                    &ldquo;{h.notes}&rdquo;
                  </p>
                )}
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => onLogVisit(h)}
                className="rounded-xl text-xs gap-1 h-8 px-2.5 shrink-0 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950/40"
                title="Log a visit"
              >
                <Plus size={12} />
                <span>Log</span>
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
