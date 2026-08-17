'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
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
import { useCurrentUser } from '@/hooks/use-current-user';
import { saveEncounterRecord, saveVisitRecord, updateHouseholdRecord } from '@/lib/record-writes';
import { type LogVisitFormData, logVisitSchema } from '@/schemas/visit';
import type { Household } from '@/types/api';
import { AddEncounterForm, type AddEncounterFormValues } from './add-encounter-form';

interface LogVisitSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  household: Household | null;
  assignmentId?: string | null;
  onSaved?: () => void;
}

export function HouseholdLogVisitSheet({
  open,
  onOpenChange,
  household,
  assignmentId,
  onSaved,
}: LogVisitSheetProps) {
  const { user } = useCurrentUser();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LogVisitFormData>({
    resolver: zodResolver(logVisitSchema) as any,
    defaultValues: {
      householdId: household?.id ?? '',
      assignmentId: assignmentId ?? undefined,
      outcome: 'answered',
      notes: '',
      literaturePlaced: '',
      returnVisitDate: undefined,
      status: 'active',
    },
  });

  const onSubmit = async (data: LogVisitFormData) => {
    if (!household) return;
    setSubmitting(true);
    try {
      await saveVisitRecord({
        householdId: household.id,
        assignmentId: assignmentId ?? undefined,
        outcome: data.outcome,
        notes: data.notes || undefined,
        literaturePlaced: data.literaturePlaced || undefined,
        returnVisitDate: data.returnVisitDate || undefined,
        visitDate: new Date().toISOString(),
        userId: user?.id || null,
      });

      // Update household status
      if (data.status && data.status !== household.status) {
        await updateHouseholdRecord(household.id, {
          status: data.status as LogVisitFormData['status'],
          lastVisitDate: new Date().toISOString(),
          updatedById: user?.id || null,
        });
      }

      onSaved?.();
      onOpenChange(false);
      form.reset();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Log Visit Record"
      description={household ? `${household.address} (${household.city})` : 'Record visit details'}
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Visit Outcome *</Label>
          <Select
            value={form.watch('outcome')}
            onValueChange={(val) => form.setValue('outcome', val as LogVisitFormData['outcome'])}
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Outcome" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="answered">Answered / Conversation</SelectItem>
              <SelectItem value="not_home">Not Home</SelectItem>
              <SelectItem value="return_visit">Return Visit Made</SelectItem>
              <SelectItem value="do_not_visit">Do Not Call / Visit</SelectItem>
              <SelectItem value="moved">Moved Away</SelectItem>
              <SelectItem value="other">Other Outcome</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Update Household Status</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(val) => form.setValue('status', val as LogVisitFormData['status'])}
            >
              <SelectTrigger className="h-9 rounded-xl text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="not_home">Not Home</SelectItem>
                <SelectItem value="return_visit">Return Visit</SelectItem>
                <SelectItem value="do_not_visit">Do Not Visit</SelectItem>
                <SelectItem value="moved">Moved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="returnVisitDate" className="text-xs font-semibold">
              Return Visit Date
            </Label>
            <Input
              id="returnVisitDate"
              type="date"
              className="h-9 rounded-xl text-xs"
              {...form.register('returnVisitDate')}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="literaturePlaced" className="text-xs font-semibold">
            Literature Left / Video Shown
          </Label>
          <Input
            id="literaturePlaced"
            placeholder="e.g. Watchtower, brochure, tract"
            className="h-9 rounded-xl text-xs"
            {...form.register('literaturePlaced')}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="notes" className="text-xs font-semibold">
            Visit Notes
          </Label>
          <Textarea
            id="notes"
            placeholder="Note topics discussed, questions for next time…"
            className="rounded-xl text-xs resize-none h-18"
            {...form.register('notes')}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl text-xs"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" className="rounded-xl text-xs font-semibold" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Visit Record'}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}

interface EncounterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  household: Household | null;
  onSaved?: () => void;
}

export function HouseholdEncounterSheet({
  open,
  onOpenChange,
  household,
  onSaved,
}: EncounterSheetProps) {
  const { user } = useCurrentUser();
  const [submitting, setSubmitting] = useState(false);

  const handleSaveEncounter = async (values: AddEncounterFormValues) => {
    setSubmitting(true);
    try {
      await saveEncounterRecord({
        householdId: values.householdId,
        name: values.name,
        response: values.response,
        gender: values.gender,
        ageGroup: values.ageGroup,
        language: values.language,
        notes: values.notes || undefined,
        topicsDiscussed: values.topicsDiscussed || undefined,
        literatureOffered: values.literatureOffered || undefined,
        visitDate: new Date().toISOString(),
        userId: user?.id || null,
      });
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record Person Encounter"
      description={household ? `${household.address} (${household.city})` : 'Conversation details'}
    >
      <AddEncounterForm
        defaultHouseholdId={household?.id}
        onSubmit={handleSaveEncounter}
        loading={submitting}
        onCancel={() => onOpenChange(false)}
      />
    </ResponsiveDialog>
  );
}
