'use client';

import {
  Building2,
  Calendar,
  Flame,
  Globe,
  Link as LinkIcon,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Switch } from '@/components/ui/switch';
import { useCongregationGroups } from '@/hooks/use-congregation-groups';
import { useAuthSession } from '@/lib/firebase/auth';
import {
  canPostCongregationAnnouncement,
  canPostServiceGroupAnnouncement,
  canPostSystemAnnouncement,
} from '@/lib/permissions';
import { playHapticFeedback } from '@/lib/sound';
import type {
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementScope,
  ServiceYearSuggestion,
} from '@/types/api';

export interface AnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: Announcement | null;
  suggestion?: ServiceYearSuggestion | null;
  congregationId?: string | null;
  congregationName?: string | null;
  onSave: (data: {
    scope: AnnouncementScope;
    congregationId?: string | null;
    congregationName?: string | null;
    serviceGroupId?: string | null;
    serviceGroupName?: string | null;
    title: string;
    content: string;
    category: AnnouncementCategory;
    priority: AnnouncementPriority;
    isPinned: boolean;
    actionUrl?: string | null;
  }) => Promise<void>;
}

export function AnnouncementDialog({
  open,
  onOpenChange,
  announcement,
  suggestion,
  congregationId,
  congregationName,
  onSave,
}: AnnouncementDialogProps) {
  const { data: session } = useAuthSession();
  const user = session?.user;
  const activeCongId = congregationId || (user as any)?.congregationId;
  const { groups } = useCongregationGroups(activeCongId);

  const canPostCong = canPostCongregationAnnouncement(user?.role, (user as any)?.congregationRole);
  const canPostSys = canPostSystemAnnouncement(user?.role);

  const [scope, setScope] = useState<AnnouncementScope>('congregation');
  const [serviceGroupId, setServiceGroupId] = useState<string>('');
  const [category, setCategory] = useState<AnnouncementCategory>('general');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [actionUrl, setActionUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (announcement) {
      setScope(announcement.scope || 'congregation');
      setServiceGroupId(announcement.serviceGroupId || '');
      setCategory(announcement.category || 'general');
      setPriority(announcement.priority || 'normal');
      setTitle(announcement.title || '');
      setContent(announcement.content || '');
      setIsPinned(Boolean(announcement.isPinned));
      setActionUrl(announcement.actionUrl || '');
    } else if (suggestion) {
      setScope('congregation');
      setServiceGroupId('');
      setCategory(suggestion.suggestedCategory);
      setPriority(suggestion.suggestedPriority);
      setTitle(suggestion.suggestedTitle);
      setContent(suggestion.suggestedContent);
      setIsPinned(true);
      setActionUrl('');
    } else {
      setScope(canPostSys && !canPostCong ? 'system' : 'congregation');
      setServiceGroupId(groups[0]?.id || '');
      setCategory('general');
      setPriority('normal');
      setTitle('');
      setContent('');
      setIsPinned(false);
      setActionUrl('');
    }
    setError(null);
  }, [announcement, suggestion, open, canPostCong, canPostSys, groups]);

  const handleApplyTemplate = (templateKey: string) => {
    playHapticFeedback('light');
    switch (templateKey) {
      case 'sy_kickoff':
        setCategory('service_year');
        setPriority('important');
        setTitle(`Welcome to the New Service Year!`);
        setContent(
          `Dear brothers and sisters, as we begin our new service year together:\n\n` +
            `• **Territory Refresh**: Please review and return any completed territory cards.\n` +
            `• **Pioneer Arrangements**: Auxiliary pioneer schedules and special witnessing meetings are posted.\n` +
            `• **Field Service Groups**: Weekend witnessing arrangements will meet at scheduled locations.\n\n` +
            `> *"Whatever you are doing, work at it whole-souled as for Jehovah."* — Colossians 3:23`
        );
        break;
      case 'sy_closing':
        setCategory('service_year');
        setPriority('important');
        setTitle(`Service Year Closing — Final Territory & Activity Review`);
        setContent(
          `As we approach the end of the service year:\n\n` +
            `• **Territories Return**: Please check in all worked territories to ensure accurate congregation coverage records.\n` +
            `• **Service Reports**: Kindly submit all field service activity promptly.\n` +
            `• **Thank You**: Thank you for your faithful zeal and labor of love over the past year!`
        );
        break;
      case 'campaign':
        setCategory('campaign');
        setPriority('urgent');
        setTitle(`Special Invitation Campaign Starts Next Week!`);
        setContent(
          `We are excited to announce our upcoming special invitation campaign:\n\n` +
            `• **Literature Supply**: Special campaign tracts and invitations are available at the literature counter.\n` +
            `• **Midweek & Weekend Witnessing**: Extra morning and evening groups are scheduled.\n` +
            `• **Target**: Our goal is to cover all residential territory maps before the campaign concludes.`
        );
        break;
      case 'group_meeting':
        setScope('service_group');
        setCategory('general');
        setPriority('normal');
        setTitle(`Saturday Field Service Meeting Arrangement`);
        setContent(
          `Hi brothers and sisters,\n\n` +
            `• **Meeting Location**: We will meet at the designated group location at 9:00 AM.\n` +
            `• **Territories**: We will work the assigned group residential maps.\n` +
            `• **Car Arrangements**: Please let us know if you need or can provide transportation!`
        );
        break;
      case 'feature_update':
        setScope('system');
        setCategory('feature_update');
        setPriority('normal');
        setTitle('System Feature Update Released');
        setContent(
          'We have updated the Kanataran platform with new enhancements! Explore the latest tools including audio feedback, offline sync, map boundary annotations, and territory reporting.'
        );
        break;
      case 'maintenance':
        setScope('system');
        setCategory('maintenance');
        setPriority('important');
        setTitle('Scheduled System Maintenance Notice');
        setContent(
          'Please note that system maintenance is scheduled to optimize server performance and cloud backups. The app will remain available in offline mode during this window.'
        );
        break;
      case 'bug_fix':
        setScope('system');
        setCategory('bug_fix');
        setPriority('normal');
        setTitle('Resolved Issue / System Update');
        setContent(
          'A recently reported issue affecting territory map loading and household note updates has been resolved. Thank you for your feedback!'
        );
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter an announcement title.');
      return;
    }
    if (!content.trim()) {
      setError('Please enter the announcement message.');
      return;
    }
    if (scope === 'service_group' && !serviceGroupId && groups.length > 0) {
      setError('Please select a Field Service Group.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const selectedGroup = groups.find((g) => g.id === serviceGroupId);

      await onSave({
        scope,
        congregationId: scope === 'system' ? null : activeCongId || null,
        congregationName: scope === 'system' ? null : congregationName || null,
        serviceGroupId: scope === 'service_group' ? serviceGroupId || null : null,
        serviceGroupName: scope === 'service_group' ? selectedGroup?.name || null : null,
        title: title.trim(),
        content: content.trim(),
        category,
        priority,
        isPinned,
        actionUrl: actionUrl.trim() || null,
      });
      playHapticFeedback('success');
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save announcement.');
      playHapticFeedback('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col p-0 sm:p-0 sm:pb-0 gap-0 sm:gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-5 py-3.5 border-b border-border/60 shrink-0 bg-card pr-12 text-left">
          <DialogTitle className="text-base sm:text-lg font-bold">
            {announcement ? 'Edit Announcement' : 'Post New Announcement'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Broadcast an official notice to the congregation, a service group, or across the system.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-3.5 space-y-3">
            {error && (
              <div className="rounded-md bg-destructive/10 p-2.5 text-xs font-semibold text-destructive border border-destructive/20">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              <div className="md:col-span-5 space-y-3">
                <div>
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Target Audience *
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        playHapticFeedback('light');
                        setScope('congregation');
                      }}
                      className={`flex items-center justify-center gap-2 rounded-lg border p-2 text-xs font-semibold transition-all ${
                        scope === 'congregation'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      Entire Congregation
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playHapticFeedback('light');
                        setScope('service_group');
                        if (!serviceGroupId && groups.length > 0) {
                          setServiceGroupId(groups[0].id);
                        }
                      }}
                      className={`flex items-center justify-center gap-2 rounded-lg border p-2 text-xs font-semibold transition-all ${
                        scope === 'service_group'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      Field Service Group
                    </button>

                    {canPostSys && (
                      <button
                        type="button"
                        onClick={() => {
                          playHapticFeedback('light');
                          setScope('system');
                        }}
                        className={`flex items-center justify-center gap-2 rounded-lg border p-2 text-xs font-semibold transition-all ${
                          scope === 'system'
                            ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
                        }`}
                      >
                        <Globe className="h-3.5 w-3.5" />
                        System Wide (All Users)
                      </button>
                    )}
                  </div>
                </div>

                {scope === 'service_group' && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 space-y-1.5">
                    <Label htmlFor="ann-group" className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                      <Users className="h-3 w-3" /> Select Service Group *
                    </Label>
                    {groups.length > 0 ? (
                      <select
                        id="ann-group"
                        value={serviceGroupId}
                        onChange={(e) => setServiceGroupId(e.target.value)}
                        className="w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-xs text-foreground font-semibold shadow-xs focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      >
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} {g.overseerName ? `(Overseer: ${g.overseerName})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-[11px] text-muted-foreground italic">
                        No service groups found in this congregation.
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Category *
                  </Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(
                      [
                        'general',
                        'service_year',
                        'campaign',
                        'feature_update',
                        'maintenance',
                        'bug_fix',
                        'urgent',
                      ] as AnnouncementCategory[]
                    ).map((cat) => {
                      const isSelected = category === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            playHapticFeedback('light');
                            setCategory(cat);
                          }}
                          className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize transition-all ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-card text-foreground hover:bg-muted/50'
                          }`}
                        >
                          {cat.replace('_', ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Priority Selector */}
                <div>
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Priority Level *
                  </Label>
                  <div className="grid grid-cols-3 gap-1.5 mt-1">
                    {(['normal', 'important', 'urgent'] as AnnouncementPriority[]).map((p) => {
                      const isSelected = priority === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            playHapticFeedback('light');
                            setPriority(p);
                          }}
                          className={`rounded-md border py-1.5 text-center text-[11px] font-semibold capitalize transition-all ${
                            isSelected
                              ? p === 'urgent'
                                ? 'border-destructive bg-destructive text-destructive-foreground'
                                : p === 'important'
                                ? 'border-amber-500 bg-amber-500 text-white'
                                : 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Link */}
                <div>
                  <Label htmlFor="ann-url" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Action Link (Optional URL)
                  </Label>
                  <div className="relative mt-1">
                    <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="ann-url"
                      type="url"
                      placeholder="https://example.com/details"
                      value={actionUrl}
                      onChange={(e) => setActionUrl(e.target.value)}
                      className="pl-8 text-xs h-8"
                    />
                  </div>
                </div>

                {/* Pin to Top Switch */}
                <div className="flex items-center justify-between rounded-lg border border-border p-2 px-3">
                  <div>
                    <div className="text-xs font-bold text-foreground">Pin to Top</div>
                    <div className="text-[10px] text-muted-foreground">
                      Highlight at top of feed
                    </div>
                  </div>
                  <Switch checked={isPinned} onCheckedChange={setIsPinned} />
                </div>
              </div>

              {/* Right Column: Content & Templates (7 cols on md/lg) */}
              <div className="md:col-span-7 space-y-3">
                {/* Quick Templates */}
                {!announcement && (
                  <div>
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Quick Templates
                    </Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate('sy_kickoff')}
                        className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Sparkles className="h-3 w-3" />
                        SY Kickoff
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate('sy_closing')}
                        className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        <Calendar className="h-3 w-3" />
                        Year-End Closing
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate('campaign')}
                        className="inline-flex items-center gap-1 rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition-colors"
                      >
                        <Flame className="h-3 w-3" />
                        Campaign
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate('group_meeting')}
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        <Users className="h-3 w-3" />
                        Group Meeting
                      </button>
                      {canPostSys && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApplyTemplate('feature_update')}
                            className="inline-flex items-center gap-1 rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors"
                          >
                            <Sparkles className="h-3 w-3" />
                            Feature Update
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyTemplate('maintenance')}
                            className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                          >
                            <Wrench className="h-3 w-3" />
                            Maintenance
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Title Input */}
                <div>
                  <Label htmlFor="ann-title" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Announcement Title *
                  </Label>
                  <Input
                    id="ann-title"
                    placeholder="e.g. Welcome to the 2026–2027 Service Year!"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 font-semibold text-xs sm:text-sm h-9"
                  />
                </div>

                {/* Content Markdown Editor */}
                <div>
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Message Details (Markdown & Rich Text) *
                  </Label>
                  <MarkdownEditor
                    value={content}
                    onChange={setContent}
                    placeholder="Write details, instructions, or goals using markdown..."
                    rows={6}
                    minHeight="140px"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-5 py-2.5 border-t border-border/60 shrink-0 bg-card z-10 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting
                ? 'Publishing...'
                : announcement
                ? 'Update Notice'
                : 'Publish Announcement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

