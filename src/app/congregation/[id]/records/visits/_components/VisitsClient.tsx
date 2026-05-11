'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Clock, ChevronDown, ChevronUp, BookOpen, User, FileText, Pencil } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMyVisits } from '@/hooks';
import { updateVisitRecord } from '@/lib/record-writes';
import { type LogVisitFormData, logVisitSchema } from '@/schemas/visit';
import { timeAgo } from '@/lib/time-ago';
import type { Visit } from '@/types/api';

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
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function formatNextVisit(value?: string | null, time?: string | null) {
  if (!value) return '';
  const parsed = new Date(value.includes('T') ? value : `${value}T${time || '00:00'}`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString([], {
    dateStyle: 'medium',
    ...(time || value.includes('T') ? { timeStyle: 'short' as const } : {}),
  });
}

function splitNextVisit(value?: string | null, time?: string | null) {
  if (!value) return { date: undefined, time: time ?? undefined };
  if (ISO_DATE_PATTERN.test(value)) return { date: value, time: time ?? undefined };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: undefined, time: time ?? undefined };
  const date = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  return { date, time: time ?? parsed.toTimeString().slice(0, 5) };
}

function combineNextVisit(date?: string, time?: string) {
  if (!date) return undefined;
  return new Date(`${date}T${time || '09:00'}`).toISOString();
}

const statusLabels: Record<string, string> = {
  new: 'New',
  active: 'Active',
  not_home: 'Not Home',
  return_visit: 'Return Visit',
  do_not_visit: 'Do Not Visit',
  moved: 'Moved',
  inactive: 'Inactive',
};

