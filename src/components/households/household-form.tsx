'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useKeyboardShortcuts } from '@/hooks';
import { findDuplicateHouseholdByNumber, getNextCongregationHouseNumber } from '@/lib/households';
import type { Household } from '@/types/api';

export const householdFormSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  houseNumber: z.string().min(1, 'House number is required'),
  streetName: z.string().min(1, 'Name is required'),
  unit: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  postalCode: z.string().optional(),
  type: z.enum(['house', 'apartment', 'business', 'gated_community', 'other']),
  status: z.enum([
    'new',
    'active',
    'not_home',
    'busy',
    'return_visit',
    'foreign_language',
    'vacant',
    'inaccessible',
    'do_not_visit',
    'moved',
    'inactive',
  ]),
  occupantsCount: z.number().min(1),
  notes: z.string().optional(),
  language: z.string().optional(),
  territoryId: z.string().optional().nullable(),
});

export type HouseholdFormValues = z.infer<typeof householdFormSchema>;

interface HouseholdFormProps {
  initialValues?: Partial<Household> & { unit?: string; language?: string };
  onSubmit: (values: HouseholdFormValues) => void | Promise<void>;
  loading?: boolean;
  onCancel?: () => void;
  territories?: Array<{ id: string; name: string; number: string }>;
  existingHouseholds?: Household[];
  excludeHouseholdId?: string;
}

export function HouseholdForm({
  initialValues,
  onSubmit,
  loading = false,
  onCancel,
  territories = [],
  existingHouseholds,
  excludeHouseholdId,
}: HouseholdFormProps) {
  const defaultHouseNumber =
    initialValues?.houseNumber ??
    (existingHouseholds ? getNextCongregationHouseNumber(existingHouseholds) : '');

  const form = useForm<HouseholdFormValues>({
    resolver: zodResolver(householdFormSchema) as any,
    defaultValues: {
      address: initialValues?.address ?? '',
      houseNumber: defaultHouseNumber,
      streetName: initialValues?.streetName ?? '',
      unit: initialValues?.unit ?? '',
      city: initialValues?.city ?? '',
      postalCode: initialValues?.postalCode ?? '',
      type: (initialValues?.type as HouseholdFormValues['type']) ?? 'house',
      status: (initialValues?.status as HouseholdFormValues['status']) ?? 'new',
      occupantsCount: initialValues?.occupantsCount ?? 1,
      notes: initialValues?.notes ?? '',
      language: initialValues?.language ?? initialValues?.languages?.[0] ?? '',
      territoryId: initialValues?.territoryId ?? null,
    },
  });

  const handleFormSubmit = async (values: HouseholdFormValues) => {
    if (existingHouseholds) {
      const duplicate = findDuplicateHouseholdByNumber(
        values.houseNumber,
        existingHouseholds,
        excludeHouseholdId || initialValues?.id
      );
      if (duplicate) {
        form.setError('houseNumber', {
          type: 'manual',
          message: `House #${values.houseNumber} already exists in this congregation.`,
        });
        return;
      }
    }
    await onSubmit(values);
  };

  useKeyboardShortcuts([
    {
      key: 'Mod+Enter',
      handler: () => {
        void form.handleSubmit(handleFormSubmit)();
      },
    },
  ]);

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1 col-span-1">
          <Label htmlFor="houseNumber" className="text-xs font-semibold">
            House / Bldg # *
          </Label>
          <Input
            id="houseNumber"
            placeholder="e.g. 104"
            className="h-9 rounded-xl text-xs"
            {...form.register('houseNumber')}
          />
          {form.formState.errors.houseNumber && (
            <p className="text-[10px] text-destructive">
              {form.formState.errors.houseNumber.message}
            </p>
          )}
        </div>
        <div className="space-y-1 col-span-2">
          <Label htmlFor="streetName" className="text-xs font-semibold">
            Name *
          </Label>
          <Input
            id="streetName"
            autoFocus
            placeholder="e.g. Maple Street"
            className="h-9 rounded-xl text-xs"
            {...form.register('streetName')}
          />
          {form.formState.errors.streetName && (
            <p className="text-[10px] text-destructive">
              {form.formState.errors.streetName.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="unit" className="text-xs font-semibold">
            Unit / Apt / Flr
          </Label>
          <Input
            id="unit"
            placeholder="e.g. Apt 3B"
            className="h-9 rounded-xl text-xs"
            {...form.register('unit')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="address" className="text-xs font-semibold">
            Full Address Label *
          </Label>
          <Input
            id="address"
            placeholder="e.g. 104 Maple St, Apt 3B"
            className="h-9 rounded-xl text-xs"
            {...form.register('address')}
          />
          {form.formState.errors.address && (
            <p className="text-[10px] text-destructive">{form.formState.errors.address.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="city" className="text-xs font-semibold">
            City *
          </Label>
          <Input
            id="city"
            placeholder="City"
            className="h-9 rounded-xl text-xs"
            {...form.register('city')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="postalCode" className="text-xs font-semibold">
            Postal Code
          </Label>
          <Input
            id="postalCode"
            placeholder="Postal code"
            className="h-9 rounded-xl text-xs"
            {...form.register('postalCode')}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Structure Type</Label>
          <Select
            value={form.watch('type')}
            onValueChange={(val) => form.setValue('type', val as HouseholdFormValues['type'])}
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="house">Single Family House</SelectItem>
              <SelectItem value="apartment">Apartment / Condominium</SelectItem>
              <SelectItem value="business">Business / Commercial</SelectItem>
              <SelectItem value="gated_community">Gated Community</SelectItem>
              <SelectItem value="other">Other Structure</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold">Initial Status</Label>
          <Select
            value={form.watch('status')}
            onValueChange={(val) => form.setValue('status', val as HouseholdFormValues['status'])}
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="new">New Record</SelectItem>
              <SelectItem value="active">Active Household</SelectItem>
              <SelectItem value="not_home">Not Home</SelectItem>
              <SelectItem value="busy">Busy / Call Back</SelectItem>
              <SelectItem value="return_visit">Return Visit</SelectItem>
              <SelectItem value="foreign_language">Foreign Language</SelectItem>
              <SelectItem value="vacant">Vacant / Unoccupied</SelectItem>
              <SelectItem value="inaccessible">Inaccessible / Gated</SelectItem>
              <SelectItem value="do_not_visit">Do Not Visit</SelectItem>
              <SelectItem value="moved">Moved Away</SelectItem>
              <SelectItem value="inactive">Inactive / Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {territories.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Territory (Optional)</Label>
          <Select
            value={form.watch('territoryId') || 'none'}
            onValueChange={(val) => form.setValue('territoryId', val === 'none' ? null : val)}
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Assign to territory" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="none">No territory assigned (Mapless)</SelectItem>
              {territories.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  Territory #{t.number} — {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="notes" className="text-xs font-semibold">
          Notes / Gate Codes / Special Directions
        </Label>
        <Textarea
          id="notes"
          placeholder="e.g. Ring top buzzer, beware of dog"
          className="rounded-xl text-xs resize-none h-20"
          {...form.register('notes')}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="rounded-xl text-xs"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" className="rounded-xl text-xs font-semibold" disabled={loading}>
          {loading ? 'Saving…' : initialValues?.id ? 'Update Household' : 'Save Household'}
        </Button>
      </div>
    </form>
  );
}
