'use client';

import { ChevronRight, UserCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardContextProps } from './types';

export function ServiceArrangementsWidget({
  congregationId,
  isGroupLeaderTier,
  isExecutiveTier,
  ledGroup,
  userGroup,
  groups,
}: DashboardContextProps) {
  const activeGroup = isGroupLeaderTier ? ledGroup : userGroup;

  if (!activeGroup) {
    return null;
  }

  return (
    <Card className="bg-card border-border shadow-xs overflow-hidden rounded-3xl min-w-0">
      <CardHeader className="p-4 sm:p-6 pb-3 flex flex-row items-center justify-between gap-2 min-w-0">
        <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 min-w-0">
          <Users size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
          <span className="truncate">Service Group</span>
        </CardTitle>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-xs h-7 px-2 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Link href={`/congregation/${congregationId}/groups`}>All ({groups.length})</Link>
        </Button>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-3 min-w-0">
        <div className="p-3 sm:p-3.5 rounded-2xl border border-border bg-background space-y-2.5 min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                <Users size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{activeGroup.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {activeGroup.members?.length || 0} publishers assigned
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/30 border-purple-200 shrink-0"
            >
              Active Group
            </Badge>
          </div>

          <div className="pt-2 border-t border-border/60 text-xs space-y-1.5 text-muted-foreground min-w-0">
            {activeGroup.overseerName && (
              <div className="flex items-center justify-between text-[11px] gap-2 min-w-0">
                <span className="font-medium text-foreground flex items-center gap-1.5 shrink-0">
                  <UserCheck size={12} className="text-purple-600" />
                  Overseer:
                </span>
                <span className="truncate">{activeGroup.overseerName}</span>
              </div>
            )}
            {activeGroup.assistantOverseerName && (
              <div className="flex items-center justify-between text-[11px] gap-2 min-w-0">
                <span className="font-medium text-foreground flex items-center gap-1.5 shrink-0">
                  <UserCheck size={12} className="text-purple-400" />
                  Assistant:
                </span>
                <span className="truncate">{activeGroup.assistantOverseerName}</span>
              </div>
            )}
          </div>
        </div>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full rounded-2xl text-xs font-semibold justify-between h-9 min-w-0 px-3"
        >
          <Link
            href={`/congregation/${congregationId}/groups`}
            className="flex items-center justify-between w-full min-w-0"
          >
            <span className="truncate">
              {isGroupLeaderTier || isExecutiveTier
                ? 'Manage Group & Territories'
                : 'View Group & Territories'}
            </span>
            <ChevronRight size={14} className="shrink-0 ml-1.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