function EditVisitSheet({
  visit,
  open,
  onClose,
}: {
  visit: (Visit & { householdAddress?: string; householdCity?: string }) | null;
  open: boolean;
  onClose: () => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LogVisitFormData>({
    resolver: zodResolver(logVisitSchema),
    defaultValues: { returnVisitPlanned: false, addEncounter: false, encounterResponse: 'neutral' },
  });

  useEffect(() => {
    if (!open || !visit) return;
    const nextVisit = splitNextVisit(visit.nextVisitDate, visit.nextVisitTime);
    reset({
      outcome: visit.outcome as LogVisitFormData['outcome'],
      householdStatusAfter: visit.householdStatusAfter as LogVisitFormData['householdStatusAfter'],
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
    });
  }, [open, reset, visit]);

  const onSubmit = async (values: LogVisitFormData) => {
    if (!visit) return;
    await updateVisitRecord(visit.id, {
      outcome: values.outcome,
      householdStatusAfter: values.householdStatusAfter,
      duration: values.duration,
      literatureLeft: values.literatureLeft,
      bibleTopicDiscussed: values.bibleTopicDiscussed,
      returnVisitPlanned: values.returnVisitPlanned ?? false,
      nextVisitDate: values.returnVisitPlanned
        ? combineNextVisit(values.nextVisitDate, values.nextVisitTime)
        : undefined,
      nextVisitTime: values.returnVisitPlanned ? values.nextVisitTime : undefined,
      nextVisitNotes: values.nextVisitNotes,
      notes: values.notes,
    });
    onClose();
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
      title="Edit Visit"
      description={
        visit ? [visit.householdAddress, visit.householdCity].filter(Boolean).join(', ') : undefined
      }
      contentClassName="sm:max-w-md"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-h-[calc(90vh-200px)] overflow-y-auto space-y-4 pr-4"
      >
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
                  {Object.entries(outcomeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.outcome && <p className="text-xs text-destructive">{errors.outcome.message}</p>}
        </div>

        <div className="space-y-1.5">
          <span className="text-sm font-medium">Update Household Status</span>
          <Controller
            name="householdStatusAfter"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={(value) => field.onChange(value || undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder="Keep current status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <FormField
          label="Duration (minutes)"
          id="visitDuration"
          type="number"
          min={1}
          max={300}
          error={errors.duration?.message}
          {...register('duration', { setValueAs: (value) => (value === '' ? undefined : Number(value)) })}
        />

        <FormField
          label="Literature Left"
          id="visitLiterature"
          error={errors.literatureLeft?.message}
          {...register('literatureLeft')}
        />

        <FormField
          label="Bible Topic Discussed"
          id="visitTopic"
          error={errors.bibleTopicDiscussed?.message}
          {...register('bibleTopicDiscussed')}
        />

        <FormField
          label="Notes"
          id="visitNotes"
          multiline
          rows={3}
          error={errors.notes?.message}
          {...register('notes')}
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="visitReturnPlanned"
            className="h-4 w-4 rounded border"
            {...register('returnVisitPlanned')}
          />
          <label htmlFor="visitReturnPlanned" className="text-sm font-medium">
            Return visit planned
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            label="Next Visit Date"
            id="visitNextDate"
            type="date"
            error={errors.nextVisitDate?.message}
            {...register('nextVisitDate')}
          />
          <FormField
            label="Next Visit Time"
            id="visitNextTime"
            type="time"
            error={errors.nextVisitTime?.message}
            {...register('nextVisitTime')}
          />
        </div>

        <FormField
          label="Next Visit Notes"
          id="visitNextNotes"
          multiline
          rows={2}
          error={errors.nextVisitNotes?.message}
          {...register('nextVisitNotes')}
        />

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}

function VisitCard({
  visit,
  onEdit,
}: {
  visit: Visit & { householdAddress?: string; householdCity?: string };
  onEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const hasDetails =
    visit.notes ||
    visit.literatureLeft ||
    visit.bibleTopicDiscussed ||
    visit.returnVisitPlanned ||
    visit.nextVisitDate ||
    visit.nextVisitTime;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            {visit.householdAddress ?? 'Unknown address'}
          </p>
          {visit.householdCity && (
            <p className="text-xs text-muted-foreground">{visit.householdCity}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onEdit}
            aria-label="Edit visit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Badge variant="outline" className={`shrink-0 ${outcomeColors[visit.outcome] ?? ''}`}>
            {outcomeLabels[visit.outcome] ?? visit.outcome}
          </Badge>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {timeAgo(visit.visitDate)}
        </span>
        {visit.duration && <span>{visit.duration} min</span>}
        {visit.returnVisitPlanned && (
          <span className="text-purple-600 dark:text-purple-400 font-medium">↩ Return visit</span>
        )}
      </div>

      {/* Expandable details */}
      {hasDetails && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Less' : 'Details'}
          </button>

          {expanded && (
            <div className="space-y-2 pt-1 border-t border-border">
              {visit.notes && (
                <div className="flex gap-2 text-xs">
                  <FileText size={12} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{visit.notes}</span>
                </div>
              )}
              {visit.literatureLeft && (
                <div className="flex gap-2 text-xs">
                  <BookOpen size={12} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">Literature: {visit.literatureLeft}</span>
                </div>
              )}
              {visit.bibleTopicDiscussed && (
                <div className="flex gap-2 text-xs">
                  <BookOpen size={12} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">Topic: {visit.bibleTopicDiscussed}</span>
                </div>
              )}
              {visit.nextVisitDate && (
                <div className="flex gap-2 text-xs">
                  <User size={12} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Next visit: {formatNextVisit(visit.nextVisitDate, visit.nextVisitTime)}
                    {visit.nextVisitNotes ? ` · ${visit.nextVisitNotes}` : ''}
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function VisitsClient() {
  const { visits, isLoading, error } = useMyVisits();
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [editingVisit, setEditingVisit] = useState<
    (Visit & { householdAddress?: string; householdCity?: string }) | null
  >(null);

  const filtered =
    outcomeFilter === 'all' ? visits : visits.filter((v) => v.outcome === outcomeFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 min-w-0 w-full">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">My Visits</h1>
        {!isLoading && visits.length > 0 && (
          <span className="text-xs text-muted-foreground">{visits.length} total</span>
        )}
      </div>

      {/* Outcome filter */}
      {visits.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="all">All outcomes</option>
            {Object.entries(outcomeLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Clock size={40} className="text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No visits logged yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Log visits from your Assignments tab.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => (
            <VisitCard
              key={v.id}
              visit={v as Visit & { householdAddress?: string; householdCity?: string }}
              onEdit={() =>
                setEditingVisit(v as Visit & { householdAddress?: string; householdCity?: string })
              }
            />
          ))}
        </div>
      )}

      <EditVisitSheet
        visit={editingVisit}
        open={!!editingVisit}
        onClose={() => setEditingVisit(null)}
      />
    </div>
  );
}
