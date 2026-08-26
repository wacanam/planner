'use client';

import {
  BarChart3,
  Building2,
  Compass,
  Eye,
  FolderOpen,
  MapPin,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DashboardContextProps, DashboardRole } from './types';

export function DashboardWelcomeBanner({
  congregationId,
  user,
  congregation,
  effectiveRole,
  isExecutiveTier,
  isTerritoryServantTier,
  isGroupLeaderTier,
  _isPublisherTier,
  previewRole,
  setPreviewRole,
  ledGroup,
  userGroup,
  onStartTour,
}: DashboardContextProps & { _isPublisherTier?: boolean }) {
  const isPreviewActive = previewRole !== 'auto';

  return (
    <div
      data-tour="welcome-banner"
      className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-5 sm:p-6 shadow-xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="space-y-2 min-w-0 flex-1">
          {/* Main Title & Role Badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">
              Welcome back, {user.name || 'Publisher'}! 👋
            </h1>
            <Badge
              variant="outline"
              className="text-xs uppercase font-bold bg-primary/10 text-primary border-primary/30 py-0.5 px-2.5 shadow-2xs"
            >
              {effectiveRole}
            </Badge>

            {userGroup && !isGroupLeaderTier && (
              <Badge
                variant="outline"
                className="text-xs font-semibold bg-muted/70 text-muted-foreground border-border gap-1.5 py-0.5"
              >
                <FolderOpen size={12} className="text-primary" />
                <span>{userGroup.name}</span>
              </Badge>
            )}

            {/* Role Preview Pill for quick testing */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/90 px-2.5 py-1 text-xs shadow-2xs">
              <Eye size={12} className={isPreviewActive ? 'text-amber-500 animate-pulse' : 'text-muted-foreground'} />
              <label htmlFor="dashboard-role-preview-select" className="text-[11px] font-medium text-muted-foreground">
                View As:
              </label>
              <select
                id="dashboard-role-preview-select"
                aria-label="Dashboard role view selector"
                value={previewRole}
                onChange={(e) => setPreviewRole(e.target.value as DashboardRole)}
                className="bg-transparent font-semibold text-foreground text-xs focus:outline-hidden cursor-pointer"
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
          </div>

          {/* Congregation Context Subtitle */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5 font-bold text-foreground">
              <Building2 size={15} className="text-primary shrink-0" />
              {congregation?.name || 'Congregation Workspace'}
            </span>
            {congregation?.city && <span>• {congregation.city}</span>}
            <span className="hidden md:inline text-muted-foreground/80">
              {isExecutiveTier
                ? '— Ministry oversight, activity reports & group arrangements'
                : isTerritoryServantTier
                  ? '— Territory checkout inventory & coordinate maintenance'
                  : isGroupLeaderTier
                    ? `— ${ledGroup?.name || 'Service Group'} field service & publisher support`
                    : '— Field ministry territory & visit tracking'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {isExecutiveTier ? (
            <>
              <Button
                asChild
                variant="outline"
                className="rounded-2xl text-xs font-semibold gap-1.5 shadow-2xs h-9 px-3.5 bg-card/90 hover:bg-muted border-border shrink-0"
              >
                <Link href={`/congregation/${congregationId}/reports`}>
                  <BarChart3 size={14} className="text-primary" />
                  <span>Reports</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-2xl text-xs font-semibold gap-1.5 shadow-2xs h-9 px-3.5 bg-card/90 hover:bg-muted border-border shrink-0"
              >
                <Link href={`/congregation/${congregationId}/groups`}>
                  <FolderOpen size={14} className="text-primary" />
                  <span>Groups</span>
                </Link>
              </Button>
            </>
          ) : isTerritoryServantTier ? (
            <>
              <Button
                asChild
                variant="outline"
                className="rounded-2xl text-xs font-semibold gap-1.5 shadow-2xs h-9 px-3.5 bg-card/90 hover:bg-muted border-border shrink-0"
              >
                <Link href={`/congregation/${congregationId}/territories`}>
                  <Compass size={14} className="text-primary" />
                  <span>Territories</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-2xl text-xs font-semibold gap-1.5 shadow-2xs h-9 px-3.5 bg-card/90 hover:bg-muted border-border shrink-0"
              >
                <Link href={`/congregation/${congregationId}/territories/overview`}>
                  <MapPin size={14} className="text-primary" />
                  <span>Overview Map</span>
                </Link>
              </Button>
            </>
          ) : isGroupLeaderTier ? (
            <Button
              asChild
              variant="outline"
              className="rounded-2xl text-xs font-semibold gap-1.5 shadow-2xs h-9 px-3.5 bg-card/90 hover:bg-muted border-border shrink-0"
            >
              <Link href={`/congregation/${congregationId}/groups`}>
                <FolderOpen size={14} className="text-primary" />
                <span>Manage {ledGroup?.name || 'Group'}</span>
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              variant="outline"
              className="rounded-2xl text-xs font-semibold gap-1.5 shadow-2xs h-9 px-3.5 bg-card/90 hover:bg-muted border-border shrink-0"
            >
              <Link href={`/congregation/${congregationId}/territories?status=available`}>
                <Compass size={14} className="text-primary" />
                <span>Available Zones</span>
              </Link>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onStartTour}
            className="rounded-2xl text-xs font-semibold gap-1.5 h-9 px-3 bg-card/90 hover:bg-muted border-border hover:border-primary/40 transition-all cursor-pointer shrink-0"
            title="Start guided walkthrough"
          >
            <Sparkles size={14} className="text-amber-500" />
            <span>Tour Guide</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
