'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const schema = z.object({
  name: z.string().max(120).optional(),
  address: z.string().max(255).optional(),
  streetName: z.string().max(255).optional(),
  city: z.string().max(255).optional(),
  type: z.string().optional(),
  membersCount: z.number().int().min(0).optional(),
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
  const formDefaults = useMemo(
    () =>
      ({
        name: defaultValues?.name ?? '',
        address: defaultValues?.address ?? '',
        streetName: defaultValues?.streetName ?? '',
        city: defaultValues?.city ?? '',
        type: defaultValues?.type ?? 'house',
        membersCount:
          typeof defaultValues?.membersCount === 'number' ? defaultValues.membersCount : 1,
        notes: defaultValues?.notes ?? '',
      }) satisfies HouseholdFormValues,
    [defaultValues]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HouseholdFormValues>({
    resolver: zodResolver(schema),
    defaultValues: formDefaults,
  });

  useEffect(() => {
    reset(formDefaults);
  }, [formDefaults, reset]);

  return (
    <form className="space-y-4" onSubmit={handleSubmit(async (values) => onSubmit(values))}>
      <div className="space-y-1.5">
        <Label htmlFor="household-name">Household label</Label>
        <Input id="household-name" {...register('name')} />
        {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="household-address">Address or map label</Label>
        <Input id="household-address" {...register('address')} />
        {errors.address ? (
          <p className="text-xs text-destructive">{errors.address.message}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="household-type">Dwelling type</Label>
          <select
            id="household-type"
            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            {...register('type')}
          >
            <option value="house">House</option>
            <option value="apartment">Apartment</option>
            <option value="condo">Condo</option>
            <option value="townhouse">Townhouse</option>
            <option value="business">Business</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="household-members">Occupants</Label>
          <Input
            id="household-members"
            type="number"
            min={0}
            {...register('membersCount', {
              setValueAs: (value) => (value === '' ? undefined : Number(value)),
            })}
          />
          {errors.membersCount ? (
            <p className="text-xs text-destructive">{errors.membersCount.message}</p>
          ) : null}
        </div>
      </div>

      <details className="rounded-2xl border border-border bg-muted/20 p-3">
        <summary className="cursor-pointer text-sm font-medium">Address details</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="household-street-name">Street name</Label>
            <Input id="household-street-name" {...register('streetName')} />
            {errors.streetName ? (
              <p className="text-xs text-destructive">{errors.streetName.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="household-city">City</Label>
            <Input id="household-city" {...register('city')} />
            {errors.city ? <p className="text-xs text-destructive">{errors.city.message}</p> : null}
          </div>
        </div>
      </details>

      <div className="space-y-1.5">
        <Label htmlFor="household-notes">Notes</Label>
        <Textarea id="household-notes" rows={3} {...register('notes')} />
      </div>

      <Button type="submit" className="w-full h-11" disabled={submitting}>
        {submitting ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}
