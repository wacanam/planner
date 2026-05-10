'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddEncounterForm, type AddEncounterFormValues } from '@/components/households/add-encounter-form';

const schema = z.object({
  outcome: z.string().min(1, 'Outcome is required'),
  notes: z.string().optional(),
});

export type LogVisitFormValues = z.infer<typeof schema>;

const outcomes = [
  { value: 'not_home', label: 'Not Home' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'do_not_visit', label: 'Do Not Visit' },
  { value: 'revisit', label: 'Revisit' },
  { value: 'bible_study', label: 'Bible Study' },
];

interface LogVisitFormProps {
  submitting?: boolean;
  onSubmit: (values: LogVisitFormValues, encounters: AddEncounterFormValues[]) => Promise<void> | void;
}

export function LogVisitForm({ submitting = false, onSubmit }: LogVisitFormProps) {
  const [encounters, setEncounters] = useState<AddEncounterFormValues[]>([]);
  const [showEncounterForm, setShowEncounterForm] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LogVisitFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      outcome: '',
      notes: '',
    },
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(async (values) => onSubmit(values, encounters))}>
      <div className="space-y-1.5">
        <Label htmlFor="log-outcome">Outcome</Label>
        <Controller
          name="outcome"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="log-outcome">
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                {outcomes.map((outcome) => (
                  <SelectItem key={outcome.value} value={outcome.value}>
                    {outcome.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.outcome ? <p className="text-xs text-destructive">{errors.outcome.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="log-notes">Notes</Label>
        <Textarea id="log-notes" rows={3} {...register('notes')} />
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Encounters ({encounters.length})</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowEncounterForm((prev) => !prev)}>
            {showEncounterForm ? 'Hide' : 'Add Encounter'}
          </Button>
        </div>
        {showEncounterForm ? (
          <AddEncounterForm
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
