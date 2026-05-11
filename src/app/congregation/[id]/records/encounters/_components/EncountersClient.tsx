'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Trash2, Plus, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { FormField } from '@/components/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useHouseholds, useMyEncounters } from '@/hooks';
import {
  deleteEncounterRecord,
  saveEncounterRecord,
  updateEncounterRecord,
} from '@/lib/record-writes';
import { type RecordEncounterFormData, recordEncounterSchema } from '@/schemas/visit';
import type { Encounter, Household } from '@/types/api';

const responseColors: Record<string, string> = {
  receptive: 'text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20',
  neutral: 'text-blue-700 border-blue-200 bg-blue-50',
  not_interested: 'text-yellow-700 border-yellow-200 bg-yellow-50',
  hostile: 'text-red-700 border-red-200 bg-red-50',
  do_not_visit: 'text-red-700 border-red-200 bg-red-50',
  moved: 'text-muted-foreground border-border bg-muted/30',
};

const responseLabels: Record<string, string> = {
  receptive: 'Receptive',
  neutral: 'Neutral',
  not_interested: 'Not Interested',
  hostile: 'Hostile',
  do_not_visit: 'Do Not Visit',
  moved: 'Moved',
};

const DEFAULT_VALUES: Partial<RecordEncounterFormData> = {
  householdId: '',
  encounterDate: new Date().toISOString().slice(0, 10),
  gender: 'unknown',
  role: 'unknown',
  bibleStudyInterest: false,
  returnVisitRequested: false,
};

function householdLabel(household: Household) {
  const address =
    household.address || [household.houseNumber, household.streetName].filter(Boolean).join(' ');
  return `${address || 'Unnamed household'}${household.city ? `, ${household.city}` : ''}`;
}

