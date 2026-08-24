'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  BookOpen,
  Check,
  Clock,
  Home,
  Mail,
  MapPin,
  Phone,
  Plus,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import { useHouseholdContacts, useMyEncounters } from '@/hooks';
import { extractHouseholdContacts, type HouseholdContactSummary } from '@/lib/household-contacts';
import { timeAgo } from '@/lib/time-ago';
import type { Encounter, Household } from '@/types/api';
import { ContactAutocompleteInput } from './contact-autocomplete-input';

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

export const addEncounterSchema = z.object({
  householdId: z.string().optional().nullable(),
  visitId: z.string().optional().nullable(),
  name: z.string().min(1, 'Person name is required'),
  response: z.enum([
    'receptive',
    'neutral',
    'busy',
    'study_accepted',
    'not_interested',
    'foreign_language',
    'hostile',
    'do_not_visit',
    'moved',
  ]),
  role: z
    .enum(['head_of_household', 'spouse', 'resident', 'child', 'guest', 'other', 'unknown'])
    .optional(),
  gender: z.enum(['male', 'female', 'unknown']),
  ageGroup: z.enum(['youth', 'young_adult', 'adult', 'senior', 'unknown']),
  language: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().optional(),
  bestTimeToCall: z.string().optional(),
  locationDescription: z.string().optional(),
  notes: z.string().optional(),
  topicsDiscussed: z.string().optional(),
  literatureOffered: z.string().optional(),
  returnVisitRequested: z.boolean().optional(),
  nextVisitDate: z.string().optional(),
  nextVisitTime: z.string().optional(),
  nextVisitNotes: z.string().optional(),
  bibleStudyInterest: z.boolean().optional(),
  bibleStudyPublication: z.string().optional(),
  bibleStudyLesson: z.string().optional(),
});

export type AddEncounterFormValues = z.infer<typeof addEncounterSchema>;

interface AddEncounterFormProps {
  initialValues?: Partial<Encounter> & {
    language?: string | null;
    topicsDiscussed?: string | null;
    literatureOffered?: string | null;
  };
  household?: Household | null;
  households?: Household[] | null;
  defaultHouseholdId?: string | null;
  onSubmit: (values: AddEncounterFormValues) => void | Promise<void>;
  loading?: boolean;
  onCancel?: () => void;
}

