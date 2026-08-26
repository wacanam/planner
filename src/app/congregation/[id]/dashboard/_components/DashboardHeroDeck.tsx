'use client';

import {
  Building2,
  Sparkles,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DashboardContextProps } from './types';

export function DashboardHeroDeck({
  user,
  congregation,
  effectiveRole,
  isGroupLeaderTier,
  userGroup,
  onStartTour,
}: DashboardContextProps) {
  return (
    <div
      data-tour="welcome-banner"
      className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-background to-primary/5 p-5 sm:p-6 shadow-sm transition-all"
    >
      {/* Subtle decorative background glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">
              Hi, {user.name || 'Publisher'}
            </h1>
            <span className="text-xl">👋</span>

            <Badge
              variant="outline"
              className="text-xs uppercase font-bold bg-primary/15 text-primary border-primary/30 py-0.5 px-2.5 shadow-2xs"
            >
              {effectiveRole}
            </Badge>

            {userGroup && !isGroupLeaderTier && (
              <Badge
                variant="outline"
                className="text-xs font-semibold bg-muted/80 text-muted-foreground border-border gap-1.5 py-0.5"
              >
                <Users size={12} className="text-primary" />
                <span>{userGroup.name}</span>
              </Badge>
            )}
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
            <Building2 size={14} className="text-primary shrink-0" />
            <span className="font-semibold text-foreground">{congregation?.name || 'Congregation Workspace'}</span>
            {congregation?.city && <span>• {congregation.city}</span>}
          </p>
        </div>

        {/* Right Top Controls: Tour Guide */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onStartTour}
            className="rounded-2xl text-xs font-semibold gap-1.5 h-8 px-3 bg-background/90 hover:bg-muted border-border hover:border-primary/40 transition-all cursor-pointer shrink-0 shadow-2xs"
            title="Start tour"
          >
            <Sparkles size={13} className="text-amber-500" />
            <span>Tour Guide</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
