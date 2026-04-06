'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Home, Plus, Search, Clock, X, ChevronDown, ChevronUp, BookOpen, FileText, User } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useHouseholds, useHouseholdVisits } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { logVisitSchema, type LogVisitFormData } from '@/schemas/visit';
import {
  queueVisit,
  clearPendingVisit,
  registerVisitSync,
} from '@/lib/visits-store';
import { timeAgo } from '@/lib/time-ago';
import type { Household, Visit } from '@/types/api';

// ─── Constants ─────────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  new: 'text-muted-foreground border-border bg-muted/30',
  active: 'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
  not_home: 'text-yellow-700 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400',
  return_visit: 'text-purple-700 border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400',
  do_not_visit: 'text-red-700 border-red-200 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
  moved: 'text-muted-foreground border-border bg-muted/30',
  inactive: 'text-muted-foreground border-border bg-muted/30',
};

const statusLabels: Record<string, string> = {
  new: 'New',
  active: 'Active',
  not_home: 'Not Home',
  return_visit: 'Return Visit',
  do_not_visit: 'Do Not Visit',
  moved: 'Moved',
  inactive: 'Inactive',
};

const outcomeColors: Record<string, string> = {
  answered: 'text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  not_home: 'text-yellow-700 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400',
  return_visit: 'text-purple-700 border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400',
  do_not_visit: 'text-red-700 border-red-200 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
  moved: 'text-muted-foreground border-border bg-muted/30',
  other: 'text-muted-foreground border-border bg-muted/30',
};

const outcomeLabels: Record<string, string> = {
  answered: 'Answered',
  not_home: 'Not Home',
  return_visit: 'Return Visit',
  do_not_visit: 'Do Not Visit',
  moved: 'Moved',
  other: 'Other',
};

// ─── Visit History Drawer ───────────────────────────────────────────────────────

interface VisitHistoryDrawerProps {
  household: Household | null;
  onClose: () => void;
  onLogVisit: () => void;
}

