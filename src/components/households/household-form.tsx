// src/components/households/household-form.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { InlineRedactButton } from '@/components/privacy/InlineRedactButton';
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
import {
  findDuplicateHouseholdByNumber,
  getNextCongregationHouseNumber,
  toCanonicalHouseNumber,
} from '@/lib/households';
import {
  cleanStreetOrAddress,
  detectSpiAndPiiViolations,
  sanitizeOpenText,
} from '@/lib/privacy/open-text-guard';
import type { Household } from '@/types/api';

export const householdFormSchema = z.object({
  address: z.string().optional(),
  houseNumber: z.string().min(1, 'House / Door number is required'),
  streetName: z.string().min(1, 'Street, Purok, or Landmark is required'),
  unit: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  type: z.enum(['house', 'apartment', 'business', 'gated_community', 'other']).default('house'),
  status: z
    .enum([
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
    ])
    .default('not_home'),
  occupantsCount: z.number().optional().default(1),
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
  defaultCity?: string;
}

export function HouseholdForm({
  initialValues,
  onSubmit,
  loading = false,
  onCancel,
  territories = [],
  existingHouseholds,
  excludeHouseholdId,
  defaultCity,
}: HouseholdFormProps) {
  const defaultHouseNumber =
    initialValues?.houseNumber ??
    (existingHouseholds ? getNextCongregationHouseNumber(existingHouseholds) : '');

  const inferredCity =
    initialValues?.city ||
    defaultCity ||
    (existingHouseholds && existingHouseholds.length > 0
      ? existingHouseholds.find((h) => h.city)?.city
      : '') ||
    '';

  const inferredPostal =
    initialValues?.postalCode ||
    (existingHouseholds && existingHouseholds.length > 0
      ? existingHouseholds.find((h) => h.postalCode)?.postalCode
      : '') ||
    '';

  const [showMoreDetails, setShowMoreDetails] = useState(false);

  const form = useForm<HouseholdFormValues>({
    resolver: zodResolver(householdFormSchema) as any,
    defaultValues: {
      address: initialValues?.address ?? '',
      houseNumber: defaultHouseNumber,
      streetName: initialValues?.streetName || initialValues?.name || '',
      unit: initialValues?.unit ?? '',
      city: inferredCity,
      postalCode: inferredPostal,
      type: (initialValues?.type as HouseholdFormValues['type']) ?? 'house',
      status: (initialValues?.status as HouseholdFormValues['status']) ?? 'not_home',
      occupantsCount: initialValues?.occupantsCount ?? 1,
      notes: initialValues?.notes ?? '',
      language: initialValues?.language ?? initialValues?.languages?.[0] ?? '',
      territoryId: initialValues?.territoryId ?? null,
    },
  });

  const watchedHouseNumber = form.watch('houseNumber') || '';
  const watchedStreetName = form.watch('streetName') || '';
  const watchedUnit = form.watch('unit') || '';

  const autoSynthesizedAddress = [
    watchedHouseNumber
      ? watchedHouseNumber.startsWith('#')
        ? watchedHouseNumber
        : `#${watchedHouseNumber}`
      : '',
    watchedStreetName,
    watchedUnit ? `(${watchedUnit})` : '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const handleFormSubmit = async (values: HouseholdFormValues) => {
    if (existingHouseholds) {
      const isUnchangedNumber =
        Boolean(initialValues?.houseNumber) &&
        toCanonicalHouseNumber(values.houseNumber) ===
          toCanonicalHouseNumber(initialValues?.houseNumber || '');

      if (!isUnchangedNumber) {
        const excludeIds = [
          excludeHouseholdId,
          initialValues?.id,
          (initialValues as any)?.serverId,
        ].filter(Boolean) as string[];

        const duplicate = findDuplicateHouseholdByNumber(
          values.houseNumber,
          existingHouseholds,
          excludeIds
        );
        if (duplicate) {
          form.setError('houseNumber', {
            type: 'manual',
            message: `House #${values.houseNumber} already exists in this congregation.`,
          });
          return;
        }
      }
    }

    const cleanStreet = cleanStreetOrAddress(values.streetName) || values.streetName.trim();
    const finalAddress = values.address?.trim()
      ? cleanStreetOrAddress(values.address) || values.address.trim()
      : [
          values.houseNumber
            ? values.houseNumber.startsWith('#')
              ? values.houseNumber
              : `#${values.houseNumber}`
            : '',
          cleanStreet,
          values.unit ? `(${values.unit.trim()})` : '',
        ]
          .filter(Boolean)
          .join(' ')
          .trim();

    const sanitizedValues: HouseholdFormValues = {
      ...values,
      houseNumber: values.houseNumber.trim(),
      streetName: cleanStreet,
      address: finalAddress,
      city: (values.city || inferredCity || '').trim(),
      postalCode: (values.postalCode || inferredPostal || '').trim(),
      type: values.type || 'house',
      notes: values.notes ? sanitizeOpenText(values.notes) || '' : '',
    };

    await onSubmit(sanitizedValues);
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
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-3.5">
      {/* Row 1: House / Door # & Street / Purok */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1 col-span-1">
          <Label htmlFor="houseNumber" className="text-xs font-semibold">
            House / Door # *
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
          <div className="flex items-center justify-between gap-1">
            <Label htmlFor="streetName" className="text-xs font-semibold">
              Street / Purok / Landmark *
            </Label>
            {Boolean(form.watch('streetName')?.trim()) && (
              <InlineRedactButton
                value={form.watch('streetName')}
                fieldType="address"
                onRedact={(newVal) => {
                  form.setValue('streetName', newVal || '[REDACTED]', { shouldValidate: true });
                }}
              />
            )}
          </div>
          <Input
            id="streetName"
            autoFocus={!initialValues?.id}
            placeholder="e.g. Zone 1, Purok 3, Maple St"
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

      {/* Row 2: Unit (Optional) & Status */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="unit" className="text-xs font-semibold text-muted-foreground">
            Unit / Apt / Flr (Optional)
          </Label>
          <Input
            id="unit"
            placeholder="e.g. Apt 3B, Flr 2"
            className="h-9 rounded-xl text-xs"
            {...form.register('unit')}
          />
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
              <SelectItem value="not_home">Not Home</SelectItem>
              <SelectItem value="new">New Record</SelectItem>
              <SelectItem value="active">Active Household</SelectItem>
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

      {/* Row 3: Territory (Optional) */}
      {territories.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground">
            Territory (Optional)
          </Label>
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

      {/* Row 4: Property Notes */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-1">
          <Label htmlFor="notes" className="text-xs font-semibold">
            Property / Access Notes (Optional)
          </Label>
          {Boolean(form.watch('notes')?.trim()) && (
            <InlineRedactButton
              value={form.watch('notes')}
              fieldType="notes"
              onRedact={(newVal) => {
                form.setValue('notes', newVal || '', { shouldValidate: true });
              }}
            />
          )}
        </div>
        <Textarea
          id="notes"
          placeholder="e.g. Ring top buzzer, beware of dog (no resident names)"
          className="rounded-xl text-xs resize-none h-18"
          {...form.register('notes')}
        />
        <p className="text-[10px] text-muted-foreground">
          Physical access notes only (gate code, hazards). Strictly no resident names or spiritual
          details.
        </p>
        {Boolean(form.watch('notes')) &&
          detectSpiAndPiiViolations(form.watch('notes') || '').length > 0 && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium leading-tight">
              ⚠️ Privacy notice: Notes contain potential personal or sensitive details (
              {detectSpiAndPiiViolations(form.watch('notes') || '').join(', ')}). They will be
              automatically sanitized to protect resident privacy.
            </p>
          )}
      </div>

      {/* Collapsible: Additional Details (Structure Type, City, Custom Address) */}
      <div className="border border-border/60 rounded-xl overflow-hidden bg-muted/20">
        <button
          type="button"
          onClick={() => setShowMoreDetails(!showMoreDetails)}
          className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Building2 size={13} className="text-primary" />
            <span>Additional Details (Structure, City)</span>
          </span>
          {showMoreDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {showMoreDetails && (
          <div className="p-3 pt-1 space-y-3 border-t border-border/40 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Structure Type</Label>
                <Select
                  value={form.watch('type')}
                  onValueChange={(val) => form.setValue('type', val as HouseholdFormValues['type'])}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="house">House</SelectItem>
                    <SelectItem value="apartment">Apartment / Condominium</SelectItem>
                    <SelectItem value="business">Commercial / Store</SelectItem>
                    <SelectItem value="gated_community">Gated Compound</SelectItem>
                    <SelectItem value="other">Other Structure</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="city" className="text-xs font-semibold">
                  City
                </Label>
                <Input
                  id="city"
                  placeholder="City"
                  className="h-9 rounded-xl text-xs bg-background"
                  {...form.register('city')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="postalCode" className="text-xs font-semibold">
                  Postal Code
                </Label>
                <Input
                  id="postalCode"
                  placeholder="Postal code"
                  className="h-9 rounded-xl text-xs bg-background"
                  {...form.register('postalCode')}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="address" className="text-xs font-semibold">
                  Custom Address Label
                </Label>
                <Input
                  id="address"
                  placeholder={autoSynthesizedAddress || 'Auto-generated'}
                  className="h-9 rounded-xl text-xs bg-background"
                  {...form.register('address')}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form Action Buttons */}
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="rounded-xl text-xs h-9"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" className="rounded-xl text-xs font-semibold h-9" disabled={loading}>
          {loading ? 'Saving…' : initialValues?.id ? 'Update Household' : 'Save Household'}
        </Button>
      </div>
    </form>
  );
}
