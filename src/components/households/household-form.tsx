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
  address: z.string().min(1, 'Address is required'),
  streetName: z.string().min(1, 'Street name is required'),
  city: z.string().min(1, 'City is required'),
  membersCount: z.coerce.number().int().min(1, 'Members must be at least 1'),
  notes: z.string().optional(),
});

export type HouseholdFormValues = z.infer<typeof schema>;

interface HouseholdFormProps {
  defaultValues?: Partial<HouseholdFormValues>;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: HouseholdFormValues) => Promise<void> | void;
}

export function HouseholdForm({
  defaultValues,
  submitting = false,
  submitLabel = 'Save Household',
  onSubmit,
}: HouseholdFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HouseholdFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      address: defaultValues?.address ?? '',
      streetName: defaultValues?.streetName ?? '',
      city: defaultValues?.city ?? '',
      membersCount: defaultValues?.membersCount ?? 1,
      notes: defaultValues?.notes ?? '',
    },
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(async (values) => onSubmit(values))}>
      <div className="space-y-1.5">
        <Label htmlFor="household-name">Household name</Label>
        <Input id="household-name" {...register('name')} />
        {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="household-address">Address</Label>
        <Input id="household-address" {...register('address')} />
        {errors.address ? <p className="text-xs text-destructive">{errors.address.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="household-members">Members count</Label>
        <Input id="household-members" type="number" min={1} {...register('membersCount')} />
        {errors.membersCount ? <p className="text-xs text-destructive">{errors.membersCount.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="household-street-name">Street name</Label>
        <Input id="household-street-name" {...register('streetName')} />
        {errors.streetName ? <p className="text-xs text-destructive">{errors.streetName.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="household-city">City</Label>
        <Input id="household-city" {...register('city')} />
        {errors.city ? <p className="text-xs text-destructive">{errors.city.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="household-notes">Notes</Label>
        <Textarea id="household-notes" rows={3} {...register('notes')} />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}
