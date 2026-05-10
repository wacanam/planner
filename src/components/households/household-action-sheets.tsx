'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import {
  AddEncounterForm,
  type AddEncounterFormValues,
} from '@/components/households/add-encounter-form';
import {
  LogVisitForm,
  type LogVisitFormValues,
} from '@/components/households/log-visit-form';
import { createEncounter, createVisit } from '@/lib/local-first';
import type { Household } from '@/types/api';

interface HouseholdSheetProps {
  household: Household | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HouseholdLogVisitSheetProps extends HouseholdSheetProps {
  assignmentId?: string | null;
}

function householdDescription(household: Household | null) {
  if (!household) return undefined;
  return [household.address, household.city].filter(Boolean).join(', ');
}

export function HouseholdLogVisitSheet({
  household,
  assignmentId,
  open,
  onOpenChange,
}: HouseholdLogVisitSheetProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (
    values: LogVisitFormValues,
    encounters: AddEncounterFormValues[]
  ) => {
    if (!household) return;

    setSubmitting(true);
    try {
      const visit = await createVisit({
        householdId: household.id,
        assignmentId,
        outcome: values.outcome,
        householdStatusAfter: values.householdStatusAfter,
        duration: values.duration,
        literatureLeft: values.literatureLeft,
        bibleTopicDiscussed: values.bibleTopicDiscussed,
        returnVisitPlanned: values.returnVisitPlanned,
        nextVisitDate: values.nextVisitDate,
        nextVisitTime: values.nextVisitTime,
        nextVisitNotes: values.nextVisitNotes,
        notes: values.notes,
      });

      await Promise.all(
        encounters.map((encounter) =>
          createEncounter({
            visitId: visit.id,
            householdId: household.id,
            encounterDate: visit.visitDate,
            name: encounter.name,
            response: encounter.response,
            topicDiscussed: encounter.topicDiscussed,
            literatureAccepted: encounter.literatureAccepted,
            returnVisitRequested: encounter.returnVisitRequested,
            notes: encounter.notes,
          })
        )
      );

      toast.success(encounters.length ? 'Visit and encounter saved' : 'Visit saved');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open && !!household}
      onOpenChange={onOpenChange}
      title="Log Visit"
      description={householdDescription(household)}
      contentClassName="sm:max-w-lg"
    >
      <LogVisitForm submitting={submitting} onSubmit={handleSubmit} />
    </ResponsiveDialog>
  );
}

export function HouseholdEncounterSheet({ household, open, onOpenChange }: HouseholdSheetProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: AddEncounterFormValues) => {
    if (!household) return;

    setSubmitting(true);
    try {
      await createEncounter({
        householdId: household.id,
        encounterDate: new Date().toISOString(),
        name: values.name,
        response: values.response,
        topicDiscussed: values.topicDiscussed,
        literatureAccepted: values.literatureAccepted,
        returnVisitRequested: values.returnVisitRequested,
        notes: values.notes,
      });
      toast.success('Encounter saved');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open && !!household}
      onOpenChange={onOpenChange}
      title="Add Encounter"
      description={householdDescription(household)}
      contentClassName="sm:max-w-lg"
    >
      <AddEncounterForm submitting={submitting} onSubmit={handleSubmit} />
    </ResponsiveDialog>
  );
}