interface LogEncounterDialogProps {
  households: Household[];
  encounter?: Encounter | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function LogEncounterDialog({
  households,
  encounter,
  open,
  onOpenChange,
  onSaved,
}: LogEncounterDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RecordEncounterFormData>({
    resolver: zodResolver(recordEncounterSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const onSubmit = async (values: RecordEncounterFormData) => {
    const payload = {
      ...values,
      householdId: values.householdId || null,
    };

    if (encounter) {
      await updateEncounterRecord(encounter.id, payload);
    } else {
      await saveEncounterRecord(payload);
    }
    onSaved();
    reset(DEFAULT_VALUES);
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) return;
    reset(
      encounter
        ? {
            householdId: encounter.householdId ?? '',
            encounterDate: (encounter.visitDate ?? encounter.createdAt).slice(0, 10),
            name: encounter.name ?? undefined,
            gender: (encounter.gender as RecordEncounterFormData['gender']) ?? 'unknown',
            role: (encounter.role as RecordEncounterFormData['role']) ?? 'unknown',
            response: encounter.response as RecordEncounterFormData['response'],
            topicDiscussed: encounter.topicDiscussed ?? undefined,
            literatureAccepted: encounter.literatureAccepted ?? undefined,
            bibleStudyInterest: encounter.bibleStudyInterest,
            returnVisitRequested: encounter.returnVisitRequested,
            notes: encounter.notes ?? undefined,
          }
        : DEFAULT_VALUES
    );
  }, [encounter, open, reset]);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={encounter ? 'Edit Encounter' : 'Log Encounter'}
      description="Record a ministry conversation even if it happened outside an assignment or without a visit."
      contentClassName="sm:max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="max-h-[calc(90vh-180px)] space-y-4 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Response *</span>
            <Controller
              name="response"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select response..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(responseLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.response && (
              <p className="text-xs text-destructive">{errors.response.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium">Linked Household</span>
            <Controller
              name="householdId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || 'none'}
                  onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No linked household" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No linked household</SelectItem>
                    {households.map((household) => (
                      <SelectItem key={household.id} value={household.id}>
                        {householdLabel(household)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <FormField
            label="Encounter Date"
            id="encounterDate"
            type="date"
            error={errors.encounterDate?.message}
            {...register('encounterDate')}
          />

          <FormField
            label="Name"
            id="encounterName"
            optional
            error={errors.name?.message}
            {...register('name')}
          />

          <FormField
            label="Topic Discussed"
            id="encounterTopic"
            optional
            error={errors.topicDiscussed?.message}
            {...register('topicDiscussed')}
          />

          <FormField
            label="Literature Accepted"
            id="encounterLiterature"
            optional
            error={errors.literatureAccepted?.message}
            {...register('literatureAccepted')}
          />

          <FormField
            label="Notes"
            id="encounterNotes"
            multiline
            rows={4}
            optional
            error={errors.notes?.message}
            {...register('notes')}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="returnVisitRequested"
              className="h-4 w-4 rounded border"
              {...register('returnVisitRequested')}
            />
            <label htmlFor="returnVisitRequested" className="text-sm font-medium">
              Return visit requested
            </label>
          </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {encounter ? 'Save Changes' : 'Save Encounter'}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}

// ─── Swipe Card for Encounter ─────────────────────────────────────────────────

interface EncounterSwipeCardProps {
  isRevealed: boolean;
  onSwipe: (revealed: boolean) => void;
  onDelete: () => void;
  deleting: boolean;
  children: React.ReactNode;
}

function EncounterSwipeCard({
  isRevealed,
  onSwipe,
  onDelete,
  deleting,
  children,
}: EncounterSwipeCardProps) {
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
      onSwipe(true);
    } else {
      setOffset(0);
      if (isRevealed) onSwipe(false);
    }
  };

  useEffect(() => {
    if (!isRevealed) setOffset(0);
    else setOffset(ACTION_WIDTH);
  }, [isRevealed]);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div
        className="absolute right-0 top-0 bottom-0 flex items-stretch"
        style={{ width: ACTION_WIDTH }}
      >
        <button
          type="button"
          disabled={deleting}
          onClick={onDelete}
          className="flex flex-col items-center justify-center w-full bg-destructive text-destructive-foreground rounded-r-2xl text-xs font-medium gap-1 disabled:opacity-50"
        >
          {deleting ? (
            <span>…</span>
          ) : (
            <>
              <Trash2 size={16} />
              <span>Delete</span>
            </>
          )}
        </button>
      </div>
      <div
        className="border border-border bg-card p-4 flex items-start justify-between gap-3"
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

export default function EncountersClient() {
  const { encounters, isLoading, error } = useMyEncounters();
  const { households } = useHouseholds();
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [editingEncounter, setEditingEncounter] = useState<Encounter | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteEncounterRecord(id);
      setDeletedIds((prev) => new Set(prev).add(id));
      setSwipedId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const visibleEncounters = encounters.filter((e) => !deletedIds.has(e.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 min-w-0 w-full">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">My Encounters</h1>
        <Button size="sm" onClick={() => setShowLogDialog(true)} className="gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" />
          Log Encounter
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : visibleEncounters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users size={40} className="text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No encounters logged yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Use Log Encounter for conversations inside or outside your assignment.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleEncounters.map((encounter) => (
            <EncounterSwipeCard
              key={encounter.id}
              isRevealed={swipedId === encounter.id}
              onSwipe={(revealed) => setSwipedId(revealed ? encounter.id : null)}
              onDelete={() => void handleDelete(encounter.id)}
              deleting={deletingId === encounter.id}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {encounter.name ?? 'Unknown person'}
                  {encounter.householdAddress ? (
                    <span className="text-muted-foreground font-normal">
                      {' '}
                      · {encounter.householdAddress}
                      {encounter.householdCity ? `, ${encounter.householdCity}` : ''}
                    </span>
                  ) : (
                    <span className="text-muted-foreground font-normal">
                      {' '}
                      · Standalone encounter
                    </span>
                  )}
                </p>
                {(encounter.topicDiscussed || encounter.notes) && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {encounter.topicDiscussed ?? encounter.notes}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    {encounter.visitDate
                      ? new Date(encounter.visitDate).toLocaleDateString()
                      : new Date(encounter.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingEncounter(encounter)}
                  aria-label="Edit encounter"
                >
                  <Pencil size={13} />
                </Button>
                <Badge variant="outline" className={responseColors[encounter.response] ?? ''}>
                  {responseLabels[encounter.response] ?? encounter.response}
                </Badge>
              </div>
            </EncounterSwipeCard>
          ))}
        </div>
      )}

      <LogEncounterDialog
        households={households}
        open={showLogDialog}
        onOpenChange={setShowLogDialog}
        onSaved={() => undefined}
      />
      <LogEncounterDialog
        households={households}
        encounter={editingEncounter}
        open={!!editingEncounter}
        onOpenChange={(open) => {
          if (!open) setEditingEncounter(null);
        }}
        onSaved={() => setEditingEncounter(null)}
      />
    </div>
  );
}
