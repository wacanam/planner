'use client';

import {
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  Eye,
  FolderOpen,
  MapPin,
  Plus,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDaysAgo } from '@/lib/date-utils';
import type { DashboardContextProps, DashboardRole } from './types';

export function DashboardHeroDeck({
  congregationId,
  user,
  congregation,
  effectiveRole,
  isExecutiveTier,
  isTerritoryServantTier,
  isGroupLeaderTier,
  previewRole,
  setPreviewRole,
  ledGroup,
  userGroup,
  groupActiveAssignments,
  activeAssignments,
  assignmentsLoading,
  territoryMap,
  coverageByTerritoryId,
  groups,
  availableTerritories,
  onStartTour,
  onLogVisit,
  households,
}: DashboardContextProps) {
  const isPreviewActive = previewRole !== 'auto';
  const displayAssignments = isGroupLeaderTier ? groupActiveAssignments : activeAssignments;
  const primaryAssignment = displayAssignments[0];
  const primaryTerritory = primaryAssignment ? territoryMap.get(primaryAssignment.territoryId) : null;
  const primaryCoverage = primaryAssignment
    ? coverageByTerritoryId.get(primaryAssignment.territoryId) || {
        totalDoors: 0,
        workedDoors: 0,
        coveragePercent: 0,
      }
    : null;

  return (
    <div
      data-tour="welcome-banner"
      className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-background to-primary/5 p-5 sm:p-7 shadow-sm transition-all"
    >
      {/* Subtle decorative background glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-5">
        {/* Top Control Bar: User Greeting + Role Switcher + Tour */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/50">
          <div className="space-y-1 min-w-0">
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
                  className="text-xs font-semibold bg-muted/80 text-muted-foreground border-border gap-1 py-0.5"
                >
                  <FolderOpen size={11} className="text-primary" />
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

          {/* Right Top Controls: Role Switcher & Tour Guide */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* View As Selector */}
            <div className="inline-flex items-center gap-1.5 rounded-2xl border border-border/80 bg-background/95 px-3 py-1.5 text-xs shadow-2xs">
              <Eye size={13} className={isPreviewActive ? 'text-amber-500 animate-pulse' : 'text-muted-foreground'} />
              <label htmlFor="hero-role-preview-select" className="text-[11px] font-medium text-muted-foreground">
                View As:
              </label>
              <select
                id="hero-role-preview-select"
                aria-label="Dashboard role view selector"
                value={previewRole}
                onChange={(e) => setPreviewRole(e.target.value as DashboardRole)}
                className="bg-transparent font-bold text-foreground text-xs focus:outline-hidden cursor-pointer"
              >
                <option value="auto">Auto (Default)</option>
                <option value="publisher">Publisher</option>
                <option value="group_overseer">Group Overseer</option>
                <option value="group_assistant">Group Assistant</option>
                <option value="territory_servant">Territory Servant</option>
                <option value="service_overseer">Service Overseer</option>
                <option value="admin">Administrator</option>
              </select>
              {isPreviewActive && (
                <button
                  type="button"
                  onClick={() => setPreviewRole('auto')}
                  className="text-amber-600 dark:text-amber-400 hover:opacity-80 transition-opacity ml-1 flex items-center gap-0.5 text-[10px] font-bold"
                  title="Reset to your real role"
                >
                  <RotateCcw size={10} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onStartTour}
              className="rounded-2xl text-xs font-semibold gap-1.5 h-8 px-3 bg-background/90 hover:bg-muted border-border hover:border-primary/40 transition-all cursor-pointer shrink-0 shadow-2xs"
              title="Start tour"
            >
              <Sparkles size={13} className="text-amber-500" />
              <span>Tour</span>
            </Button>
          </div>
        </div>

        {/* Hero Mission Spotlight: Active Territory or Start Ministry Card */}
        {assignmentsLoading ? (
          <div className="h-28 bg-muted/40 animate-pulse rounded-2xl" />
        ) : primaryAssignment ? (
          <div className="bg-background/95 border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    <Zap size={12} />
                    <span>{isGroupLeaderTier ? `${ledGroup?.name || 'Group'} Active Zone` : 'Active Territory in Work'}</span>
                  </span>

                  {primaryAssignment.serviceGroupId && (
                    <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950/40 border-purple-200 gap-1">
                      <FolderOpen size={10} />
                      <span>{groups.find((g) => g.id === primaryAssignment.serviceGroupId)?.name || 'Group'}</span>
                    </Badge>
                  )}
                </div>

                <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
                  <Link
                    href={`/congregation/${congregationId}/territories/${primaryAssignment.territoryId}`}
                    className="text-lg sm:text-xl font-extrabold text-foreground hover:text-primary transition-colors truncate"
                  >
                    #{primaryTerritory?.number || primaryAssignment.territoryNumber || '1'} — {primaryTerritory?.name || primaryAssignment.territoryName || 'Territory'}
                  </Link>
                  {primaryTerritory?.city && (
                    <span className="text-xs text-muted-foreground">({primaryTerritory.city})</span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock size={12} className="text-muted-foreground" />
                  <span>Assigned {primaryAssignment.assignedAt ? formatDaysAgo(primaryAssignment.assignedAt) : 'recently'}</span>
                  {primaryCoverage && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-foreground">
                        {primaryCoverage.workedDoors} of {primaryCoverage.totalDoors} doors completed ({primaryCoverage.coveragePercent}%)
                      </span>
                    </>
                  )}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                <Button
                  asChild
                  className="rounded-2xl font-bold text-xs gap-1.5 h-10 px-5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-102 cursor-pointer"
                >
                  <Link href={`/congregation/${congregationId}/territories/${primaryAssignment.territoryId}`}>
                    <Compass size={16} />
                    <span>Launch Studio Map</span>
                  </Link>
                </Button>
              </div>
            </div>

            {/* Visual Progress Bar */}
            {primaryCoverage && primaryCoverage.totalDoors > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${primaryCoverage.coveragePercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty State: Ready for ministry */
          <div className="bg-background/90 border border-dashed border-border/80 rounded-2xl p-5 sm:p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Compass size={24} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Ready for Field Ministry?</h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-0.5">
                {isGroupLeaderTier
                  ? `No active territory is currently checked out in ${ledGroup?.name || 'your group'}. Check out a zone for group ministry.`
                  : 'You do not have any active territory checked out right now. Browse available congregation zones to begin.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
              <Button asChild size="sm" className="rounded-2xl text-xs font-bold gap-1.5 h-9 px-4">
                <Link href={`/congregation/${congregationId}/territories?status=available`}>
                  <Compass size={14} />
                  <span>Browse Available Zones ({availableTerritories.length})</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-2xl text-xs font-semibold h-9 px-4">
                <Link href={`/congregation/${congregationId}/records/households`}>
                  <span>View Household Records</span>
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
