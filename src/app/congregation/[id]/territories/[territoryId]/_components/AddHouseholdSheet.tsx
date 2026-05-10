'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { HouseholdForm, type HouseholdFormValues } from '@/components/households/household-form';
import { createHousehold } from '@/lib/local-first';

interface AddHouseholdSheetProps {
  lat: number;
  lng: number;
  territoryId?: string;
  congregationId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddHouseholdSheet({
  lat,
  lng,
  territoryId,
  congregationId,
  onClose,
  onSuccess,
}: AddHouseholdSheetProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: HouseholdFormValues) => {
    setSubmitting(true);
    try {
      const household = await createHousehold({
        name: values.name,
        address: values.address,
        streetName: values.streetName,
        city: values.city,
        membersCount: values.membersCount,
        notes: values.notes,
        latitude: lat,
        longitude: lng,
        territoryId,
        congregationId,
      });

      toast.success(`Household added successfully: ${household.address}`);
      onSuccess?.();
      onClose();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      toast.error(reason);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Add Household"
      description={`Pin confirmed at ${lat.toFixed(5)}, ${lng.toFixed(5)}`}
      contentClassName="sm:max-w-lg"
    >
      <HouseholdForm
        submitting={submitting}
        defaultValues={{
          address: '',
          name: '',
          streetName: '',
          city: '',
          membersCount: 1,
          notes: '',
        }}
        onSubmit={handleSubmit}
      />
    </ResponsiveDialog>
  );
}
