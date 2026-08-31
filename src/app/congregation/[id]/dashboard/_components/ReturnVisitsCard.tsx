'use client';

import { useMemo } from 'react';
import { Plus, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { normalizeHouseholdStatus, normalizeVisitOutcome } from '@/lib/status-rules';
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

  const studyCount = useMemo(() => {
    return returnVisitsList.filter((h) => {
      const s = normalizeHouseholdStatus(h.status);
      const outcome = normalizeVisitOutcome(h.lastVisitOutcome);
      return (
        s === 'bible_study' ||
        outcome === 'study_conducted' ||
        outcome === 'study_offered' ||
        h.notes?.toLowerCase().includes('study')
      );
    }).length;
  }, [returnVisitsList]);

  if (returnVisitsList.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card border-border shadow-xs overflow-hidden rounded-3xl min-w-0">
      <CardHeader className="p-4 sm:p-6 flex flex-row items-center justify-between pb-3 gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <UserCheck size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
          <CardTitle className="text-sm sm:text-base font-bold truncate">
            {isGroupLeaderTier
              ? `${ledGroup?.name || 'Group'} Follow-ups`
              : 'Return Visits & Follow-ups'}
          </CardTitle>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-semibold">
              {returnVisitsList.length}
            </Badge>
            {studyCount > 0 && (
              <Badge className="text-[10px] px-1.5 py-0 h-5 font-semibold bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30">
                {studyCount} {studyCount === 1 ? 'study' : 'studies'}
              </Badge>
            )}
          </div>
        </div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-xs h-7 px-2 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Link href={`/congregation/${congregationId}/records/households?filter=return_visit`}>
            View All
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-2.5 min-w-0">
        {returnVisitsList.map((h) => {
          const terr = h.territoryId ? territoryMap.get(h.territoryId) : null;
          const isStudy =
            h.lastVisitOutcome === 'study_conducted' ||
            h.lastVisitOutcome === 'study_offered' ||
            h.notes?.toLowerCase().includes('study');
          const isMissed = h.lastVisitOutcome === 'return_visit_missed' || h.lastVisitOutcome === 'study_missed';

          return (
            <div
              key={h.id}
              className="p-3 rounded-2xl border border-border bg-background flex items-center justify-between gap-3 hover:border-purple-400/40 transition-all shadow-2xs min-w-0"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <Link
                    href={`/congregation/${congregationId}/records/households/${h.id}`}
                    className="font-bold text-xs text-foreground hover:text-primary transition-colors truncate"
                  >
                    {h.houseNumber ? `#${h.houseNumber} ` : ''}
                    {h.streetName || h.address || 'Household'}
                  </Link>
                  {isStudy ? (
                    <Badge
                      variant="outline"
                      className="text-[9px] uppercase font-bold text-violet-700 bg-violet-50 dark:bg-violet-950/40 border-violet-200 shrink-0"
                    >
                      Bible Study
                    </Badge>
                  ) : isMissed ? (
                    <Badge
                      variant="outline"
                      className="text-[9px] uppercase font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200 shrink-0"
                    >
                      Missed Call
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[9px] uppercase font-bold text-purple-700 bg-purple-50 dark:bg-purple-950/40 border-purple-200 shrink-0"
                    >
                      Return Visit
                    </Badge>
                  )}
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
