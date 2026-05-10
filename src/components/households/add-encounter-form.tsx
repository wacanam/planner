'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  response: z.string().min(1, 'Response is required'),
  notes: z.string().optional(),
});

export type AddEncounterFormValues = z.infer<typeof schema>;

interface AddEncounterFormProps {
  submitting?: boolean;
  onSubmit: (values: AddEncounterFormValues) => Promise<void> | void;
}

export function AddEncounterForm({ submitting = false, onSubmit }: AddEncounterFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddEncounterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      response: '',
      notes: '',
    },
  });

  return (
    <form
      className="space-y-3"
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
        reset();
      })}
    >
      <div className="space-y-1.5">
        <Label htmlFor="encounter-name">Name</Label>
        <Input id="encounter-name" {...register('name')} />
        {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="encounter-response">Response</Label>
        <Input id="encounter-response" {...register('response')} />
        {errors.response ? <p className="text-xs text-destructive">{errors.response.message}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="encounter-notes">Notes</Label>
        <Textarea id="encounter-notes" rows={2} {...register('notes')} />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Adding…' : 'Add Encounter'}
      </Button>
    </form>
  );
}
