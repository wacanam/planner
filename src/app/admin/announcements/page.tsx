'use client';

import {
  Bell,
  ChevronLeft,
  Globe,
  Plus,
  Search,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { AnnouncementCard } from '@/components/announcements/AnnouncementCard';
import { AnnouncementDialog } from '@/components/announcements/AnnouncementDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuthSession } from '@/lib/firebase/auth';
import { useAnnouncements } from '@/hooks/use-announcements';
import { isSystemAdmin } from '@/lib/permissions';
import { playHapticFeedback } from '@/lib/sound';
import type { Announcement } from '@/types/api';

export default function AdminAnnouncementsPage() {
  const { data: session } = useAuthSession();
  const user = session?.user;
  const isAdmin = isSystemAdmin(user?.role);

  const {
    allAnnouncements,
    systemAnnouncements,
    isLoading,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    togglePin,
  } = useAnnouncements(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'system' | 'congregation'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const filteredAnnouncements = useMemo(() => {
    let list = allAnnouncements;

    if (scopeFilter === 'system') {
      list = list.filter((a) => a.scope === 'system');
    } else if (scopeFilter === 'congregation') {
      list = list.filter((a) => a.scope === 'congregation');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          a.authorName.toLowerCase().includes(q) ||
          (a.congregationName && a.congregationName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allAnnouncements, scopeFilter, searchQuery]);

  const handleOpenCreateDialog = () => {
    setEditingAnnouncement(null);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link href="/admin/dashboard" className="hover:text-foreground flex items-center gap-1">
              <ChevronLeft className="h-3.5 w-3.5" />
              Admin
            </Link>
            <span>/</span>
            <span>Announcements</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            Platform Announcements
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Post system updates, feature releases, maintenance notices, and manage broadcasts
          </p>
        </div>

        {isAdmin && (
          <Button onClick={handleOpenCreateDialog} className="gap-2 font-semibold shadow-xs">
            <Plus className="h-4 w-4" />
            New Announcement
          </Button>
        )}
      </div>

      {/* Scope Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          {[
            { key: 'all', label: 'All Notices', count: allAnnouncements.length },
            { key: 'system', label: 'System Wide', count: systemAnnouncements.length },
            {
              key: 'congregation',
              label: 'Congregations',
              count: allAnnouncements.filter((a) => a.scope === 'congregation').length,
            },
          ].map((tab) => {
            const isSelected = scopeFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  playHapticFeedback('light');
                  setScopeFilter(tab.key as any);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-xs dark:bg-purple-500'
                    : 'bg-card text-muted-foreground hover:bg-muted/70 hover:text-foreground border border-border/50'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search platform notices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Announcements List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 rounded-xl bg-card animate-pulse border border-border" />
          ))}
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <Card className="p-10 text-center flex flex-col items-center justify-center border-dashed">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
            <Bell className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No Announcements</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            There are no active announcements matching your query.
          </p>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenCreateDialog}
              className="mt-4 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Create Notice
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((item) => (
            <AnnouncementCard
              key={item.id}
              announcement={item}
              onEdit={handleOpenEditDialog}
              onDelete={deleteAnnouncement}
              onTogglePin={togglePin}
            />
          ))}
        </div>
      )}

      {/* Dialog */}
      <AnnouncementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        announcement={editingAnnouncement}
        onSave={async (data) => {
          if (editingAnnouncement) {
            await updateAnnouncement(editingAnnouncement.id, data);
          } else {
            await createAnnouncement(data);
          }
        }}
      />
    </div>
  );
}
