'use client';

import { ArrowLeft, Bell, Megaphone, Plus, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AdminNav } from '@/components/admin-nav';
import { AnnouncementCard } from '@/components/announcements/AnnouncementCard';
import { AnnouncementDialog } from '@/components/announcements/AnnouncementDialog';
import { ProtectedPage } from '@/components/protected-page';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAnnouncements, useCurrentUser } from '@/hooks';
import { isSystemAdmin } from '@/lib/permissions';
import { UserRole } from '@/lib/roles';
import { playHapticFeedback } from '@/lib/sound';
import type { Announcement } from '@/types/api';

export default function AdminAnnouncementsPage() {
  const { user } = useCurrentUser();
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
          a.congregationName?.toLowerCase().includes(q)
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
    <ProtectedPage requiredRole={UserRole.ADMIN}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 min-w-0 w-full">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-xl shrink-0">
              <Link href="/admin/dashboard">
                <ArrowLeft size={16} />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                <Megaphone className="h-6 w-6 text-purple-600 dark:text-purple-400 shrink-0" />
                Platform Announcements
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Post system updates, feature releases, maintenance notices, and manage broadcasts
              </p>
            </div>
          </div>

          {isAdmin && (
            <Button
              onClick={handleOpenCreateDialog}
              size="sm"
              className="w-full sm:w-auto rounded-xl text-xs gap-1.5 h-9 font-semibold shadow-xs shrink-0 cursor-pointer"
            >
              <Plus size={14} />
              <span>New Announcement</span>
            </Button>
          )}
        </div>

        {/* Admin Navigation */}
        <AdminNav />

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              placeholder="Search platform notices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 h-10 rounded-xl text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Scope Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 dark:bg-muted/40 rounded-xl border border-border shrink-0 overflow-x-auto scrollbar-none">
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-card text-foreground shadow-xs border border-border'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        isSelected ? 'bg-muted text-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Announcements List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-28 rounded-2xl bg-card animate-pulse border border-border"
              />
            ))}
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <Card className="p-10 text-center flex flex-col items-center justify-center border-dashed rounded-2xl bg-card border-border">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
              <Bell className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Announcements</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {searchQuery
                ? 'There are no active announcements matching your query.'
                : 'There are no active platform announcements.'}
            </p>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenCreateDialog}
                className="mt-4 gap-1.5 rounded-xl text-xs font-semibold h-9"
              >
                <Plus className="h-4 w-4" />
                <span>Create Notice</span>
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
    </ProtectedPage>
  );
}