function VisitHistoryDrawer({ household, onClose, onLogVisit }: VisitHistoryDrawerProps) {
  const { visits, isLoading } = useHouseholdVisits(household?.id ?? null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!household) return null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss on click
    // biome-ignore lint/a11y/useKeyWithClickEvents: intentional overlay dismiss
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation" onClick={onClose}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation */}
      <div
        className="relative w-full max-w-md h-full bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-sm truncate">
              {household.houseNumber ? `${household.houseNumber} ` : ''}{household.address}
            </h2>
            <p className="text-xs text-muted-foreground">
              {household.streetName}, {household.city}
            </p>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              <Badge variant="outline" className={statusColors[household.status] ?? ''}>
                {statusLabels[household.status] ?? household.status}
              </Badge>
              {household.type && household.type !== 'house' && (
                <Badge variant="outline" className="capitalize text-xs">
                  {household.type.replace('_', ' ')}
                </Badge>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Log Visit button */}
        <div className="px-4 py-3 border-b border-border">
          <Button size="sm" className="w-full" onClick={onLogVisit}>
            + Log Visit
          </Button>
        </div>

        {/* Visit history */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Visit History ({isLoading ? '…' : visits.length})
          </h3>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
            </div>
          ) : visits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Clock size={32} className="text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No visits recorded yet.</p>
            </div>
          ) : (
            visits.map((v) => {
              const isExpanded = expandedId === v.id;
              const hasDetails = v.notes || v.literatureLeft || v.bibleTopicDiscussed || v.returnVisitPlanned || v.nextVisitDate;
              return (
                <div key={v.id} className="rounded-xl border border-border bg-card p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {(v as Visit & { publisherName?: string }).publisherName && (
                        <p className="text-xs font-medium text-foreground">
                          {(v as Visit & { publisherName?: string }).publisherName}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">{timeAgo(v.visitDate)}</p>
                      {v.duration && <p className="text-xs text-muted-foreground">{v.duration} min</p>}
                    </div>
                    <Badge variant="outline" className={`shrink-0 text-xs ${outcomeColors[v.outcome] ?? ''}`}>
                      {outcomeLabels[v.outcome] ?? v.outcome}
                    </Badge>
                  </div>

                  {v.returnVisitPlanned && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">↩ Return visit planned</p>
                  )}
                  {v.syncStatus === 'pending' && (
                    <p className="text-xs text-amber-600">⏳ Pending sync</p>
                  )}

                  {hasDetails && (
                    <>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : v.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        {isExpanded ? 'Less' : 'Details'}
                      </button>
                      {isExpanded && (
                        <div className="space-y-1.5 pt-1 border-t border-border">
                          {v.notes && (
                            <div className="flex gap-2 text-xs">
                              <FileText size={11} className="mt-0.5 shrink-0 text-muted-foreground" />
                              <span className="text-muted-foreground">{v.notes}</span>
                            </div>
                          )}
                          {v.literatureLeft && (
                            <div className="flex gap-2 text-xs">
                              <BookOpen size={11} className="mt-0.5 shrink-0 text-muted-foreground" />
                              <span className="text-muted-foreground">Literature: {v.literatureLeft}</span>
                            </div>
                          )}
                          {v.bibleTopicDiscussed && (
                            <div className="flex gap-2 text-xs">
                              <BookOpen size={11} className="mt-0.5 shrink-0 text-muted-foreground" />
                              <span className="text-muted-foreground">Topic: {v.bibleTopicDiscussed}</span>
                            </div>
                          )}
                          {v.nextVisitDate && (
                            <div className="flex gap-2 text-xs">
                              <User size={11} className="mt-0.5 shrink-0 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                Next: {new Date(v.nextVisitDate).toLocaleDateString()}
                                {v.nextVisitNotes ? ` · ${v.nextVisitNotes}` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Log Visit Dialog ───────────────────────────────────────────────────────────

interface LogVisitDialogProps {
  open: boolean;
  household: Household | null;
  onClose: () => void;
  onSaved: (pendingId: string) => void;
}

function LogVisitDialog({ open, household, onClose, onSaved }: LogVisitDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LogVisitFormData>({
    resolver: zodResolver(logVisitSchema),
    defaultValues: { returnVisitPlanned: false },
  });

  const returnVisitPlanned = watch('returnVisitPlanned');

  const onSubmit = async (values: LogVisitFormData) => {
    if (!household) return;
    const payload = {
      householdId: household.id,
      outcome: values.outcome,
      householdStatusAfter: values.householdStatusAfter,
      notes: values.notes,
      duration: values.duration,
      literatureLeft: values.literatureLeft,
      bibleTopicDiscussed: values.bibleTopicDiscussed,
      returnVisitPlanned: values.returnVisitPlanned ?? false,
      nextVisitDate: values.nextVisitDate,
      nextVisitNotes: values.nextVisitNotes,
    };
    const pendingId = await queueVisit(payload);
    await registerVisitSync();
    onSaved(pendingId);
    reset();
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Visit</DialogTitle>
          {household && (
            <p className="text-sm text-muted-foreground mt-1">
              {household.address}, {household.city}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Outcome */}
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Outcome *</span>
            <Controller
              name="outcome"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome…" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(outcomeLabels).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.outcome && <p className="text-xs text-destructive">{errors.outcome.message}</p>}
          </div>

          {/* Status after */}
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Update Household Status</span>
            <Controller
              name="householdStatusAfter"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Keep current status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <FormField label="Duration (minutes)" id="duration" type="number" min={1} max={300}
            error={errors.duration?.message} {...register('duration', { valueAsNumber: true })} />

          <FormField label="Literature Left" id="literatureLeft"
            error={errors.literatureLeft?.message} {...register('literatureLeft')} />

          <FormField label="Bible Topic Discussed" id="bibleTopicDiscussed"
            error={errors.bibleTopicDiscussed?.message} {...register('bibleTopicDiscussed')} />

          <FormField label="Notes" id="notes" multiline rows={3}
            error={errors.notes?.message} {...register('notes')} />

          <div className="flex items-center gap-2">
            <input type="checkbox" id="returnVisitPlanned" className="h-4 w-4 rounded border"
              {...register('returnVisitPlanned')} />
            <label htmlFor="returnVisitPlanned" className="text-sm font-medium">Return visit planned</label>
          </div>

          {returnVisitPlanned && (
            <>
              <FormField label="Next visit date" id="nextVisitDate" type="date"
                error={errors.nextVisitDate?.message} {...register('nextVisitDate')} />
              <FormField label="Next visit notes" id="nextVisitNotes" multiline rows={2}
                error={errors.nextVisitNotes?.message} {...register('nextVisitNotes')} />
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save Visit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function HouseholdsClient() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [logVisitHousehold, setLogVisitHousehold] = useState<Household | null>(null);
  const { households, isLoading, dataSource, mutate } = useHouseholds();

  // Listen for SW sync messages — revalidate household list on sync
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const { type, pendingId } = (e.data ?? {}) as { type?: string; pendingId?: string };
      if ((type === 'VISIT_SYNCED' || type === 'HOUSEHOLD_SYNCED') && pendingId) {
        void clearPendingVisit(pendingId).catch(console.error);
        void mutate();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [mutate]);

  const filtered = useMemo(() => {
    let list = households as Household[];
    if (statusFilter !== 'all') list = list.filter((h) => h.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (h) =>
          h.address.toLowerCase().includes(s) ||
          h.streetName.toLowerCase().includes(s) ||
          h.city.toLowerCase().includes(s)
      );
    }
    return list;
  }, [households, search, statusFilter]);

  const handleLogVisitSaved = useCallback((_pendingId: string) => {
    setLogVisitHousehold(null);
    void mutate();
  }, [mutate]);

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 min-w-0 w-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-foreground">My Households</h1>
          <Button size="sm" onClick={() => {}}>
            <Plus size={14} />
            Add Household
          </Button>
        </div>

        {/* Offline indicator */}
        {!isLoading && dataSource === 'cache' && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            Cached data · offline
          </span>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="all">All statuses</option>
            {Object.entries(statusLabels).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Home size={40} className="text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No households yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((h) => (
              <div
                key={h.id}
                className="rounded-2xl border border-border bg-card p-4 flex items-start justify-between gap-3"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedHousehold(h)}
                >
                  <p className="font-medium text-sm truncate">
                    {h.houseNumber ? `${h.houseNumber} ` : ''}{h.address}, {h.streetName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {h.city}{h.postalCode ? `, ${h.postalCode}` : ''}
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className={statusColors[h.status] ?? ''}>
                      {statusLabels[h.status] ?? h.status}
                    </Badge>
                    {h.type && h.type !== 'house' && (
                      <Badge variant="outline" className="capitalize text-xs">
                        {h.type.replace('_', ' ')}
                      </Badge>
                    )}
                    {h.lastVisitDate && (
                      <span className="text-xs text-muted-foreground">
                        Last {timeAgo(h.lastVisitDate)}
                      </span>
                    )}
                  </div>
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLogVisitHousehold(h);
                  }}
                >
                  Log Visit
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visit history drawer */}
      {selectedHousehold && (
        <VisitHistoryDrawer
          household={selectedHousehold}
          onClose={() => setSelectedHousehold(null)}
          onLogVisit={() => {
            setLogVisitHousehold(selectedHousehold);
            setSelectedHousehold(null);
          }}
        />
      )}

      {/* Log visit dialog */}
      <LogVisitDialog
        open={!!logVisitHousehold}
        household={logVisitHousehold}
        onClose={() => setLogVisitHousehold(null)}
        onSaved={handleLogVisitSaved}
      />
    </>
  );
}
