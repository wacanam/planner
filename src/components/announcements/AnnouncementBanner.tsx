'use client';

import {
  AlertCircle,
  Bell,
  ChevronRight,
  Pin,
  X,
} from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { playHapticFeedback } from '@/lib/sound';
import type { Announcement } from '@/types/api';

export interface AnnouncementBannerProps {
  announcement?: Announcement | null;
  totalCount?: number;
  congregationId?: string | null;
  linkHref?: string;
}

export function AnnouncementBanner({
  announcement,
  totalCount = 1,
  congregationId,
  linkHref,
}: AnnouncementBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!announcement || dismissed) return null;

  const isUrgent = announcement.priority === 'urgent';
  const isImportant = announcement.priority === 'important';

  const targetHref =
    linkHref || (congregationId ? `/congregation/${congregationId}/announcements` : '/admin/announcements');

  return (
    <div className="mb-4">
      <Link
        href={targetHref}
        onClick={() => playHapticFeedback('light')}
        className="block group"
      >
        <Card
          className={`p-3 transition-all duration-200 hover:shadow-md cursor-pointer ${
            isUrgent
              ? 'border-destructive/60 bg-destructive/10 dark:bg-destructive/20'
              : isImportant
              ? 'border-amber-500/50 bg-amber-500/10 dark:bg-amber-500/20'
              : 'border-primary/40 bg-primary/5 hover:bg-primary/10'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
                  isUrgent
                    ? 'bg-destructive text-destructive-foreground animate-pulse'
                    : isImportant
                    ? 'bg-amber-500 text-white'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {announcement.isPinned ? (
                  <Pin className="h-4 w-4" />
                ) : isUrgent ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  {isUrgent && (
                    <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-bold">
                      Urgent
                    </Badge>
                  )}
                  {announcement.isPinned && !isUrgent && (
                    <Badge variant="default" className="text-[10px] py-0 px-1.5">
                      Pinned
                    </Badge>
                  )}
                  {announcement.scope === 'system' && (
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                      System Notice
                    </Badge>
                  )}
                  {announcement.scope === 'service_group' && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold">
                      {announcement.serviceGroupName || 'Service Group'}
                    </Badge>
                  )}
                  {totalCount > 1 && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                      {totalCount} active
                    </Badge>
                  )}
                </div>

                <div className="text-sm font-bold text-foreground truncate mt-0.5 group-hover:text-primary transition-colors">
                  {announcement.title}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {announcement.content.replace(/\n+/g, ' ')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
              <span className="text-xs font-semibold hidden sm:inline">View Notices</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </Card>
      </Link>
    </div>
  );
}
