'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentUser, useKeyboardShortcuts } from '@/hooks';
import { saveVisitRecord, updateHouseholdRecord } from '@/lib/record-writes';
import { resolveHouseholdStatusAfter } from '@/lib/status-rules';
import { type LogVisitFormData, logVisitSchema } from '@/schemas/visit';
import type { Encounter, Household } from '@/types/api';
import { PersonalCallDialog } from './PersonalCallDialog';

interface LogVisitSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  household: Household | null;
  assignmentId?: string | null;
  territoryId?: string | null;
  initialOutcome?: LogVisitFormData['outcome'];
  initialContact?: Partial<Encounter> | null;
  onSaved?: () => void;
}

export function HouseholdLogVisitSheet({
  open,
  onOpenChange,
  household,
  assignmentId,
  territoryId: _territoryId,
  initialOutcome,
  initialContact: _initialContact,
  onSaved,
}: LogVisitSheetProps) {
  const { user } = useCurrentUser();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LogVisitFormData>({
    resolver: zodResolver(logVisitSchema) as any,
    defaultValues: {
      householdId: household?.id ?? '',
      assignmentId: assignmentId ?? undefined,
      outcome: initialOutcome || 'answered',
      status: 'available',
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    const defaultOutcome = initialOutcome || 'answered';
    const defaultStatus =
      defaultOutcome === 'return_visit' || defaultOutcome === 'return_visit_completed'
        ? 'return_visit'
        : defaultOutcome === 'study_conducted'
          ? 'bible_study'
          : defaultOutcome === 'not_home'
            ? 'not_home'
            : defaultOutcome === 'busy'
              ? 'busy'
              : (household?.status as LogVisitFormData['status']) || 'available';

    form.reset({
      householdId: household?.id ?? '',
      assignmentId: assignmentId ?? undefined,
      outcome: defaultOutcome,
      status: defaultStatus,
      notes: '',
    });
  }, [open, household, assignmentId, initialOutcome, form]);

  const handleOutcomeChange = (val: LogVisitFormData['outcome']) => {
    form.setValue('outcome', val, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    const resolvedStatus = resolveHouseholdStatusAfter(val, null, household?.status);
    form.setValue('status', resolvedStatus, { shouldValidate: true, shouldDirty: true });
  };

  const handleStatusChange = (val: LogVisitFormData['status']) => {
    form.setValue('status', val, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  };

  const onSubmit = async (data: LogVisitFormData) => {
    if (!household) return;
    setSubmitting(true);
    try {
      // 1. Save Visit Record (strictly territory coverage - personal spiritual notes stay in Personal Notebook)
      await saveVisitRecord({
        householdId: household.id,
        congregationId: household.congregationId ?? user?.congregationId ?? undefined,
        assignmentId: assignmentId ?? undefined,
        outcome: data.outcome,
        householdStatusAfter: data.status,
        notes: data.notes || undefined,
        visitDate: new Date().toISOString(),
        userId: user?.id || null,
        publisherName: user?.name || null,
      });

      // 2. Update household status if changed
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

  useKeyboardShortcuts(
    [
      {
        key: 'Mod+Enter',
        handler: () => {
          void form.handleSubmit(onSubmit)();
        },
      },
    ],
    { disabled: !open }
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Log Visit Record"
      description={
        household
          ? `${household.streetName ? `${household.streetName} · ` : ''}${household.address} (${household.city})`
          : 'Record visit details'
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Visit Outcome *</Label>
          <Select
            value={form.watch('outcome')}
            onValueChange={(val) => handleOutcomeChange(val as LogVisitFormData['outcome'])}
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Outcome" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="answered">Answered / Conversation</SelectItem>
              <SelectItem value="return_visit_completed">
                Return Visit (Visited / Completed)
              </SelectItem>
              <SelectItem value="return_visit_missed">
                Return Visit Missed (Resident Absent / Reschedule)
              </SelectItem>
              <SelectItem value="study_conducted">Bible Study Conducted</SelectItem>
              <SelectItem value="study_offered">Bible Study Offered</SelectItem>
              <SelectItem value="study_missed">Bible Study Missed / Cancelled</SelectItem>
              <SelectItem value="literature_placed">Literature Placed / Video Shown</SelectItem>
              <SelectItem value="not_home">Not Home</SelectItem>
              <SelectItem value="busy">Busy / Call Back Later</SelectItem>
              <SelectItem value="minor_only">Minor / Youth Only</SelectItem>
              <SelectItem value="foreign_language">Foreign / Different Language</SelectItem>
              <SelectItem value="inaccessible">Inaccessible / Gated / Dog</SelectItem>
              <SelectItem value="vacant">Vacant / Unoccupied</SelectItem>
              <SelectItem value="do_not_visit">Do Not Call / Visit</SelectItem>
              <SelectItem value="moved">Moved Away</SelectItem>
              <SelectItem value="other">Other Outcome</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold">House Territory Standing</Label>
          <Select
            value={form.watch('status')}
            onValueChange={(val) => handleStatusChange(val as LogVisitFormData['status'])}
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="available">Available / Active Household</SelectItem>
              <SelectItem value="return_visit">Return Visit (Interested Contact)</SelectItem>
              <SelectItem value="bible_study">Bible Study (Ongoing Study)</SelectItem>
              <SelectItem value="not_home">Not Home (Pending Callback)</SelectItem>
              <SelectItem value="busy">Busy (Pending Callback)</SelectItem>
              <SelectItem value="foreign_language">Foreign Language Referral</SelectItem>
              <SelectItem value="inaccessible">Inaccessible / Barrier</SelectItem>
              <SelectItem value="vacant">Vacant / Unoccupied</SelectItem>
              <SelectItem value="do_not_visit">Do Not Call / Visit</SelectItem>
              <SelectItem value="moved">Moved Away</SelectItem>
              <SelectItem value="inactive">Inactive / Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Property / Access Notes */}
        <div className="space-y-1">
          <Label htmlFor="visitNotes" className="text-xs font-semibold text-foreground">
            Property / Access Notes (Optional)
          </Label>
          <Textarea
            id="visitNotes"
            placeholder="e.g. Gate code, loose dog on premises (strictly no resident names or spiritual details)"
            className="rounded-xl text-xs resize-none h-20 bg-background"
            {...form.register('notes')}
          />
        </div>

        {/* Private Personal Notebook Callout */}
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            Personal Return Visits & Studies
          </div>
          <p>
            Scriptures discussed, literature placements, and return visit notes should be kept in your private on-device Personal Notebook.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
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
  initialValues?: Partial<Encounter>;
  onSaved?: () => void;
}

export function HouseholdEncounterSheet({
  open,
  onOpenChange,
  household,
  onSaved,
}: EncounterSheetProps) {
  const { user } = useCurrentUser();

  if (!user?.id || !household) return null;

  return (
    <PersonalCallDialog
      open={open}
      onOpenChange={onOpenChange}
      userId={user.id}
      congregationId={household.congregationId}
      householdId={household.id}
      territoryId={household.territoryId}
      houseNumber={household.houseNumber}
      streetName={household.streetName}
      address={household.address}
      onSaved={onSaved}
    />
  );
}
