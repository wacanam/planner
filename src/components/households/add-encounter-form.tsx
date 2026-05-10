'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  onSubmit: (values: AddEncounterFormValues) => Promise<void> | void;
}

export function AddEncounterForm({
  submitting = false,
  embedded = false,
  onSubmit,
}: AddEncounterFormProps) {
  const {
    control,
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

  const fields = (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="encounter-name">Name</Label>
        <Input id="encounter-name" {...register('name')} />
        {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="encounter-response">Response</Label>
        <Controller
          name="response"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="encounter-response">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receptive">Receptive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="not_interested">Not interested</SelectItem>
                <SelectItem value="hostile">Hostile</SelectItem>
                <SelectItem value="do_not_visit">Do not visit</SelectItem>
                <SelectItem value="moved">Moved</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.response ? <p className="text-xs text-destructive">{errors.response.message}</p> : null}
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
        <input type="checkbox" className="h-4 w-4 rounded border" {...register('returnVisitRequested')} />
        Return visit requested
      </label>
      <Button
        type={embedded ? 'button' : 'submit'}
        className="w-full h-10"
        disabled={submitting}
        onClick={embedded ? () => void submitEncounter() : undefined}
      >
        {submitting ? 'Adding…' : 'Add Encounter'}
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
