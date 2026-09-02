'use client';

import {
  AlertCircle,
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  Flame,
  Globe,
  MoreVertical,
  Pin,
  Sparkles,
  Trash2,
  Users,
  Wrench,
} from 'lucide-react';
import React, { useState } from 'react';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthSession } from '@/lib/firebase/auth';
import { formatDate } from '@/lib/date-utils';
import { canManageAnnouncement } from '@/lib/permissions';
import { playHapticFeedback } from '@/lib/sound';
import type { Announcement, AnnouncementCategory } from '@/types/api';

export interface AnnouncementCardProps {
  announcement: Announcement;
  onEdit?: (announcement: Announcement) => void;
  onDelete?: (announcementId: string) => void;
  onTogglePin?: (announcementId: string, currentPin: boolean) => void;
  showActions?: boolean;
}

export function AnnouncementCard({
  announcement,
  onEdit,
  onDelete,
  onTogglePin,
  showActions = true,
}: AnnouncementCardProps) {
  const { data: session } = useAuthSession();
  const user = session?.user;
  const canManage = canManageAnnouncement(user as any, announcement);

  const getCategoryConfig = (category: AnnouncementCategory) => {
    switch (category) {
      case 'service_year':
        return {
          label: 'Service Year',
          icon: <Calendar className="h-3 w-3 text-primary" />,
          variant: 'default' as const,
          badgeClass: 'bg-primary/15 text-primary border-primary/30',
        };
      case 'feature_update':
        return {
          label: 'Feature Update',
          icon: <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400" />,
          variant: 'secondary' as const,
          badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
        };
      case 'maintenance':
        return {
          label: 'Maintenance',
          icon: <Wrench className="h-3 w-3 text-amber-600 dark:text-amber-400" />,
          variant: 'outline' as const,
          badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        };
      case 'bug_fix':
        return {
          label: 'Bug Fix / Resolved',
          icon: <Wrench className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />,
          variant: 'outline' as const,
          badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        };
      case 'campaign':
        return {
          label: 'Campaign',
          icon: <Flame className="h-3 w-3 text-orange-600 dark:text-orange-400" />,
          variant: 'outline' as const,
          badgeClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
        };
      case 'urgent':
        return {
          label: 'Urgent',
          icon: <AlertCircle className="h-3 w-3 text-destructive" />,
          variant: 'destructive' as const,
          badgeClass: 'bg-destructive/15 text-destructive border-destructive/30',
        };
      default:
        return {
          label: 'General',
          icon: <Building2 className="h-3 w-3 text-muted-foreground" />,
          variant: 'outline' as const,
          badgeClass: 'bg-muted text-muted-foreground border-border',
        };
    }
  };

  const catConfig = getCategoryConfig(announcement.category);
  const isSystem = announcement.scope === 'system';
  const isUrgent = announcement.priority === 'urgent';
  const isImportant = announcement.priority === 'important';

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      playHapticFeedback('medium');
      onDelete?.(announcement.id);
    }
  };

  return (
    <Card
      className={`transition-all duration-200 ${
        isUrgent
          ? 'border-destructive/60 bg-destructive/5 dark:bg-destructive/10 shadow-sm'
          : isImportant
          ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10'
          : announcement.isPinned
          ? 'border-primary/50 bg-primary/5 dark:bg-primary/10 shadow-sm'
          : 'border-border bg-card'
      }`}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Scope Badge */}
            {isSystem ? (
              <Badge variant="secondary" className="gap-1 text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                <Globe className="h-3 w-3" />
                System Wide
              </Badge>
            ) : announcement.scope === 'service_group' ? (
              <Badge variant="outline" className="gap-1 text-xs font-semibold border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <Users className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                {announcement.serviceGroupName || 'Service Group'}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-xs">
                <Building2 className="h-3 w-3" />
                {announcement.congregationName || 'Congregation'}
              </Badge>
            )}

            {/* Category Badge */}
            <Badge variant="outline" className={`gap-1 text-xs ${catConfig.badgeClass}`}>
              {catConfig.icon}
              {catConfig.label}
            </Badge>

            {/* Priority Badges */}
            {isUrgent && (
              <Badge variant="destructive" className="text-xs font-bold animate-pulse">
                Urgent Notice
              </Badge>
            )}
            {isImportant && !isUrgent && (
              <Badge variant="outline" className="text-xs font-semibold border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-300">
                Important
              </Badge>
            )}

            {/* Pinned Pill */}
            {announcement.isPinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary border border-primary/30">
                <Pin className="h-2.5 w-2.5 fill-current" />
                Pinned
              </span>
            )}
          </div>

          {/* Action Menu */}
          {showActions && canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {onTogglePin && (
                  <DropdownMenuItem
                    onClick={() => {
                      playHapticFeedback('light');
                      onTogglePin(announcement.id, announcement.isPinned);
                    }}
                  >
                    <Pin className="mr-2 h-4 w-4" />
                    {announcement.isPinned ? 'Unpin from Top' : 'Pin to Top'}
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem
                    onClick={() => {
                      playHapticFeedback('light');
                      onEdit(announcement);
                    }}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Edit Notice
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Notice
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Title */}
        <h3 className="mt-2 text-base font-bold text-foreground leading-snug">
          {announcement.title}
        </h3>
      </CardHeader>

      <CardContent className="p-4 pt-1 pb-3">
        <MarkdownRenderer content={announcement.content} className="text-foreground/90" />

        {/* Optional Action URL */}
        {announcement.actionUrl && (
          <div className="mt-3">
            <a
              href={announcement.actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Learn more / View link
            </a>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
        <div>
          Posted by <span className="font-semibold text-foreground">{announcement.authorName}</span>
          {announcement.authorRole && (
            <span className="ml-1 text-[11px] text-muted-foreground font-mono">
              ({announcement.authorRole})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 font-medium">
          <Clock className="h-3 w-3" />
          <span>{formatDate(announcement.createdAt)}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
