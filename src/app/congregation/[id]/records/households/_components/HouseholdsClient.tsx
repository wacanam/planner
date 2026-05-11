'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Home,
  Plus,
  Search,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  BookOpen,
  FileText,
  User,
  Trash2,
  Pencil,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useHouseholds, useHouseholdVisits, useMyVisits } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
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
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { HouseholdForm, type HouseholdFormValues } from '@/components/households/household-form';
import {
  HouseholdEncounterSheet,
  HouseholdLogVisitSheet,
} from '@/components/households/household-action-sheets';
import {
  logVisitSchema,
  type LogVisitFormData,
} from '@/schemas/visit';
import {
  deleteHouseholdRecord,
  deleteVisitRecord,
  saveHouseholdRecord,
  saveVisitRecord,
  updateHouseholdRecord,
  updateVisitRecord,
} from '@/lib/record-writes';
import { timeAgo } from '@/lib/time-ago';
import type { Household, Visit } from '@/types/api';

// ─── Constants ─────────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  new: 'text-muted-foreground border-border bg-muted/30',
  active: 'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
  not_home:
    'text-yellow-700 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400',
  return_visit:
    'text-purple-700 border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400',
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
  not_home:
    'text-yellow-700 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400',
  return_visit:
    'text-purple-700 border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400',
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
const DEFAULT_HOUSEHOLD_MEMBERS = 1;

function splitNextVisit(value?: string | null, time?: string | null) {
  if (!value) return { date: undefined, time: time ?? undefined };
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return { date: value, time: time ?? undefined };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: value.slice(0, 10), time: time ?? undefined };
  const date = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  return { date, time: time ?? parsed.toTimeString().slice(0, 5) };
}

function combineNextVisit(date?: string, time?: string) {
  if (!date) return undefined;
  return new Date(`${date}T${time || '09:00'}`).toISOString();
}

