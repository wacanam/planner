'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
      bibleTopicDiscussed: '',
      literaturePlaced: '',
      notes: '',
      returnVisitPlanned: false,
      returnVisitDate: '',
      nextVisitTime: '',
      nextVisitNotes: '',
      scheduledAppointmentType: 'return_visit',
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

    const isRV =
      defaultOutcome === 'return_visit' ||
      defaultOutcome === 'return_visit_completed' ||
      defaultOutcome === 'return_visit_missed';
    const isStudy =
      defaultOutcome === 'study_conducted' ||
      defaultOutcome === 'study_offered' ||
      defaultOutcome === 'study_missed';

    form.reset({
      householdId: household?.id ?? '',
      assignmentId: assignmentId ?? undefined,
      outcome: defaultOutcome,
      status: defaultStatus,
      bibleTopicDiscussed: '',
      literaturePlaced: '',
      notes: '',
      returnVisitPlanned: isRV || isStudy,
      returnVisitDate: '',
      nextVisitTime: '',
      nextVisitNotes: '',
      scheduledAppointmentType: isStudy ? 'bible_study' : 'return_visit',
    });
  }, [open, household, assignmentId, initialOutcome, form]);

  const handleOutcomeChange = (val: LogVisitFormData['outcome']) => {
    form.setValue('outcome', val, { shouldValidate: true, shouldDirty: true, shouldTouch: true });

    const isRV =
      val === 'return_visit' || val === 'return_visit_completed' || val === 'return_visit_missed';
    const isStudy = val === 'study_conducted' || val === 'study_offered' || val === 'study_missed';
    const isMissed = val === 'return_visit_missed' || val === 'study_missed';

    const resolvedStatus = resolveHouseholdStatusAfter(val, null, household?.status);
    form.setValue('status', resolvedStatus, { shouldValidate: true, shouldDirty: true });

    if (isStudy) {
      form.setValue('returnVisitPlanned', true);
      form.setValue('scheduledAppointmentType', 'bible_study');
      form.setValue(
        'bibleStudyStatus',
        val === 'study_conducted' ? 'conducted' : val === 'study_offered' ? 'offered' : 'missed'
      );
      form.setValue('studyOffered', val === 'study_offered');
      form.setValue('isAppointmentMissed', isMissed);
    } else if (isRV) {
      form.setValue('returnVisitPlanned', true);
      form.setValue('scheduledAppointmentType', 'return_visit');
      form.setValue('isAppointmentMissed', isMissed);
    } else {
      form.setValue('isAppointmentMissed', false);
    }
  };

  const handleStatusChange = (val: LogVisitFormData['status']) => {
    form.setValue('status', val, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    if (val === 'return_visit' || val === 'bible_study') {
      form.setValue('returnVisitPlanned', true);
      form.setValue(
        'scheduledAppointmentType',
        val === 'bible_study' ? 'bible_study' : 'return_visit'
      );
    }
  };

  const onSubmit = async (data: LogVisitFormData) => {
    if (!household) return;
    setSubmitting(true);
    try {
      const followUpDate = data.returnVisitPlanned ? data.returnVisitDate || undefined : undefined;

      // 1. Save Visit Record (Zero personal info - PII is strictly kept in Personal Notebook)
      await saveVisitRecord({
        householdId: household.id,
        congregationId: household.congregationId ?? user?.congregationId ?? undefined,
        assignmentId: assignmentId ?? undefined,
        outcome: data.outcome,
        notes: data.notes || undefined,
        literaturePlaced: data.literaturePlaced || undefined,
        bibleTopicDiscussed: data.bibleTopicDiscussed || undefined,
        returnVisitDate: followUpDate,
        nextVisitDate: followUpDate,
        nextVisitTime: data.returnVisitPlanned ? data.nextVisitTime || undefined : undefined,
        nextVisitNotes: data.returnVisitPlanned ? data.nextVisitNotes || undefined : undefined,
        returnVisitPlanned: Boolean(data.returnVisitPlanned),
        scheduledAppointmentType:
          data.scheduledAppointmentType ??
          (data.outcome.includes('study') ? 'bible_study' : 'return_visit'),
        bibleStudyStatus:
          data.bibleStudyStatus ??
          (data.outcome === 'study_conducted'
            ? 'conducted'
            : data.outcome === 'study_offered'
              ? 'offered'
              : data.outcome === 'study_missed'
                ? 'missed'
                : undefined),
        studyOffered: Boolean(data.studyOffered || data.outcome === 'study_offered'),
        isAppointmentMissed: Boolean(
          data.isAppointmentMissed ||
            data.outcome === 'return_visit_missed' ||
            data.outcome === 'study_missed'
        ),
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="bibleTopicDiscussed" className="text-xs font-semibold">
              Topic / Scripture Discussed
            </Label>
            <Input
              id="bibleTopicDiscussed"
              placeholder="e.g. Psalm 37:29, Paradise"
              className="h-9 rounded-xl text-xs"
              {...form.register('bibleTopicDiscussed')}
            />
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
        </div>

        {/* Schedule Return Visit / Follow-up */}
        <div className="space-y-3 pt-2 border-t border-border/60">
          <div className="flex items-center gap-2">
            <Checkbox
              id="returnVisitPlanned"
              checked={form.watch('returnVisitPlanned')}
              onCheckedChange={(checked) => form.setValue('returnVisitPlanned', Boolean(checked))}
            />
            <Label
              htmlFor="returnVisitPlanned"
              className="text-xs font-semibold cursor-pointer text-foreground"
            >
              Schedule Follow-up / Return Visit
            </Label>
          </div>

          {form.watch('returnVisitPlanned') && (
            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="returnVisitDate" className="text-xs font-semibold">
                    Next Visit Date
                  </Label>
                  <Input
                    id="returnVisitDate"
                    type="date"
                    className="h-9 rounded-xl text-xs bg-background"
                    {...form.register('returnVisitDate')}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nextVisitTime" className="text-xs font-semibold">
                    Next Visit Time
                  </Label>
                  <Input
                    id="nextVisitTime"
                    type="time"
                    className="h-9 rounded-xl text-xs bg-background"
                    {...form.register('nextVisitTime')}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="nextVisitNotes" className="text-xs font-semibold">
                  Objective / Question for Next Visit
                </Label>
                <Input
                  id="nextVisitNotes"
                  placeholder="e.g. Answer question about suffering"
                  className="h-9 rounded-xl text-xs bg-background"
                  {...form.register('nextVisitNotes')}
                />
              </div>
            </div>
          )}
        </div>

        {/* Visit Notes */}
        <div className="space-y-1 pt-2 border-t border-border/60">
          <Label htmlFor="visitNotes" className="text-xs font-semibold text-foreground">
            Visit Notes
          </Label>
          <Textarea
            id="visitNotes"
            placeholder="Summary of visit attempt, topics discussed (no personal names or contact details)…"
            className="rounded-xl text-xs resize-none h-20 bg-background"
            {...form.register('notes')}
          />
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
