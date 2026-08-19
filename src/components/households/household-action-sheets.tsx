'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, Calendar, Clock, FileText, Plus, Sparkles, User, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Badge } from '@/components/ui/badge';
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
import { useCurrentUser } from '@/hooks/use-current-user';
import { useMyEncounters } from '@/hooks/use-encounters';
import { extractHouseholdContacts, type HouseholdContactSummary } from '@/lib/household-contacts';
import { saveEncounterRecord, saveVisitRecord, updateHouseholdRecord } from '@/lib/record-writes';
import { timeAgo } from '@/lib/time-ago';
import { type LogVisitFormData, logVisitSchema } from '@/schemas/visit';
import type { Encounter, Household } from '@/types/api';
import { AddEncounterForm, type AddEncounterFormValues } from './add-encounter-form';

const responseBadgeColors: Record<string, string> = {
  receptive: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  study_accepted: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  neutral: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  busy: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  foreign_language: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
  not_interested: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  hostile: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  do_not_visit: 'bg-destructive/10 text-destructive border-destructive/20',
  moved: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
};

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

  // Unified encounter state
  const [recordEncounter, setRecordEncounter] = useState(false);
  const [encounterName, setEncounterName] = useState('');
  const [encounterResponse, setEncounterResponse] = useState('receptive');
  const [encounterGender, setEncounterGender] = useState<'male' | 'female' | 'unknown'>('unknown');
  const [encounterAgeGroup, setEncounterAgeGroup] = useState<
    'youth' | 'young_adult' | 'adult' | 'senior' | 'unknown'
  >('adult');
  const [encounterLanguage, setEncounterLanguage] = useState('');
  const [encounterTopic, setEncounterTopic] = useState('');
  const [encounterLiterature, setEncounterLiterature] = useState('');
  const [encounterNextVisitNotes, setEncounterNextVisitNotes] = useState('');
  const [encounterNextVisitTime, setEncounterNextVisitTime] = useState('');
  const [encounterBibleStudyInterest, setEncounterBibleStudyInterest] = useState(false);
  const [selectedContact, setSelectedContact] = useState<HouseholdContactSummary | null>(null);

  // Query past encounters at this household for quick-picker
  const { encounters: pastEncounters = [] } = useMyEncounters({
    householdId: household?.id,
  });

  const knownContacts = useMemo(() => extractHouseholdContacts(pastEncounters), [pastEncounters]);

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

  // Automatically suggest enabling encounter recording if outcome is conversation-oriented
  const outcome = form.watch('outcome');
  useEffect(() => {
    if (outcome === 'answered' || outcome === 'return_visit' || outcome === 'study_conducted') {
      // Keep user preference or default to true if contacts exist
      if (knownContacts.length > 0) {
        setRecordEncounter(true);
      }
    }
  }, [outcome, knownContacts.length]);

  const handleSelectContact = (contact: HouseholdContactSummary) => {
    setSelectedContact(contact);
    setEncounterName(contact.name);
    setEncounterGender(contact.gender);
    setEncounterAgeGroup(contact.ageGroup);
    setEncounterLanguage(contact.language || '');
    if (contact.bibleStudyInterest) {
      setEncounterBibleStudyInterest(true);
    }
  };

  const handleClearContact = () => {
    setSelectedContact(null);
    setEncounterName('');
    setEncounterGender('unknown');
    setEncounterAgeGroup('adult');
    setEncounterLanguage('');
  };

  const onSubmit = async (data: LogVisitFormData) => {
    if (!household) return;
    setSubmitting(true);
    try {
      // 1. Save Visit Record
      const visitId = await saveVisitRecord({
        householdId: household.id,
        assignmentId: assignmentId ?? undefined,
        outcome: data.outcome,
        notes: data.notes || undefined,
        literaturePlaced: data.literaturePlaced || undefined,
        returnVisitDate: data.returnVisitDate || undefined,
        nextVisitDate: data.returnVisitDate || undefined,
        returnVisitPlanned: Boolean(data.returnVisitDate),
        visitDate: new Date().toISOString(),
        userId: user?.id || null,
      });

      // 2. Optionally Save Linked Encounter Record
      if (recordEncounter && encounterName.trim()) {
        await saveEncounterRecord({
          householdId: household.id,
          visitId,
          name: encounterName.trim(),
          response: encounterResponse,
          gender: encounterGender,
          ageGroup: encounterAgeGroup,
          languageSpoken: encounterLanguage || undefined,
          topicDiscussed: encounterTopic || undefined,
          literatureAccepted: encounterLiterature || data.literaturePlaced || undefined,
          returnVisitRequested: Boolean(data.returnVisitDate),
          nextVisitDate: data.returnVisitDate || undefined,
          nextVisitTime: encounterNextVisitTime || undefined,
          nextVisitNotes: encounterNextVisitNotes || undefined,
          bibleStudyInterest: encounterBibleStudyInterest,
          notes: data.notes || undefined,
          visitDate: new Date().toISOString(),
          userId: user?.id || null,
        });
      }

      // 3. Update household status if changed
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
      handleClearContact();
      setRecordEncounter(false);
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
            onValueChange={(val) => {
              const outcomeVal = val as LogVisitFormData['outcome'];
              form.setValue('outcome', outcomeVal);
              if (outcomeVal === 'do_not_visit') form.setValue('status', 'do_not_visit');
              else if (outcomeVal === 'moved') form.setValue('status', 'moved');
              else if (outcomeVal === 'vacant') form.setValue('status', 'vacant');
              else if (outcomeVal === 'foreign_language')
                form.setValue('status', 'foreign_language');
              else if (outcomeVal === 'inaccessible') form.setValue('status', 'inaccessible');
              else if (outcomeVal === 'not_home') form.setValue('status', 'not_home');
              else if (outcomeVal === 'busy') form.setValue('status', 'busy');
              else if (outcomeVal === 'return_visit' || outcomeVal === 'study_conducted') {
                form.setValue('status', 'return_visit');
                form.setValue('returnVisitPlanned', true);
              } else if (outcomeVal === 'answered' || outcomeVal === 'minor_only') {
                form.setValue('status', 'active');
              }
            }}
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Outcome" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="answered">Answered / Conversation</SelectItem>
              <SelectItem value="not_home">Not Home</SelectItem>
              <SelectItem value="busy">Busy / Call Back Later</SelectItem>
              <SelectItem value="return_visit">Return Visit Made</SelectItem>
              <SelectItem value="study_conducted">Bible Study Conducted</SelectItem>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                <SelectItem value="busy">Busy / Call Back</SelectItem>
                <SelectItem value="return_visit">Return Visit</SelectItem>
                <SelectItem value="foreign_language">Foreign Language</SelectItem>
                <SelectItem value="vacant">Vacant</SelectItem>
                <SelectItem value="inaccessible">Inaccessible</SelectItem>
                <SelectItem value="do_not_visit">Do Not Visit</SelectItem>
                <SelectItem value="moved">Moved</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="returnVisitDate" className="text-xs font-semibold">
              Next Visit / Follow-up Date
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

        {/* Optional Person Encounter Integration */}
        <div className="pt-2 border-t border-border/60">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
            <div className="flex items-center gap-2">
              <Checkbox
                id="recordEncounterToggle"
                checked={recordEncounter}
                onCheckedChange={(c) => setRecordEncounter(Boolean(c))}
              />
              <Label
                htmlFor="recordEncounterToggle"
                className="text-xs font-semibold cursor-pointer flex items-center gap-1.5 text-foreground"
              >
                <Users size={14} className="text-primary" />
                <span>Record conversation with a person at the door</span>
              </Label>
            </div>
            {knownContacts.length > 0 && !recordEncounter && (
              <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                {knownContacts.length} {knownContacts.length === 1 ? 'contact' : 'contacts'}
              </Badge>
            )}
          </div>

          {recordEncounter && (
            <div className="mt-3 p-3.5 rounded-2xl bg-muted/30 border border-border space-y-3 animate-in fade-in-50">
              {/* Quick-Picker: Known Contacts at this Address */}
              {knownContacts.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground block">
                    Who did you meet?
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {knownContacts.map((contact) => {
                      const isSelected = selectedContact?.normalizedName === contact.normalizedName;
                      return (
                        <button
                          key={contact.normalizedName}
                          type="button"
                          onClick={() => handleSelectContact(contact)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                              : 'bg-background hover:bg-muted text-foreground border-border'
                          }`}
                        >
                          <User
                            size={11}
                            className={isSelected ? 'text-primary-foreground' : 'text-primary'}
                          />
                          <span>{contact.name}</span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1 py-0 h-3.5 font-bold ${
                              isSelected
                                ? 'border-primary-foreground/40 text-primary-foreground bg-primary-foreground/10'
                                : 'border-border text-muted-foreground'
                            }`}
                          >
                            {contact.encountersCount}v
                          </Badge>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={handleClearContact}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-medium transition-all border border-dashed ${
                        !selectedContact
                          ? 'bg-primary/10 text-primary border-primary font-semibold'
                          : 'text-muted-foreground border-border hover:text-foreground'
                      }`}
                    >
                      <Plus size={11} />
                      <span>New Person</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Previous Visit Context Preview */}
              {selectedContact && (
                <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-foreground flex items-center gap-1">
                      <Sparkles size={12} className="text-primary" />
                      <span>Last met {timeAgo(selectedContact.lastVisitDate)}</span>
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold capitalize ${
                        responseBadgeColors[selectedContact.lastResponse] ?? ''
                      }`}
                    >
                      {selectedContact.lastResponse.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  {selectedContact.lastTopicDiscussed && (
                    <p className="text-muted-foreground text-[11px]">
                      <strong className="text-foreground">Previous Topic:</strong>{' '}
                      {selectedContact.lastTopicDiscussed}
                    </p>
                  )}
                  {selectedContact.nextVisitPlannedTopic && (
                    <div className="p-1.5 rounded-lg bg-background/80 border border-primary/30 flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-primary font-medium truncate">
                        Planned: "{selectedContact.nextVisitPlannedTopic}"
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          selectedContact.nextVisitPlannedTopic &&
                          setEncounterTopic(selectedContact.nextVisitPlannedTopic)
                        }
                        className="h-6 text-[10px] text-primary hover:bg-primary/10 px-1.5 font-bold"
                      >
                        Apply
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Person Name & Response */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="encounterName" className="text-xs font-semibold">
                    Person Name *
                  </Label>
                  <Input
                    id="encounterName"
                    value={encounterName}
                    onChange={(e) => setEncounterName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="h-9 rounded-xl text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Response *</Label>
                  <Select value={encounterResponse} onValueChange={setEncounterResponse}>
                    <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                      <SelectValue placeholder="Response" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="receptive">Receptive / Interested</SelectItem>
                      <SelectItem value="study_accepted">Bible Study Accepted</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="busy">Busy / Call Back</SelectItem>
                      <SelectItem value="foreign_language">Foreign Language</SelectItem>
                      <SelectItem value="not_interested">Not Interested</SelectItem>
                      <SelectItem value="hostile">Hostile / Opposed</SelectItem>
                      <SelectItem value="do_not_visit">Do Not Call / Visit</SelectItem>
                      <SelectItem value="moved">Moved Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Demographics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Gender</Label>
                  <Select
                    value={encounterGender}
                    onValueChange={(val) => setEncounterGender(val as any)}
                  >
                    <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="unknown">Unspecified</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Age Group</Label>
                  <Select
                    value={encounterAgeGroup}
                    onValueChange={(val) => setEncounterAgeGroup(val as any)}
                  >
                    <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                      <SelectValue placeholder="Age group" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="unknown">Unspecified</SelectItem>
                      <SelectItem value="youth">Youth</SelectItem>
                      <SelectItem value="young_adult">Young Adult</SelectItem>
                      <SelectItem value="adult">Adult</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Language</Label>
                  <Input
                    value={encounterLanguage}
                    onChange={(e) => setEncounterLanguage(e.target.value)}
                    placeholder="e.g. English"
                    className="h-9 rounded-xl text-xs bg-background"
                  />
                </div>
              </div>

              {/* Topic Discussed */}
              <div className="space-y-1">
                <Label htmlFor="encounterTopic" className="text-xs font-semibold">
                  Topic Discussed / Scripture
                </Label>
                <Input
                  id="encounterTopic"
                  value={encounterTopic}
                  onChange={(e) => setEncounterTopic(e.target.value)}
                  placeholder="e.g. Psalm 37:11, Paradise"
                  className="h-9 rounded-xl text-xs bg-background"
                />
              </div>

              {/* Question for Next Visit */}
              <div className="space-y-1">
                <Label htmlFor="encounterNextVisitNotes" className="text-xs font-semibold">
                  Question / Topic for Next Visit
                </Label>
                <Input
                  id="encounterNextVisitNotes"
                  value={encounterNextVisitNotes}
                  onChange={(e) => setEncounterNextVisitNotes(e.target.value)}
                  placeholder="e.g. Question to answer on next visit"
                  className="h-9 rounded-xl text-xs bg-background"
                />
              </div>

              {/* Bible Study Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="encounterStudyInterest"
                  checked={encounterBibleStudyInterest}
                  onCheckedChange={(c) => setEncounterBibleStudyInterest(Boolean(c))}
                />
                <Label
                  htmlFor="encounterStudyInterest"
                  className="text-xs font-semibold cursor-pointer text-foreground"
                >
                  Bible Study Interest / Study Conducted
                </Label>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="notes" className="text-xs font-semibold">
            Visit Notes
          </Label>
          <Textarea
            id="notes"
            placeholder="Note general observations, door circumstances…"
            className="rounded-xl text-xs resize-none h-16"
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
            {submitting
              ? 'Saving…'
              : recordEncounter && encounterName.trim()
                ? `Save Visit & Encounter (${encounterName.trim()})`
                : 'Save Visit Record'}
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
  initialValues,
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
        returnVisitRequested: values.returnVisitRequested,
        nextVisitDate: values.nextVisitDate || undefined,
        nextVisitTime: values.nextVisitTime || undefined,
        nextVisitNotes: values.nextVisitNotes || undefined,
        bibleStudyInterest: values.bibleStudyInterest,
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
        household={household}
        defaultHouseholdId={household?.id}
        initialValues={initialValues}
        onSubmit={handleSaveEncounter}
        loading={submitting}
        onCancel={() => onOpenChange(false)}
      />
    </ResponsiveDialog>
  );
}
