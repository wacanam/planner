'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AddEncounterForm,
  type AddEncounterFormValues,
} from '@/components/households/add-encounter-form';

const nativeSelectClassName =
  'flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';

const schema = z.object({
  outcome: z.enum(['answered', 'not_home', 'return_visit', 'do_not_visit', 'moved', 'other']),
  householdStatusAfter: z.string().optional(),
  duration: z.number().min(1).max(300).optional(),
  literatureLeft: z.string().optional(),
  bibleTopicDiscussed: z.string().optional(),
  returnVisitPlanned: z.boolean().optional(),
  nextVisitDate: z.string().optional(),
  nextVisitTime: z.string().optional(),
  nextVisitNotes: z.string().optional(),
  notes: z.string().optional(),
});

export type LogVisitFormValues = z.infer<typeof schema>;
export type { AddEncounterFormValues };

const outcomes = [
  { value: 'answered', label: 'Answered' },
  { value: 'not_home', label: 'Not Home' },
  { value: 'return_visit', label: 'Return Visit' },
  { value: 'do_not_visit', label: 'Do Not Visit' },
  { value: 'moved', label: 'Moved' },
  { value: 'other', label: 'Other' },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'not_home', label: 'Not Home' },
  { value: 'return_visit', label: 'Return Visit' },
  { value: 'do_not_visit', label: 'Do Not Visit' },
  { value: 'moved', label: 'Moved' },
  { value: 'inactive', label: 'Inactive' },
];

interface LogVisitFormProps {
  submitting?: boolean;
  onSubmit: (
    values: LogVisitFormValues,
    encounters: AddEncounterFormValues[]
  ) => Promise<void> | void;
}

export function LogVisitForm({ submitting = false, onSubmit }: LogVisitFormProps) {
  const [encounters, setEncounters] = useState<AddEncounterFormValues[]>([]);
  const [showEncounterForm, setShowEncounterForm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LogVisitFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      outcome: 'answered',
      returnVisitPlanned: false,
      notes: '',
    },
  });

  const returnVisitPlanned = watch('returnVisitPlanned');

  const handleFormSubmit = async (values: LogVisitFormValues) => {
    const nextVisitDate =
      values.returnVisitPlanned && values.nextVisitDate
        ? new Date(`${values.nextVisitDate}T${values.nextVisitTime || '09:00'}`).toISOString()
        : undefined;
    await onSubmit(
      {
        ...values,
        householdStatusAfter:
          values.householdStatusAfter === 'keep' ? undefined : values.householdStatusAfter,
        nextVisitDate,
      },
      encounters
    );
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(handleFormSubmit)}>
      <div className="space-y-1.5">
        <Label htmlFor="log-outcome">Outcome</Label>
        <select id="log-outcome" className={nativeSelectClassName} {...register('outcome')}>
          {outcomes.map((outcome) => (
            <option key={outcome.value} value={outcome.value}>
              {outcome.label}
            </option>
          ))}
        </select>
        {errors.outcome ? (
          <p className="text-xs text-destructive">{errors.outcome.message}</p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="log-status">Household status</Label>
          <select
            id="log-status"
            className={nativeSelectClassName}
            defaultValue="keep"
            {...register('householdStatusAfter')}
          >
            <option value="keep">Keep current</option>
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="log-duration">Duration</Label>
          <input
            id="log-duration"
            type="number"
            min={1}
            max={300}
            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            {...register('duration', {
              setValueAs: (value) => (value === '' ? undefined : Number(value)),
            })}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="log-literature">Literature left</Label>
          <input
            id="log-literature"
            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            {...register('literatureLeft')}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="log-topic">Topic</Label>
          <input
            id="log-topic"
            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            {...register('bibleTopicDiscussed')}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="log-notes">Notes</Label>
        <Textarea id="log-notes" rows={3} {...register('notes')} />
      </div>

      <div className="rounded-2xl border border-border bg-muted/20 p-3 space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border"
            {...register('returnVisitPlanned')}
          />
          Return visit planned
        </label>
        {returnVisitPlanned ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="next-visit-date">Return date</Label>
              <input
                id="next-visit-date"
                type="date"
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                {...register('nextVisitDate')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="next-visit-time">Return time</Label>
              <input
                id="next-visit-time"
                type="time"
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                {...register('nextVisitTime')}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="next-visit-notes">Return notes</Label>
              <Textarea id="next-visit-notes" rows={2} {...register('nextVisitNotes')} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-2 rounded-2xl border border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Add encounter?</p>
            <p className="text-xs text-muted-foreground">
              Save conversation details with this visit.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowEncounterForm((prev) => !prev)}
          >
            {showEncounterForm ? 'Skip' : 'Yes'}
          </Button>
        </div>
        {encounters.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {encounters.map((encounter, index) => (
              <span
                key={`${encounter.response}-${index}`}
                className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
              >
                {encounter.name || 'Unknown'} · {encounter.response.replace('_', ' ')}
              </span>
            ))}
          </div>
        ) : null}
        {showEncounterForm ? (
          <AddEncounterForm
            embedded
            onSubmit={(encounter) => {
              setEncounters((prev) => [...prev, encounter]);
              setShowEncounterForm(false);
            }}
          />
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Saving…' : 'Save Visit'}
      </Button>
    </form>
  );
}
