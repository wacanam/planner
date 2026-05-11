'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const nativeSelectClassName =
  'flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';

const schema = z.object({
  name: z.string().max(120).optional(),
  response: z.enum(['receptive', 'neutral', 'not_interested', 'hostile', 'do_not_visit', 'moved']),
  topicDiscussed: z.string().max(255).optional(),
  literatureAccepted: z.string().max(255).optional(),
  returnVisitRequested: z.boolean().optional(),
  notes: z.string().optional(),
});

export type AddEncounterFormValues = z.infer<typeof schema>;

interface AddEncounterFormProps {
  submitting?: boolean;
  embedded?: boolean;
  initialValues?: Partial<AddEncounterFormValues>;
  submitLabel?: string;
  onSubmit: (values: AddEncounterFormValues) => Promise<void> | void;
}

export function AddEncounterForm({
  submitting = false,
  embedded = false,
  initialValues,
  submitLabel,
  onSubmit,
}: AddEncounterFormProps) {
  const getSubmittingLabel = () => {
    const currentLabel = submitLabel ?? 'Add Encounter';
    if (currentLabel.toLowerCase().includes('save')) return 'Updating…';
    return 'Adding…';
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddEncounterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      response: 'neutral',
      topicDiscussed: '',
      literatureAccepted: '',
      returnVisitRequested: false,
      notes: '',
    },
  });

  const submitEncounter = handleSubmit(async (values) => {
    await onSubmit(values);
    reset();
  });

  useEffect(() => {
    if (!initialValues) return;
    reset({
      name: initialValues.name ?? '',
      response: initialValues.response ?? 'neutral',
      topicDiscussed: initialValues.topicDiscussed ?? '',
      literatureAccepted: initialValues.literatureAccepted ?? '',
      returnVisitRequested: initialValues.returnVisitRequested ?? false,
      notes: initialValues.notes ?? '',
    });
  }, [initialValues, reset]);

  const fields = (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="encounter-name">Name</Label>
        <Input id="encounter-name" {...register('name')} />
        {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="encounter-response">Response</Label>
        <select id="encounter-response" className={nativeSelectClassName} {...register('response')}>
          <option value="receptive">Receptive</option>
          <option value="neutral">Neutral</option>
          <option value="not_interested">Not interested</option>
          <option value="hostile">Hostile</option>
          <option value="do_not_visit">Do not visit</option>
          <option value="moved">Moved</option>
        </select>
        {errors.response ? (
          <p className="text-xs text-destructive">{errors.response.message}</p>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="encounter-topic">Topic</Label>
          <Input id="encounter-topic" {...register('topicDiscussed')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="encounter-literature">Literature</Label>
          <Input id="encounter-literature" {...register('literatureAccepted')} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="encounter-notes">Notes</Label>
        <Textarea id="encounter-notes" rows={2} {...register('notes')} />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border"
          {...register('returnVisitRequested')}
        />
        Return visit requested
      </label>
      <Button
        type={embedded ? 'button' : 'submit'}
        className="w-full h-10"
        disabled={submitting}
        onClick={embedded ? () => void submitEncounter() : undefined}
      >
        {submitting ? getSubmittingLabel() : submitLabel ?? 'Add Encounter'}
      </Button>
    </>
  );

  if (embedded) {
    return <div className="space-y-3">{fields}</div>;
  }

  return (
    <form className="space-y-3" onSubmit={(event) => void submitEncounter(event)}>
      {fields}
    </form>
  );
}