export function AddEncounterForm({
  initialValues,
  household,
  households,
  defaultHouseholdId,
  onSubmit,
  loading = false,
  onCancel,
}: AddEncounterFormProps) {
  const initialHouseholdId =
    initialValues?.householdId ||
    household?.id ||
    defaultHouseholdId ||
    (households && households.length > 0 ? households[0].id : null);

  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(initialHouseholdId);
  const [selectedContact, setSelectedContact] = useState<HouseholdContactSummary | null>(null);
  const [copiedTopic, setCopiedTopic] = useState(false);

  const isEditing = Boolean(initialValues?.id);

  const form = useForm<AddEncounterFormValues>({
    resolver: zodResolver(addEncounterSchema) as any,
    defaultValues: {
      householdId: initialHouseholdId,
      visitId: initialValues?.visitId || null,
      name: initialValues?.name || '',
      response: (initialValues?.response as AddEncounterFormValues['response']) || 'receptive',
      role: (initialValues?.role as any) || 'unknown',
      gender: (initialValues?.gender as any) || 'unknown',
      ageGroup: (initialValues?.ageGroup as any) || 'adult',
      language: initialValues?.language || initialValues?.languageSpoken || '',
      phoneNumber: initialValues?.phoneNumber || '',
      email: initialValues?.email || '',
      bestTimeToCall: initialValues?.bestTimeToCall || '',
      locationDescription: initialValues?.locationDescription || '',
      notes: initialValues?.notes || '',
      topicsDiscussed: initialValues?.topicDiscussed || initialValues?.topicsDiscussed || '',
      literatureOffered:
        initialValues?.literatureAccepted || initialValues?.literatureOffered || '',
      returnVisitRequested: Boolean(initialValues?.returnVisitRequested),
      nextVisitDate: initialValues?.nextVisitDate || '',
      nextVisitTime: initialValues?.nextVisitTime || '',
      nextVisitNotes: initialValues?.nextVisitNotes || '',
      bibleStudyInterest: Boolean(initialValues?.bibleStudyInterest),
      bibleStudyPublication: initialValues?.bibleStudyPublication || '',
      bibleStudyLesson: initialValues?.bibleStudyLesson || '',
    },
  });

  const activeHouseholdId = form.watch('householdId') || selectedHouseholdId || null;

  const currentHousehold = useMemo(() => {
    return (
      household ||
      (households && activeHouseholdId ? households.find((h) => h.id === activeHouseholdId) : null)
    );
  }, [household, households, activeHouseholdId]);

  // Fetch Firestore contacts, household encounters, and all user encounters for cross-location matching
  const { contacts: firestoreContacts = [] } = useHouseholdContacts(activeHouseholdId);
  const { encounters: pastEncounters = [] } = useMyEncounters({
    householdId: activeHouseholdId,
  });
  const { encounters: allMyEncounters = [] } = useMyEncounters();

  // 1. Household-only contacts (used for the quick-recommendation pills "Who did you meet?")
  const householdContacts = useMemo(() => {
    const fromEncounters = extractHouseholdContacts(pastEncounters);
    const namesSet = new Set(fromEncounters.map((c) => c.normalizedName));

    const combined: HouseholdContactSummary[] = [...fromEncounters];
    for (const fc of firestoreContacts) {
      const normalized = fc.name.trim().toLowerCase();
      if (!namesSet.has(normalized)) {
        combined.push({
          id: fc.id,
          name: fc.name,
          normalizedName: normalized,
          encountersCount: 0,
          gender: (fc.gender as any) || 'unknown',
          ageGroup: (fc.ageGroup as any) || 'adult',
          role: fc.role || undefined,
          language: fc.language || undefined,
          phoneNumber: fc.phoneNumber || undefined,
          email: fc.email || undefined,
          bestTimeToCall: fc.bestTimeToCall || undefined,
          bibleStudyPublication: fc.bibleStudyPublication || undefined,
          bibleStudyLesson: fc.bibleStudyLesson || undefined,
          lastVisitDate: '',
          lastResponse: 'receptive',
          bibleStudyInterest: Boolean(fc.bibleStudyInterest),
          matchScope: 'household',
          latestEncounter: {} as any,
          allEncounters: [],
        });
        namesSet.add(normalized);
      }
    }
    return combined;
  }, [pastEncounters, firestoreContacts]);

  // 2. Full autocomplete contacts (household + territory + congregation)
  const autocompleteContacts = useMemo(() => {
    const namesSet = new Set(householdContacts.map((c) => c.normalizedName));
    const combined: HouseholdContactSummary[] = [...householdContacts];

    // Include territory and congregation contacts for smart autocomplete suggestions
    const otherEncounters = allMyEncounters.filter(
      (e) => e.householdId !== activeHouseholdId && e.name && e.name.trim().length > 0
    );
    const otherContacts = extractHouseholdContacts(otherEncounters);

    for (const oc of otherContacts) {
      if (!namesSet.has(oc.normalizedName)) {
        const isSameTerritory =
          Boolean(currentHousehold?.territoryId) &&
          oc.latestEncounter?.territoryId === currentHousehold?.territoryId;

        combined.push({
          ...oc,
          matchScope: isSameTerritory ? 'territory' : 'congregation',
          householdAddress:
            oc.latestEncounter?.householdAddress ||
            (oc.latestEncounter?.locationType ? 'Street / Informal' : undefined),
        });
        namesSet.add(oc.normalizedName);
      }
    }

    return combined;
  }, [householdContacts, allMyEncounters, activeHouseholdId, currentHousehold]);

  // Sync selected contact when form name matches or on initial load
  const currentName = form.watch('name');
  useEffect(() => {
    if (!currentName?.trim()) {
      setSelectedContact(null);
      return;
    }
    const matched = autocompleteContacts.find(
      (c) => c.normalizedName === currentName.trim().toLowerCase()
    );
    setSelectedContact(matched ?? null);
  }, [currentName, autocompleteContacts]);

  const handleSelectContact = (contact: HouseholdContactSummary | any) => {
    setSelectedContact(contact);
    form.setValue('name', contact.name, { shouldValidate: true });
    form.setValue('gender', contact.gender || 'unknown');
    form.setValue('ageGroup', contact.ageGroup || 'adult');
    form.setValue('role', contact.role || contact.latestEncounter?.role || 'unknown');
    form.setValue('language', contact.language || contact.latestEncounter?.language || '');
    form.setValue('phoneNumber', contact.phoneNumber || contact.latestEncounter?.phoneNumber || '');
    form.setValue('email', contact.email || contact.latestEncounter?.email || '');
    form.setValue(
      'bestTimeToCall',
      contact.bestTimeToCall || contact.latestEncounter?.bestTimeToCall || ''
    );
    if (contact.bibleStudyInterest || contact.latestEncounter?.bibleStudyInterest) {
      form.setValue('bibleStudyInterest', true);
    }
    if (contact.bibleStudyPublication || contact.latestEncounter?.bibleStudyPublication) {
      form.setValue(
        'bibleStudyPublication',
        contact.bibleStudyPublication || contact.latestEncounter?.bibleStudyPublication || ''
      );
    }
    if (contact.bibleStudyLesson || contact.latestEncounter?.bibleStudyLesson) {
      form.setValue(
        'bibleStudyLesson',
        contact.bibleStudyLesson || contact.latestEncounter?.bibleStudyLesson || ''
      );
    }
  };

  const handleNewPerson = () => {
    setSelectedContact(null);
    form.setValue('name', '', { shouldValidate: true });
    form.setValue('gender', 'unknown');
    form.setValue('ageGroup', 'adult');
    form.setValue('role', 'unknown');
    form.setValue('language', '');
    form.setValue('phoneNumber', '');
    form.setValue('email', '');
    form.setValue('bestTimeToCall', '');
    form.setValue('locationDescription', '');
    form.setValue('bibleStudyInterest', false);
    form.setValue('bibleStudyPublication', '');
    form.setValue('bibleStudyLesson', '');
  };

  const handleClearSelectedContact = () => {
    setSelectedContact(null);
  };

  const handleApplyPlannedTopic = (topic: string) => {
    form.setValue('topicsDiscussed', topic, { shouldValidate: true });
    setCopiedTopic(true);
    setTimeout(() => setCopiedTopic(false), 2000);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Household Selector (if multiple households provided and not pre-locked) */}
      {households && households.length > 0 && !household && (
        <div className="space-y-1">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <Home size={13} className="text-primary" />
            <span>Select Household / Address</span>
          </Label>
          <Select
            value={form.watch('householdId') || ''}
            onValueChange={(val) => {
              form.setValue('householdId', val);
              setSelectedHouseholdId(val);
              setSelectedContact(null);
            }}
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Choose a household address" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border max-h-60">
              {households.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.address} ({h.city})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Quick-Picker: Known Contacts at this Address */}
      {!isEditing && householdContacts.length > 0 && (
        <div className="space-y-2 p-3 rounded-2xl bg-muted/40 border border-border">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Users size={14} className="text-primary" />
              <span>Who did you meet?</span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              {householdContacts.length} {householdContacts.length === 1 ? 'contact' : 'contacts'}{' '}
              at this address
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {householdContacts.map((contact) => {
              const isSelected =
                selectedContact?.normalizedName === contact.normalizedName ||
                (!selectedContact &&
                  form.watch('name')?.trim().toLowerCase() === contact.normalizedName);

              return (
                <button
                  key={contact.normalizedName}
                  type="button"
                  onClick={() => handleSelectContact(contact)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted'
                  }`}
                >
                  <UserCheck
                    size={13}
                    className={isSelected ? 'text-primary-foreground' : 'text-primary'}
                  />
                  <span>{contact.name}</span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 h-4 font-bold rounded-full ${
                      isSelected
                        ? 'border-primary-foreground/40 text-primary-foreground bg-primary-foreground/10'
                        : 'border-border text-muted-foreground bg-muted/50'
                    }`}
                  >
                    {contact.encountersCount} {contact.encountersCount === 1 ? 'visit' : 'visits'}
                  </Badge>
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleNewPerson}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all border border-dashed ${
                !selectedContact
                  ? 'bg-primary/10 text-primary border-primary font-semibold'
                  : 'text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
              }`}
            >
              <Plus size={12} />
              <span>New Person</span>
            </button>
          </div>
        </div>
      )}

      {/* Previous Visit Context Card (Shows topic, literature, next visit goal) */}
      {selectedContact && (
        <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-primary flex items-center gap-1.5">
              <Sparkles size={14} />
              <span>Previous Visit with {selectedContact.name}</span>
            </span>
            <div className="flex items-center gap-1.5">
              {selectedContact.lastResponse && (
                <Badge
                  variant="outline"
                  className={`text-[10px] capitalize font-bold ${
                    responseBadgeColors[selectedContact.lastResponse] || ''
                  }`}
                >
                  {selectedContact.lastResponse.replace(/_/g, ' ')}
                </Badge>
              )}
              {selectedContact.lastVisitDate && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock size={11} />
                  <span>{timeAgo(selectedContact.lastVisitDate)}</span>
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1 text-muted-foreground text-[11px]">
            {selectedContact.lastTopicDiscussed && (
              <p>
                <strong className="text-foreground">Last Topic:</strong>{' '}
                {selectedContact.lastTopicDiscussed}
              </p>
            )}
            {selectedContact.lastLiteratureAccepted && (
              <p>
                <strong className="text-foreground">Literature Left:</strong>{' '}
                {selectedContact.lastLiteratureAccepted}
              </p>
            )}
            {selectedContact.nextVisitPlannedTopic && (
              <div className="mt-1.5 p-2 rounded-xl bg-background/80 border border-primary/20 flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                    Planned Topic for this visit
                  </span>
                  <p className="text-xs text-foreground font-medium italic">
                    &ldquo;{selectedContact.nextVisitPlannedTopic}&rdquo;
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleApplyPlannedTopic(selectedContact.nextVisitPlannedTopic!)}
                  className="h-7 text-[11px] font-semibold text-primary shrink-0 gap-1 rounded-lg"
                >
                  {copiedTopic ? <Check size={12} /> : null}
                  <span>{copiedTopic ? 'Applied' : 'Use Topic'}</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Person Name & Response Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="name" className="text-xs font-semibold">
            Person's Name *
          </Label>
          <ContactAutocompleteInput
            id="name"
            value={form.watch('name')}
            onChange={(name) => form.setValue('name', name, { shouldValidate: true })}
            onSelectContact={handleSelectContact}
            onClearSelection={handleClearSelectedContact}
            contacts={autocompleteContacts}
            selectedContact={selectedContact}
            placeholder="e.g. John Doe"
          />
          {form.formState.errors.name && (
            <p className="text-[10px] text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold">Response *</Label>
          <Select
            value={form.watch('response')}
            onValueChange={(val) =>
              form.setValue('response', val as AddEncounterFormValues['response'])
            }
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Select response" />
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

      {/* Demographics Row (Household Role, Gender, Age Group, Language) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Household Role</Label>
          <Select
            value={form.watch('role') || 'unknown'}
            onValueChange={(val) => form.setValue('role', val as any)}
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="unknown">Unspecified</SelectItem>
              <SelectItem value="head_of_household">Head of House</SelectItem>
              <SelectItem value="spouse">Spouse</SelectItem>
              <SelectItem value="resident">Resident / Family</SelectItem>
              <SelectItem value="child">Child / Youth</SelectItem>
              <SelectItem value="guest">Guest / Visitor</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold">Gender</Label>
          <Select
            value={form.watch('gender')}
            onValueChange={(val) =>
              form.setValue('gender', val as AddEncounterFormValues['gender'])
            }
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
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
            value={form.watch('ageGroup')}
            onValueChange={(val) =>
              form.setValue('ageGroup', val as AddEncounterFormValues['ageGroup'])
            }
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
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
          <Label className="text-xs font-semibold">Language Spoken</Label>
          <Input
            placeholder="e.g. English, Spanish"
            className="h-9 rounded-xl text-xs"
            {...form.register('language')}
          />
        </div>
      </div>

      {/* Contact Info & Best Time to Call Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label htmlFor="phoneNumber" className="text-xs font-semibold flex items-center gap-1">
            <Phone size={12} className="text-primary" />
            <span>Phone Number</span>
          </Label>
          <Input
            id="phoneNumber"
            type="tel"
            placeholder="e.g. +1 555-0199"
            className="h-9 rounded-xl text-xs"
            {...form.register('phoneNumber')}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="email" className="text-xs font-semibold flex items-center gap-1">
            <Mail size={12} className="text-primary" />
            <span>Email Address</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="e.g. contact@email.com"
            className="h-9 rounded-xl text-xs"
            {...form.register('email')}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="bestTimeToCall" className="text-xs font-semibold flex items-center gap-1">
            <Clock size={12} className="text-primary" />
            <span>Best Time to Call</span>
          </Label>
          <Input
            id="bestTimeToCall"
            placeholder="e.g. Evenings, Weekends"
            className="h-9 rounded-xl text-xs"
            {...form.register('bestTimeToCall')}
          />
        </div>
      </div>

      {/* Public / Street Location description (if not bound to a specific household) */}
      {!household && !activeHouseholdId && (
        <div className="space-y-1">
          <Label
            htmlFor="locationDescription"
            className="text-xs font-semibold flex items-center gap-1"
          >
            <MapPin size={12} className="text-primary" />
            <span>Public / Street Witnessing Location</span>
          </Label>
          <Input
            id="locationDescription"
            placeholder="e.g. City Park North bench, Bus stop near Main St, Public cart"
            className="h-9 rounded-xl text-xs"
            {...form.register('locationDescription')}
          />
        </div>
      )}

      {/* Topic Discussed */}
      <div className="space-y-1">
        <Label htmlFor="topicsDiscussed" className="text-xs font-semibold">
          Topic Discussed / Scripture
        </Label>
        <Input
          id="topicsDiscussed"
          placeholder="e.g. Psalm 37:11, Paradise"
          className="h-9 rounded-xl text-xs"
          {...form.register('topicsDiscussed')}
        />
      </div>

      {/* Literature Placed */}
      <div className="space-y-1">
        <Label htmlFor="literatureOffered" className="text-xs font-semibold">
          Literature Left / Video Shown
        </Label>
        <Input
          id="literatureOffered"
          placeholder="e.g. Enjoy Life Forever brochure"
          className="h-9 rounded-xl text-xs"
          {...form.register('literatureOffered')}
        />
      </div>

      {/* Bible Study & Next Visit Scheduling Section */}
      <div className="space-y-3 pt-2 border-t border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/60">
          <div className="flex items-center gap-2">
            <Checkbox
              id="returnVisitRequested"
              checked={form.watch('returnVisitRequested')}
              onCheckedChange={(checked) => form.setValue('returnVisitRequested', Boolean(checked))}
            />
            <Label
              htmlFor="returnVisitRequested"
              className="text-xs font-semibold cursor-pointer text-foreground"
            >
              Schedule Next Visit / Return Call
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="bibleStudyInterest"
              checked={
                form.watch('bibleStudyInterest') || form.watch('response') === 'study_accepted'
              }
              onCheckedChange={(checked) => form.setValue('bibleStudyInterest', Boolean(checked))}
            />
            <Label
              htmlFor="bibleStudyInterest"
              className="text-xs font-semibold cursor-pointer text-foreground"
            >
              Bible Study Interest / Conducted
            </Label>
          </div>
        </div>

        {/* Bible Study Details Section */}
        {(form.watch('bibleStudyInterest') || form.watch('response') === 'study_accepted') && (
          <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/20 space-y-2">
            <p className="text-xs font-bold text-violet-700 dark:text-violet-400 flex items-center gap-1.5">
              <BookOpen size={13} />
              <span>Bible Study Details</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="bibleStudyPublication" className="text-xs font-medium">
                  Publication / Material
                </Label>
                <Input
                  id="bibleStudyPublication"
                  placeholder="e.g. Enjoy Life Forever!"
                  className="h-9 rounded-xl text-xs bg-background"
                  {...form.register('bibleStudyPublication')}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bibleStudyLesson" className="text-xs font-medium">
                  Current Lesson / Chapter
                </Label>
                <Input
                  id="bibleStudyLesson"
                  placeholder="e.g. Lesson 03, Section 1"
                  className="h-9 rounded-xl text-xs bg-background"
                  {...form.register('bibleStudyLesson')}
                />
              </div>
            </div>
          </div>
        )}

        {/* Return Visit Scheduling Details */}
        {form.watch('returnVisitRequested') && (
          <div className="space-y-2.5 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="nextVisitDate" className="text-xs font-semibold text-foreground">
                  Next Visit / Follow-up Date
                </Label>
                <Input
                  id="nextVisitDate"
                  type="date"
                  className="h-9 rounded-xl text-xs bg-background"
                  {...form.register('nextVisitDate')}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nextVisitTime" className="text-xs font-semibold text-foreground">
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
              <Label htmlFor="nextVisitNotes" className="text-xs font-semibold text-foreground">
                Question / Topic for Next Visit
              </Label>
              <Input
                id="nextVisitNotes"
                placeholder="e.g. Question to answer on next visit"
                className="h-9 rounded-xl text-xs bg-background"
                {...form.register('nextVisitNotes')}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes" className="text-xs font-semibold">
          Conversation Notes
        </Label>
        <Textarea
          id="notes"
          placeholder="Details of conversation, return visit questions…"
          className="rounded-xl text-xs resize-none h-16"
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
          {loading
            ? 'Saving…'
            : isEditing
              ? 'Update Encounter'
              : selectedContact
                ? `Record Visit with ${selectedContact.name}`
                : 'Record Encounter'}
        </Button>
      </div>
    </form>
  );
}
