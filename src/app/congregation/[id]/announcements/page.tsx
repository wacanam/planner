'use client';

import {
  AlertCircle,
  Bell,
  Building2,
  Calendar,
  ChevronLeft,
  Flame,
  Globe,
  Plus,
  Search,
  Sparkles,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useMemo, useState } from 'react';
import { AnnouncementBanner } from '@/components/announcements/AnnouncementBanner';
import { AnnouncementCard } from '@/components/announcements/AnnouncementCard';
import { AnnouncementDialog } from '@/components/announcements/AnnouncementDialog';
import { ServiceYearAnnouncementSuggestion } from '@/components/announcements/ServiceYearAnnouncementSuggestion';
import { DashboardHeader } from '@/components/dashboard-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuthSession } from '@/lib/firebase/auth';
import { useAnnouncements, useServiceYearAnnouncementSuggestions } from '@/hooks/use-announcements';
import { useCongregation } from '@/hooks/use-congregations';
import {
  canPostCongregationAnnouncement,
  canPostSystemAnnouncement,
} from '@/lib/permissions';
import { playHapticFeedback } from '@/lib/sound';
import type { Announcement, ServiceYearSuggestion } from '@/types/api';

type TabFilter = 'all' | 'congregation' | 'service_group' | 'system';

export default function CongregationAnnouncementsPage() {
  const params = useParams<{ id: string }>();
  const congregationId = params?.id;
  const { data: session } = useAuthSession();
  const user = session?.user;

  const { congregation } = useCongregation(congregationId);
  const {
    announcements,
    congregationAnnouncements,
    serviceGroupAnnouncements,
    systemAnnouncements,
    isLoading,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    togglePin,
  } = useAnnouncements(congregationId);

  const { suggestions, primarySuggestion } = useServiceYearAnnouncementSuggestions(
    congregationId,
    announcements
  );

  const canPostCong = canPostCongregationAnnouncement(user?.role, (user as any)?.congregationRole);
  const canPostSys = canPostSystemAnnouncement(user?.role);
  const canPostAny = canPostCong || canPostSys;

  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState<ServiceYearSuggestion | null>(null);

  const filteredAnnouncements = useMemo(() => {
    let list = announcements;

    if (activeTab === 'congregation') {
      list = congregationAnnouncements;
    } else if (activeTab === 'service_group') {
      list = serviceGroupAnnouncements;
    } else if (activeTab === 'system') {
      list = systemAnnouncements;
    }

    if (categoryFilter !== 'all') {
      list = list.filter((a) => a.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          a.authorName.toLowerCase().includes(q) ||
          (a.serviceGroupName && a.serviceGroupName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [
    announcements,
    congregationAnnouncements,
    serviceGroupAnnouncements,
    systemAnnouncements,
    activeTab,
    categoryFilter,
    searchQuery,
  ]);

  const handleOpenCreateDialog = (suggestion?: ServiceYearSuggestion) => {
    setEditingAnnouncement(null);
    setActiveSuggestion(suggestion || null);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (announcement: Announcement) => {
    setActiveSuggestion(null);
    setEditingAnnouncement(announcement);
    setDialogOpen(true);
  };

  const categories = [
    { label: 'All', value: 'all' },
    { label: 'Service Year', value: 'service_year' },
    { label: 'Campaigns', value: 'campaign' },
    { label: 'Feature Updates', value: 'feature_update' },
    { label: 'Maintenance', value: 'maintenance' },
    { label: 'Bug Fixes', value: 'bug_fix' },
    { label: 'General', value: 'general' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <DashboardHeader />

      <main className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Top Breadcrumb & Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
              <Link
                href={`/congregation/${congregationId}/dashboard`}
                className="hover:text-foreground flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Dashboard
              </Link>
              <span>/</span>
              <span>Announcements</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Announcements & Notices
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {congregation?.name ? `${congregation.name} • ` : ''}Official congregation updates and system broadcasts
            </p>
          </div>

          {canPostAny && (
            <Button
              onClick={() => handleOpenCreateDialog()}
              className="gap-2 self-start sm:self-auto font-semibold shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Post Announcement
            </Button>
          )}
        </div>

        {/* Periodic Service Year Suggestion for Service Overseer & Secretary */}
        {canPostCong && primarySuggestion && (
          <ServiceYearAnnouncementSuggestion
            suggestion={primarySuggestion}
            onUseSuggestion={handleOpenCreateDialog}
          />
        )}

        {/* Tab Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            {[
              { key: 'all', label: 'All Notices', count: announcements.length },
              { key: 'congregation', label: 'Congregation', count: congregationAnnouncements.length },
              { key: 'service_group', label: 'Service Groups', count: serviceGroupAnnouncements.length },
              { key: 'system', label: 'System Wide', count: systemAnnouncements.length },
            ].map((tab) => {
              const isSelected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    playHapticFeedback('light');
                    setActiveTab(tab.key as TabFilter);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-card text-muted-foreground hover:bg-muted/70 hover:text-foreground border border-border/50'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search notices..."
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

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((c) => {
            const isSelected = categoryFilter === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  playHapticFeedback('light');
                  setCategoryFilter(c.value);
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all shrink-0 ${
                  isSelected
                    ? 'bg-foreground text-background font-bold'
                    : 'bg-card text-muted-foreground hover:bg-muted border border-border/60'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Announcement Feed */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-36 rounded-xl bg-card animate-pulse border border-border" />
            ))}
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <Card className="p-10 text-center flex flex-col items-center justify-center border-dashed">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
              <Bell className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Announcements Found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              There are currently no active announcements matching your selected tab or search query.
            </p>
            {canPostAny && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenCreateDialog()}
                className="mt-4 gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Create Announcement
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

        {/* Create / Edit Dialog */}
        <AnnouncementDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          announcement={editingAnnouncement}
          suggestion={activeSuggestion}
          congregationId={congregationId}
          congregationName={congregation?.name}
          onSave={async (data) => {
            if (editingAnnouncement) {
              await updateAnnouncement(editingAnnouncement.id, data);
            } else {
              await createAnnouncement(data);
            }
          }}
        />
      </main>
    </div>
  );
}
