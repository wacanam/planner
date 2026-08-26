'use client';

import { ArrowRight, Compass, FolderOpen, HelpCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardContextProps } from './types';

export function MinistryResourcesCard({
  congregationId,
  isGroupLeaderTier,
  ledGroup,
  groups,
  onStartTour,
}: DashboardContextProps) {
  return (
    <Card className="bg-card border-border shadow-xs rounded-3xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Sparkles size={16} className="text-amber-500" />
          <span>Ministry Resources</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Link
          href={`/congregation/${congregationId}/territories/overview`}
          className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <Compass size={15} />
            </div>
            <div>
              <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                Congregation Map
              </p>
              <p className="text-[10px] text-muted-foreground">All boundary zones</p>
            </div>
          </div>
          <ArrowRight
            size={14}
            className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
          />
        </Link>

        {isGroupLeaderTier ? (
          <Link
            href={`/congregation/${congregationId}/groups`}
            className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                <FolderOpen size={15} />
              </div>
              <div>
                <p className="font-semibold text-xs text-foreground group-hover:text-purple-600 transition-colors">
                  Manage {ledGroup?.name || 'Group'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {ledGroup?.members?.length || 0} publishers in roster
                </p>
              </div>
            </div>
            <ArrowRight
              size={14}
              className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
            />
          </Link>
        ) : (
          <Link
            href={`/congregation/${congregationId}/groups`}
            className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                <FolderOpen size={15} />
              </div>
              <div>
                <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                  Service Groups
                </p>
                <p className="text-[10px] text-muted-foreground">{groups.length} groups arranged</p>
              </div>
            </div>
            <ArrowRight
              size={14}
              className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
            />
          </Link>
        )}

        <button
          type="button"
          onClick={onStartTour}
          className="w-full flex items-center justify-between p-3 rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all group cursor-pointer text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <HelpCircle size={15} />
            </div>
            <div>
              <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                Tour Guide
              </p>
              <p className="text-[10px] text-muted-foreground">Interactive walkthrough</p>
            </div>
          </div>
          <Sparkles size={14} className="text-amber-500" />
        </button>
      </CardContent>
    </Card>
  );
}
