'use client';

import { Activity, CheckCircle2, Clock, MapPin, Plus, Share2, User } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useShares } from '@/hooks/use-shares';
import { useVisitRecords } from '@/hooks/use-visits';
import { timeAgo } from '@/lib/time-ago';
import type { Household } from '@/types/api';
import type { DashboardContextProps } from './types';

interface FusedActivityItem {
  id: string;
  type: 'visit' | 'pinned_house' | 'share';
  title: string;
  subtitle?: string;
  badgeLabel: string;
  badgeVariant: 'visit' | 'pinned' | 'share';
  date: string;
  contributorName: string;
  isMine: boolean;
  household?: Household | null;
  householdId?: string | null;
}

export function RecentActivityFeed({
  congregationId,
  user,
  onLogVisit,
  households,
  territoryMap,
}: DashboardContextProps) {
  const { visits = [], isLoading: visitsLoading } = useVisitRecords({ congregationId });
  const { incomingShares = [], outgoingShares = [], loading: sharesLoading } = useShares();

  // Combine and sort all activity types chronologically
  const fusedActivities = useMemo(() => {
    const items: FusedActivityItem[] = [];

    // 1. Visits Activity
    for (const v of visits) {
      const h = households.find((item) => item.id === v.householdId);
      const isMine =
        (v.userId && v.userId === user.id) ||
        Boolean(user.name && v.publisherName === user.name);

      const addressFallback =
        v.householdAddress ||
        (h
          ? `${h.houseNumber ? '#' + h.houseNumber + ' ' : ''}${h.streetName || h.address}`
          : 'Household');

      // Primary display is the Name (if present), else the address
      const primaryName = h?.name ? h.name : addressFallback;
      const subtitle = h?.name ? addressFallback : (h?.territoryId ? territoryMap.get(h.territoryId)?.name : undefined);
      const outcomeName = v.outcome?.replace(/_/g, ' ') || 'Visited';

      items.push({
        id: `visit-${v.id}`,
        type: 'visit',
        title: primaryName,
        subtitle: subtitle || undefined,
        badgeLabel: outcomeName,
        badgeVariant: 'visit',
        date: v.visitDate || v.createdAt,
        contributorName: isMine ? 'You' : (v.publisherName || 'Publisher'),
        isMine,
        household: h || null,
        householdId: v.householdId || null,
      });
    }

    // 2. Newly Pinned / Created Households
    for (const h of households) {
      if (!h.createdAt) continue;
      const isMine =
        (h.createdById && h.createdById === user.id) ||
        Boolean(h.creatorName && user.name && h.creatorName === user.name);

      const addressStr = `${h.houseNumber ? '#' + h.houseNumber + ' ' : ''}${h.streetName || h.address || ''}`;
      const primaryName = h.name ? h.name : (addressStr || 'Household');
      const subtitle = h.name ? addressStr : (h.territoryId ? territoryMap.get(h.territoryId)?.name : h.city);

      items.push({
        id: `house-${h.id}`,
        type: 'pinned_house',
        title: primaryName,
        subtitle: subtitle || undefined,
        badgeLabel: 'Pinned House',
        badgeVariant: 'pinned',
        date: h.createdAt,
        contributorName: isMine ? 'You' : (h.creatorName || 'Publisher'),
        isMine,
        household: h,
        householdId: h.id,
      });
    }

    // 3. Shared Records
    const allShares = [...incomingShares, ...outgoingShares];
    for (const s of allShares) {
      if (!s.createdAt) continue;
      const isMine = s.fromUserId === user.id;
      const h = households.find((item) => item.id === s.householdId);

      items.push({
        id: `share-${s.id}`,
        type: 'share',
        title: h?.name || s.householdAddress || 'Shared Household',
        subtitle: isMine ? `Shared with ${s.toUserName}` : `Received from ${s.fromUserName}`,
        badgeLabel: 'Shared',
        badgeVariant: 'share',
        date: s.createdAt,
        contributorName: isMine ? 'You' : (s.fromUserName || 'Publisher'),
        isMine,
        household: h || null,
        householdId: s.householdId || null,
      });
    }

    // Sort by newest date first and take top 6
    return items
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 6);
  }, [visits, households, incomingShares, outgoingShares, user.id, user.name, territoryMap]);

  const isLoading = visitsLoading && sharesLoading;

  if (!isLoading && fusedActivities.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card border-border shadow-xs overflow-hidden rounded-3xl min-w-0">
      <CardHeader className="p-4 sm:p-6 flex flex-row items-center justify-between pb-3 gap-2 min-w-0">
        <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 min-w-0">
          <Activity size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate">Recent Ministry Activity</span>
        </CardTitle>
        <Button asChild variant="ghost" size="sm" className="text-xs h-7 px-2 shrink-0 text-muted-foreground hover:text-foreground">
          <Link href={`/congregation/${congregationId}/records/visits`}>
            View History
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-2.5 min-w-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          fusedActivities.map((act) => {
            return (
              <div
                key={act.id}
                className="p-3 rounded-2xl border border-border bg-background flex items-center justify-between gap-3 hover:border-emerald-500/40 transition-all shadow-2xs min-w-0"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  {/* Top Line: Name & Activity Type Badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {act.householdId ? (
                      <Link
                        href={`/congregation/${congregationId}/records/households/${act.householdId}`}
                        className="font-bold text-xs text-foreground hover:text-primary transition-colors truncate"
                      >
                        {act.title}
                      </Link>
                    ) : (
                      <span className="font-bold text-xs text-foreground truncate">
                        {act.title}
                      </span>
                    )}

                    {/* Activity Type Badge */}
                    {act.badgeVariant === 'pinned' && (
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200 gap-1"
                      >
                        <MapPin size={9} />
                        <span>Pinned House</span>
                      </Badge>
                    )}

                    {act.badgeVariant === 'share' && (
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/40 border-blue-200 gap-1"
                      >
                        <Share2 size={9} />
                        <span>Shared</span>
                      </Badge>
                    )}

                    {act.badgeVariant === 'visit' && (
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200"
                      >
                        {act.badgeLabel}
                      </Badge>
                    )}
                  </div>

                  {/* Subtitle / Address if distinct from Name */}
                  {act.subtitle && act.subtitle !== act.title && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {act.subtitle}
                    </p>
                  )}

                  {/* Contributor Tag + Timestamp */}
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate flex-wrap pt-0.5">
                    {act.isMine ? (
                      <span className="inline-flex items-center gap-1 font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md text-[10px]">
                        <User size={10} />
                        <span>You</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-foreground bg-muted/70 px-1.5 py-0.5 rounded-md text-[10px] truncate max-w-[140px]">
                        <User size={10} className="text-muted-foreground shrink-0" />
                        <span className="truncate">{act.contributorName}</span>
                      </span>
                    )}

                    <span>•</span>

                    <span className="flex items-center gap-1 shrink-0">
                      <Clock size={10} className="text-muted-foreground" />
                      <span>{act.date ? timeAgo(act.date) : 'Recently'}</span>
                    </span>
                  </div>
                </div>

                {/* Action button: ONLY available for items that are MINE */}
                {act.isMine && act.household && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onLogVisit(act.household!)}
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
