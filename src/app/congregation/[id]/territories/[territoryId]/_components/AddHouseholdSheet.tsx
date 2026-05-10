'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const [suggestedAddress, setSuggestedAddress] = useState({
    address: `Pinned household ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    streetName: '',
    city: '',
  });

  useEffect(() => {
    if (!window.google?.maps?.Geocoder) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== 'OK' || !results?.[0]) return;

      const result = results[0];
      const component = (type: string) =>
        result.address_components.find((item) => item.types.includes(type))?.long_name ?? '';
      const route = component('route');
      const streetNumber = component('street_number');
      const city =
        component('locality') ||
        component('postal_town') ||
        component('administrative_area_level_2') ||
        component('administrative_area_level_1');

      setSuggestedAddress({
        address: result.formatted_address,
        streetName: [streetNumber, route].filter(Boolean).join(' ') || route,
        city,
      });
    });
  }, [lat, lng]);

  const formDefaults = useMemo(
    () => ({
      address: suggestedAddress.address,
      name: '',
      streetName: suggestedAddress.streetName,
      city: suggestedAddress.city,
      type: 'house',
      membersCount: 1,
      notes: '',
    }),
    [suggestedAddress]
  );

  const handleSubmit = async (values: HouseholdFormValues) => {
    setSubmitting(true);
    try {
      const household = await createHousehold({
        name: values.name,
        address: values.address ?? '',
        streetName: values.streetName,
        city: values.city,
        type: values.type,
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
      title="Pinned Household"
      description={`${lat.toFixed(5)}, ${lng.toFixed(5)}`}
      contentClassName="sm:max-w-lg"
    >
      <HouseholdForm
        submitting={submitting}
        defaultValues={formDefaults}
        submitLabel="Save Pinned Household"
        onSubmit={handleSubmit}
      />
    </ResponsiveDialog>
  );
}