function formatNextVisit(value?: string | null, time?: string | null) {
  if (!value) return '';
  const parsed = new Date(value.includes('T') ? value : `${value}T${time || '00:00'}`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString([], {
    dateStyle: 'medium',
    ...(time || value.includes('T') ? { timeStyle: 'short' as const } : {}),
  });
}

// ─── Visit History Drawer ───────────────────────────────────────────────────────

interface VisitHistoryDrawerProps {
  household: Household | null;
  onClose: () => void;
  onLogVisit: () => void;
  onAddEncounter: () => void;
}

function VisitHistoryDrawer({ household, onClose, onLogVisit, onAddEncounter }: VisitHistoryDrawerProps) {
  const { visits, isLoading } = useHouseholdVisits(household?.id ?? null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingVisitId, setDeletingVisitId] = useState<string | null>(null);
  const [deletedVisitIds, setDeletedVisitIds] = useState<Set<string>>(new Set());
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);

  const handleDeleteVisit = async (visitId: string) => {
    setDeletingVisitId(visitId);
    try {
      await deleteVisitRecord(visitId);
      setDeletedVisitIds((prev) => new Set(prev).add(visitId));
    } finally {
      setDeletingVisitId(null);
    }
  };

  if (!household) return null;

  const visibleVisits = visits.filter((v) => !deletedVisitIds.has(v.id));

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss via click
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation" onClick={onClose}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss on click */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation */}
      <div
        className="relative w-full max-w-md h-full bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-sm truncate">
              {household.houseNumber ? `${household.houseNumber} ` : ''}
              {household.address}
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
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" className="w-full" onClick={onLogVisit}>
              + Log Visit
            </Button>
            <Button size="sm" variant="outline" className="w-full" onClick={onAddEncounter}>
              + Encounter
            </Button>
          </div>
        </div>

        {/* Visit history */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Visit History ({isLoading ? '…' : visibleVisits.length})
          </h3>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : visibleVisits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Clock size={32} className="text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No visits recorded yet.</p>
            </div>
          ) : (
            visibleVisits.map((v) => {
              const isExpanded = expandedId === v.id;
              const hasDetails =
                v.notes ||
                v.literatureLeft ||
                v.bibleTopicDiscussed ||
                v.returnVisitPlanned ||
                v.nextVisitDate ||
                v.nextVisitTime;
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
                      {v.duration && (
                        <p className="text-xs text-muted-foreground">{v.duration} min</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-xs ${outcomeColors[v.outcome] ?? ''}`}
                      >
                        {outcomeLabels[v.outcome] ?? v.outcome}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => setEditingVisit(v)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label="Edit visit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={deletingVisitId === v.id}
                        onClick={() => void handleDeleteVisit(v.id)}
                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        aria-label="Delete visit"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {v.returnVisitPlanned && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                      ↩ Return visit planned
                    </p>
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
                              <FileText
                                size={11}
                                className="mt-0.5 shrink-0 text-muted-foreground"
                              />
                              <span className="text-muted-foreground">{v.notes}</span>
                            </div>
                          )}
                          {v.literatureLeft && (
                            <div className="flex gap-2 text-xs">
                              <BookOpen
                                size={11}
                                className="mt-0.5 shrink-0 text-muted-foreground"
                              />
                              <span className="text-muted-foreground">
                                Literature: {v.literatureLeft}
                              </span>
                            </div>
                          )}
                          {v.bibleTopicDiscussed && (
                            <div className="flex gap-2 text-xs">
                              <BookOpen
                                size={11}
                                className="mt-0.5 shrink-0 text-muted-foreground"
                              />
                              <span className="text-muted-foreground">
                                Topic: {v.bibleTopicDiscussed}
                              </span>
                            </div>
                          )}
                          {v.nextVisitDate && (
                            <div className="flex gap-2 text-xs">
                              <User size={11} className="mt-0.5 shrink-0 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                Next: {formatNextVisit(v.nextVisitDate, v.nextVisitTime)}
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
      <LogVisitDialog
        open={!!editingVisit}
        household={household}
        visit={editingVisit}
        onClose={() => setEditingVisit(null)}
        onSaved={() => setEditingVisit(null)}
      />
    </div>
  );
}

// ─── Log Visit Dialog ───────────────────────────────────────────────────────────

interface LogVisitDialogProps {
  open: boolean;
  household: Household | null;
  visit?: Visit | null;
  onClose: () => void;
  onSaved: (pendingId: string) => void;
}

function LogVisitDialog({ open, household, visit, onClose, onSaved }: LogVisitDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LogVisitFormData>({
    resolver: zodResolver(logVisitSchema),
    defaultValues: { returnVisitPlanned: false, addEncounter: false, encounterResponse: 'neutral' },
  });

  const returnVisitPlanned = watch('returnVisitPlanned');

  useEffect(() => {
    if (!open) return;
    reset(
      visit
        ? (() => {
            const nextVisit = splitNextVisit(visit.nextVisitDate, visit.nextVisitTime);
            return {
              outcome: visit.outcome as LogVisitFormData['outcome'],
              householdStatusAfter:
                visit.householdStatusAfter as LogVisitFormData['householdStatusAfter'],
              duration: visit.duration ?? undefined,
              literatureLeft: visit.literatureLeft ?? undefined,
              bibleTopicDiscussed: visit.bibleTopicDiscussed ?? undefined,
              returnVisitPlanned: visit.returnVisitPlanned,
              nextVisitDate: nextVisit.date,
              nextVisitTime: nextVisit.time,
              nextVisitNotes: visit.nextVisitNotes ?? undefined,
              notes: visit.notes ?? undefined,
              addEncounter: false,
              encounterResponse: 'neutral',
            };
          })()
        : { returnVisitPlanned: false, addEncounter: false, encounterResponse: 'neutral' }
    );
  }, [open, reset, visit]);

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
      nextVisitDate: values.returnVisitPlanned
        ? combineNextVisit(values.nextVisitDate, values.nextVisitTime)
        : undefined,
      nextVisitTime: values.returnVisitPlanned ? values.nextVisitTime : undefined,
      nextVisitNotes: values.nextVisitNotes,
    };
    const savedId = visit
      ? await updateVisitRecord(visit.id, payload)
      : await saveVisitRecord(payload);
    onSaved(savedId);
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{visit ? 'Edit Visit' : 'Log Visit'}</DialogTitle>
          {household && (
            <p className="text-sm text-muted-foreground mt-1">
              {household.address}, {household.city}
            </p>
          )}
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="max-h-[calc(90vh-200px)] overflow-y-auto space-y-4 pr-4"
        >
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
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
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
                <Select
                  value={field.value ?? ''}
                  onValueChange={(v) => field.onChange(v || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Keep current status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <FormField
            label="Duration (minutes)"
            id="duration"
            type="number"
            min={1}
            max={300}
            error={errors.duration?.message}
            {...register('duration', {
              setValueAs: (value) => (value === '' ? undefined : Number(value)),
            })}
          />

          <FormField
            label="Literature Left"
            id="literatureLeft"
            error={errors.literatureLeft?.message}
            {...register('literatureLeft')}
          />

          <FormField
            label="Bible Topic Discussed"
            id="bibleTopicDiscussed"
            error={errors.bibleTopicDiscussed?.message}
            {...register('bibleTopicDiscussed')}
          />

          <FormField
            label="Notes"
            id="notes"
            multiline
            rows={3}
            error={errors.notes?.message}
            {...register('notes')}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="returnVisitPlanned"
              className="h-4 w-4 rounded border"
              {...register('returnVisitPlanned')}
            />
            <label htmlFor="returnVisitPlanned" className="text-sm font-medium">
              Return visit planned
            </label>
          </div>

          {returnVisitPlanned && (
            <>
              <FormField
                label="Next visit date"
                id="nextVisitDate"
                type="date"
                error={errors.nextVisitDate?.message}
                {...register('nextVisitDate')}
              />
              <FormField
                label="Next visit time"
                id="nextVisitTime"
                type="time"
                error={errors.nextVisitTime?.message}
                {...register('nextVisitTime')}
              />
              <FormField
                label="Next visit notes"
                id="nextVisitNotes"
                multiline
                rows={2}
                error={errors.nextVisitNotes?.message}
                {...register('nextVisitNotes')}
              />
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : visit ? 'Save Changes' : 'Save Visit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Household Dialog ───────────────────────────────────────────────────────

interface AddHouseholdDialogProps {
  open: boolean;
  household?: Household | null;
  onClose: () => void;
  onSaved: (pendingId: string) => void;
}

function AddHouseholdDialog({ open, household, onClose, onSaved }: AddHouseholdDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const formDefaults = useMemo<Partial<HouseholdFormValues>>(
    () =>
      household
        ? {
            name: household.name ?? '',
            address: household.address,
            streetName: household.streetName,
            city: household.city,
            type: household.type,
            membersCount: household.occupantsCount ?? DEFAULT_HOUSEHOLD_MEMBERS,
            notes: household.notes ?? '',
          }
        : { type: 'house', membersCount: DEFAULT_HOUSEHOLD_MEMBERS },
    [household]
  );

  const onSubmit = async (values: HouseholdFormValues) => {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        address: values.address ?? '',
        streetName: values.streetName,
        city: values.city,
        type: values.type,
        // HouseholdForm uses membersCount while records/local-first storage uses occupantsCount.
        occupantsCount: values.membersCount,
        notes: values.notes,
      };
      const savedId = household
        ? await updateHouseholdRecord(household.id, payload)
        : await saveHouseholdRecord(payload);
      onSaved(savedId);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title={household ? 'Edit Household' : 'Add Household'}
      description={household ? 'Update this household record' : 'Create a new household record'}
      contentClassName="sm:max-w-lg"
    >
      <HouseholdForm
        submitting={submitting}
        defaultValues={formDefaults}
        submitLabel={household ? 'Save Changes' : 'Add Household'}
        onSubmit={onSubmit}
      />
    </ResponsiveDialog>
  );
}

// ─── Swipe To Reveal ─────────────────────────────────────────────────────────

interface SwipeToRevealProps {
  id: string;
  swipedId: string | null;
  onSwipe: (id: string | null) => void;
  actions: React.ReactNode;
  children: React.ReactNode;
}

function SwipeToReveal({ id, swipedId, onSwipe, actions, children }: SwipeToRevealProps) {
  const isRevealed = swipedId === id;
  const startXRef = useRef<number>(0);
  const draggingRef = useRef(false);
  const [offset, setOffset] = useState(0);
  const ACTION_WIDTH = 72;
  const THRESHOLD = 40;

  const onTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    draggingRef.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!draggingRef.current) return;
    const dx = startXRef.current - e.touches[0].clientX;
    if (isRevealed) {
      setOffset(Math.max(0, Math.min(ACTION_WIDTH, ACTION_WIDTH + dx)));
    } else {
      setOffset(Math.max(0, Math.min(ACTION_WIDTH, dx)));
    }
  };

  const onTouchEnd = () => {
    draggingRef.current = false;
    if (offset > THRESHOLD) {
      setOffset(ACTION_WIDTH);
      onSwipe(id);
    } else {
      setOffset(0);
      if (isRevealed) onSwipe(null);
    }
  };

  // Sync offset when external state changes
  useEffect(() => {
    if (!isRevealed) setOffset(0);
    else setOffset(ACTION_WIDTH);
  }, [isRevealed]);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Action slot (behind the card, right-aligned) */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-stretch"
        style={{ width: ACTION_WIDTH }}
      >
        {actions}
      </div>
      {/* Card content */}
      <div
        style={{
          transform: `translateX(-${offset}px)`,
          transition: draggingRef.current ? 'none' : 'transform 0.2s ease',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function HouseholdsClient() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [logVisitHousehold, setLogVisitHousehold] = useState<Household | null>(null);
  const [encounterHousehold, setEncounterHousehold] = useState<Household | null>(null);
  const [editHousehold, setEditHousehold] = useState<Household | null>(null);
  const [addHouseholdOpen, setAddHouseholdOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [swipedId, setSwipedId] = useState<string | null>(null);

  const { households, isLoading } = useHouseholds();
  const { visits: allVisits } = useMyVisits();

  // Count visits per household
  const visitCountByHousehold = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of allVisits) {
      counts[v.householdId] = (counts[v.householdId] ?? 0) + 1;
    }
    return counts;
  }, [allVisits]);

  const latestVisitIdByHousehold = useMemo(() => {
    const latest: Record<string, { id: string; at: string }> = {};
    for (const visit of allVisits) {
      const at = visit.visitDate ?? visit.createdAt ?? '';
      const current = latest[visit.householdId];
      if (!current || at > current.at) {
        latest[visit.householdId] = { id: visit.id, at };
      }
    }
    return Object.fromEntries(
      Object.entries(latest).map(([householdId, item]) => [householdId, item.id])
    ) as Record<string, string>;
  }, [allVisits]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteHouseholdRecord(id);
      setSwipedId(null);
      setDeleteConfirmId(null);
    } finally {
      setDeletingId(null);
    }
  };

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

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 min-w-0 w-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-foreground">My Households</h1>
          <Button size="sm" onClick={() => setAddHouseholdOpen(true)}>
            <Plus size={14} />
            Add Household
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1" style={{ minWidth: 200 }}>
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
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
              <option key={v} value={v}>
                {l}
              </option>
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
              <SwipeToReveal
                key={h.id}
                id={h.id}
                swipedId={swipedId}
                onSwipe={setSwipedId}
                actions={
                  <button
                    type="button"
                    disabled={deletingId === h.id}
                    onClick={() => setDeleteConfirmId(h.id)}
                    className="flex flex-col items-center justify-center w-full bg-destructive text-destructive-foreground rounded-r-2xl text-xs font-medium gap-1 disabled:opacity-50"
                  >
                    {deletingId === h.id ? (
                      <span>…</span>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </>
                    )}
                  </button>
                }
              >
                <div className="border border-border bg-card p-4 flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setSwipedId(null);
                      setSelectedHousehold(h);
                    }}
                  >
                    <p className="font-medium text-sm truncate">
                      {h.houseNumber ? `${h.houseNumber} ` : ''}
                      {h.address}, {h.streetName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {h.city}
                      {h.postalCode ? `, ${h.postalCode}` : ''}
                    </p>
                    <div className="flex gap-2 mt-2 flex-wrap items-center">
                      <Badge variant="outline" className={statusColors[h.status] ?? ''}>
                        {statusLabels[h.status] ?? h.status}
                      </Badge>
                      {h.type && h.type !== 'house' && (
                        <Badge variant="outline" className="capitalize text-xs">
                          {h.type.replace('_', ' ')}
                        </Badge>
                      )}
                      {visitCountByHousehold[h.id] ? (
                        <span className="text-xs text-muted-foreground">
                          {visitCountByHousehold[h.id]} visit
                          {visitCountByHousehold[h.id] > 1 ? 's' : ''}
                        </span>
                      ) : null}
                      {h.lastVisitDate && (
                        <span className="text-xs text-muted-foreground">
                          · Last {timeAgo(h.lastVisitDate)}
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditHousehold(h);
                      }}
                      aria-label="Edit household"
                    >
                      <Pencil size={14} />
                    </Button>
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEncounterHousehold(h);
                      }}
                    >
                      Encounter
                    </Button>
                  </div>
                </div>
              </SwipeToReveal>
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
          onAddEncounter={() => {
            setEncounterHousehold(selectedHousehold);
            setSelectedHousehold(null);
          }}
        />
      )}

      <HouseholdLogVisitSheet
        household={logVisitHousehold}
        open={!!logVisitHousehold}
        onOpenChange={(open) => {
          if (!open) setLogVisitHousehold(null);
        }}
      />

      <HouseholdEncounterSheet
        household={encounterHousehold}
        visitId={encounterHousehold ? latestVisitIdByHousehold[encounterHousehold.id] : null}
        open={!!encounterHousehold}
        onOpenChange={(open) => {
          if (!open) setEncounterHousehold(null);
        }}
      />

      {/* Add household dialog */}
      <AddHouseholdDialog
        open={addHouseholdOpen}
        onClose={() => setAddHouseholdOpen(false)}
        onSaved={() => {
          setAddHouseholdOpen(false);
        }}
      />

      <AddHouseholdDialog
        open={!!editHousehold}
        household={editHousehold}
        onClose={() => setEditHousehold(null)}
        onSaved={() => setEditHousehold(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteConfirmId)}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
        title="Delete household?"
        description="This removes the household from records. This action cannot be undone."
        confirmLabel={deletingId === deleteConfirmId ? 'Deleting…' : 'Delete'}
        confirmVariant="destructive"
        loading={deletingId === deleteConfirmId}
        onConfirm={async () => {
          if (!deleteConfirmId) return;
          await handleDelete(deleteConfirmId);
        }}
      />
    </>
  );
}
