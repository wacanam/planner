'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useHouseholds, useMyEncounters } from '@/hooks';
import { apiClient } from '@/lib/api-client';
import { queueEncounter, registerVisitSync } from '@/lib/visits-store';
import { type RecordEncounterFormData, recordEncounterSchema } from '@/schemas/visit';
import type { Household } from '@/types/api';

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

function householdLabel(household: Household & { _pending?: boolean }) {
  const address =
    household.address || [household.houseNumber, household.streetName].filter(Boolean).join(' ');
  const pendingSuffix = household._pending ? ' (pending)' : '';
  return `${address || 'Unnamed household'}${household.city ? `, ${household.city}` : ''}${pendingSuffix}`;
}

interface LogEncounterDialogProps {
  households: (Household & { _pending?: boolean })[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}

function LogEncounterDialog({ households, open, onOpenChange, onSaved }: LogEncounterDialogProps) {
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

  const pendingHouseholdIds = useMemo(
    () =>
      new Set(
        households.filter((household) => household._pending).map((household) => household.id)
      ),
    [households]
  );

  const onSubmit = async (values: RecordEncounterFormData) => {
    const payload = {
      ...values,
      householdId: values.householdId || undefined,
    };

    const shouldQueueOffline =
      !navigator.onLine ||
      (values.householdId ? pendingHouseholdIds.has(values.householdId) : false);

    if (shouldQueueOffline) {
      await queueEncounter(payload);
      await registerVisitSync();
    } else {
      await apiClient.post('/api/profile/encounters', payload);
    }

    await onSaved();
    reset(DEFAULT_VALUES);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Encounter</DialogTitle>
          <DialogDescription>
            Record a ministry conversation even if it happened outside an assignment or without a
            visit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Save Encounter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function EncountersClient() {
  const { encounters, isLoading, error, mutate } = useMyEncounters();
  const { households } = useHouseholds();
  const [showLogDialog, setShowLogDialog] = useState(false);

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
      ) : encounters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users size={40} className="text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No encounters logged yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Use Log Encounter for conversations inside or outside your assignment.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {encounters.map((encounter) => (
            <div
              key={encounter.id}
              className="rounded-2xl border border-border bg-card p-4 flex items-start justify-between gap-3"
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
                  {encounter._pending && (
                    <Badge
                      variant="outline"
                      className="text-amber-700 border-amber-200 bg-amber-50"
                    >
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
              <Badge variant="outline" className={responseColors[encounter.response] ?? ''}>
                {responseLabels[encounter.response] ?? encounter.response}
              </Badge>
            </div>
          ))}
        </div>
      )}

      <LogEncounterDialog
        households={households}
        open={showLogDialog}
        onOpenChange={setShowLogDialog}
        onSaved={async () => {
          await mutate();
        }}
      />
    </div>
  );
}
