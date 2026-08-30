'use client';

import {
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Info,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  getServiceYear,
  getServiceYearCountdown,
  getServiceYearRange,
  type ServiceYearCountdownInfo,
  type ServiceYearPhase,
} from '@/lib/service-year';

export interface ServiceYearCountdownProps {
  variant?: 'compact' | 'badge' | 'full' | 'banner';
  serviceYear?: number | 'all';
  coveragePercent?: number;
  workedTerritoriesCount?: number;
  totalTerritoriesCount?: number;
  unworkedTerritoriesCount?: number;
  className?: string;
  onFilterUnworked?: () => void;
}

export function ServiceYearCountdown({
  variant = 'compact',
  serviceYear,
  coveragePercent,
  workedTerritoriesCount,
  totalTerritoriesCount,
  unworkedTerritoriesCount,
  className = '',
  onFilterUnworked,
}: ServiceYearCountdownProps) {
  const currentSY = getServiceYear();
  const activeSY = serviceYear === 'all' || !serviceYear ? currentSY : serviceYear;
  const range = useMemo(() => getServiceYearRange(activeSY), [activeSY]);

  const countdown: ServiceYearCountdownInfo = useMemo(() => {
    return getServiceYearCountdown(new Date(), activeSY);
  }, [activeSY]);

  // Calculate annual territory pacing if coverage percent is available
  const pacing = useMemo(() => {
    if (typeof coveragePercent !== 'number' || countdown.isPastServiceYear) return null;
    const diff = coveragePercent - countdown.percentYearElapsed;

    if (diff >= 10) {
      return {
        label: 'Ahead of Pace',
        badgeVariant: 'default' as const,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
      };
    }
    if (diff >= -10) {
      return {
        label: 'On Track',
        badgeVariant: 'outline' as const,
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400',
      };
    }
    return {
      label: 'Needs Focus',
      badgeVariant: 'outline' as const,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
    };
  }, [coveragePercent, countdown]);

  const phaseBadgeVariant = useMemo(() => {
    switch (countdown.phase) {
      case 'final_push':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30';
      case 'campaign':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
      case 'transition':
        return 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30';
      case 'early':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-primary/15 text-primary border-primary/30';
    }
  }, [countdown.phase]);

  // 1. Compact Pill variant (for card headers / widgets)
  if (variant === 'compact' || variant === 'badge') {
    if (countdown.isPastServiceYear) {
      return (
        <Badge
          variant="outline"
          className={`text-[11px] font-semibold gap-1.5 py-0.5 px-2.5 bg-muted/80 text-muted-foreground border-border ${className}`}
        >
          <CheckCircle2 size={12} className="text-muted-foreground" />
          <span>{range.shortLabel} Concluded</span>
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className={`text-[11px] font-bold gap-1.5 py-0.5 px-2.5 bg-primary/10 text-primary border-primary/30 shadow-2xs ${className}`}
        title={`${range.label}: Ends ${countdown.endDateFormatted}`}
      >
        <Clock size={12} className="text-primary animate-pulse" />
        <span>
          {countdown.daysRemaining}d left in {range.shortLabel}
        </span>
      </Badge>
    );
  }

  // 2. Full Pacing Banner variant (for Reports screen header)
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-primary/5 p-5 sm:p-6 shadow-xs ${className}`}
    >
      {/* Background glow effects */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/15 text-primary shrink-0 shadow-2xs">
              <Calendar size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">
                  {range.label}
                </h3>
                <Badge
                  variant="outline"
                  className={`text-[11px] font-bold py-0.5 px-2 border ${phaseBadgeVariant}`}
                >
                  {countdown.phaseTitle}
                </Badge>
                {pacing && (
                  <Badge variant="outline" className={`text-[11px] font-bold py-0.5 px-2 border ${pacing.bg}`}>
                    {pacing.label}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {countdown.phaseDescription} • Ends {countdown.endDateFormatted}
              </p>
            </div>
          </div>

          {/* Countdown Highlight Box */}
          <div className="flex items-center gap-2 shrink-0">
            {countdown.isPastServiceYear ? (
              <div className="px-3.5 py-1.5 rounded-2xl bg-muted border border-border text-center">
                <p className="text-xs font-bold text-muted-foreground">Historical Record</p>
                <p className="text-[10px] text-muted-foreground">Concluded</p>
              </div>
            ) : (
              <div className="px-4 py-2 rounded-2xl bg-background/90 border border-primary/25 text-center shadow-2xs">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-xl sm:text-2xl font-black text-primary">
                    {countdown.daysRemaining}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground uppercase">Days</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Remaining in {range.shortLabel}</p>
              </div>
            )}
          </div>
        </div>

        {/* Progress & Pacing Metrics */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
              <Clock size={13} className="text-primary" />
              Annual Timeline Elapsed
            </span>
            <span className="font-bold text-foreground">{countdown.percentYearElapsed}% of Year Passed</span>
          </div>

          <div className="h-2.5 w-full bg-muted/80 rounded-full overflow-hidden flex shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-500 rounded-full"
              style={{ width: `${countdown.percentYearElapsed}%` }}
            />
          </div>
        </div>

        {/* Bottom Pacing Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div className="p-3 rounded-2xl bg-background/60 border border-border/80 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Time Left</p>
            <p className="text-sm sm:text-base font-extrabold text-foreground mt-0.5">
              {countdown.isPastServiceYear
                ? 'Concluded'
                : `${countdown.monthsRemaining} mo (${countdown.daysRemaining}d)`}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-background/60 border border-border/80 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SY Coverage</p>
            <p className="text-sm sm:text-base font-extrabold text-foreground mt-0.5">
              {typeof coveragePercent === 'number' ? `${coveragePercent}%` : '—'}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-background/60 border border-border/80 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Territories Worked</p>
            <p className="text-sm sm:text-base font-extrabold text-foreground mt-0.5">
              {typeof workedTerritoriesCount === 'number' && typeof totalTerritoriesCount === 'number'
                ? `${workedTerritoriesCount} / ${totalTerritoriesCount}`
                : '—'}
            </p>
          </div>

          <div
            onClick={onFilterUnworked}
            className={`p-3 rounded-2xl border text-center transition-all ${
              onFilterUnworked
                ? 'bg-background/80 border-border/80 hover:border-amber-500/50 hover:bg-amber-50/10 cursor-pointer group'
                : 'bg-background/60 border-border/80'
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
              <Flame size={11} className="text-amber-500" />
              Unworked In SY
            </p>
            <p className="text-sm sm:text-base font-extrabold text-foreground mt-0.5 group-hover:scale-105 transition-transform">
              {typeof unworkedTerritoriesCount === 'number' ? unworkedTerritoriesCount : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
