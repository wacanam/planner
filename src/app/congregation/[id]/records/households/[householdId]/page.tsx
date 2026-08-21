'use client';

import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Home,
  MessageSquare,
  Plus,
  Share2,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HouseholdEncounterSheet,
  HouseholdLogVisitSheet,
} from '@/components/households/household-action-sheets';
import { ShareHouseholdDialog } from '@/components/households/ShareHouseholdDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/use-current-user';
import { extractHouseholdContacts, type HouseholdContactSummary } from '@/lib/household-contacts';
import {
  getContactsByHousehold,
  getEncountersByHousehold,
  getHouseholdById,
  getVisitsByHousehold,
  toEncounterView,
  toHouseholdView,
  toVisitView,
} from '@/lib/local-first';
import type {
  LocalContact,
  LocalEncounter,
  LocalHousehold,
  LocalVisit,
} from '@/lib/local-first/types';
import { canLogVisitOrEncounter, canShareHousehold } from '@/lib/permissions';
import { timeAgo } from '@/lib/time-ago';
import type { Encounter, Household, Visit } from '@/types/api';

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

const outcomeBadgeColors: Record<string, string> = {
  answered: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  not_home: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  busy: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  return_visit: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  study_conducted: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  minor_only: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  foreign_language: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
  inaccessible: 'bg-stone-500/10 text-stone-700 dark:text-stone-400 border-stone-500/20',
  vacant: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
  do_not_visit: 'bg-destructive/10 text-destructive border-destructive/20',
  moved: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
  other: 'bg-muted text-muted-foreground border-border',
};

export default function HouseholdDetailPage() {
  const params = useParams<{ id: string; householdId: string }>();
  const congregationId = params?.id;
  const householdId = params?.householdId;
  const { user } = useCurrentUser();

  const [rawHousehold, setRawHousehold] = useState<LocalHousehold | null>(null);
  const [rawVisits, setRawVisits] = useState<LocalVisit[]>([]);
  const [rawEncounters, setRawEncounters] = useState<LocalEncounter[]>([]);
  const [rawContacts, setRawContacts] = useState<LocalContact[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [logVisitOpen, setLogVisitOpen] = useState(false);
  const [initialLogVisitOutcome, setInitialLogVisitOutcome] = useState<string | undefined>();
  const [encounterOpen, setEncounterOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [initialEncounterValues, setInitialEncounterValues] = useState<
    Partial<Encounter> | undefined
  >();
  const [expandedContacts, setExpandedContacts] = useState<Record<string, boolean>>({});

  const reload = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    try {
      const [hResult, vResult, eResult, cResult] = await Promise.all([
        getHouseholdById(householdId),
        getVisitsByHousehold(householdId),
        getEncountersByHousehold(householdId),
        getContactsByHousehold(householdId),
      ]);
      setRawHousehold(hResult ?? null);
      setRawVisits(vResult);
      setRawEncounters(eResult);
      setRawContacts(cResult);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const householdView: Household | null = useMemo(() => {
    if (!rawHousehold) return null;
    return toHouseholdView(rawHousehold);
  }, [rawHousehold]);

  const visitsView: Visit[] = useMemo(() => {
    return rawVisits.map((v) => toVisitView(v, rawHousehold));
  }, [rawVisits, rawHousehold]);

  const encountersView: Encounter[] = useMemo(() => {
    return rawEncounters.map((e) => toEncounterView(e, rawHousehold, null));
  }, [rawEncounters, rawHousehold]);

  // Group encounters by person, merged with Firestore contacts
  const contacts: HouseholdContactSummary[] = useMemo(() => {
    const fromEncounters = extractHouseholdContacts(encountersView);
    const namesSet = new Set(fromEncounters.map((c) => c.normalizedName));

    const combined: HouseholdContactSummary[] = [...fromEncounters];
    for (const fc of rawContacts) {
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
          latestEncounter: {} as any,
          allEncounters: [],
        });
        namesSet.add(normalized);
      }
    }
    return combined;
  }, [encountersView, rawContacts]);

  const canLog = canLogVisitOrEncounter(user, householdView);
  const canShare = canShareHousehold(user, householdView);

  const toggleExpand = (nameKey: string) => {
    setExpandedContacts((prev) => ({
      ...prev,
      [nameKey]: !prev[nameKey],
    }));
  };

  const handleStartFollowUp = (contact: HouseholdContactSummary) => {
    setInitialLogVisitOutcome('return_visit');
    setInitialEncounterValues({
      householdId: householdView?.id,
      name: contact.name,
      gender: contact.gender,
      ageGroup: contact.ageGroup,
      role: contact.role,
      language: contact.language,
      phoneNumber: contact.phoneNumber,
      email: contact.email,
      bestTimeToCall: contact.bestTimeToCall,
      locationDescription: contact.locationDescription,
      topicsDiscussed: contact.nextVisitPlannedTopic || undefined,
      bibleStudyInterest: contact.bibleStudyInterest,
      bibleStudyPublication: contact.bibleStudyPublication,
      bibleStudyLesson: contact.bibleStudyLesson,
    });
    setLogVisitOpen(true);
  };

  const handleOpenGeneralLogVisit = () => {
    setInitialLogVisitOutcome(undefined);
    setInitialEncounterValues(undefined);
    setLogVisitOpen(true);
  };

  const handleOpenGeneralEncounter = () => {
    setInitialEncounterValues(undefined);
    setEncounterOpen(true);
  };

  return (
    <main className="mx-auto w-full max-w-6xl min-w-0 space-y-6 px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button asChild variant="ghost" size="sm" className="w-fit text-xs gap-1 rounded-xl">
          <Link href={`/congregation/${congregationId}/records/households`}>
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Households</span>
          </Link>
        </Button>

        {householdView && (
          <div className="flex items-center gap-2 flex-wrap">
            {canShare && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShareOpen(true)}
                className="h-8 rounded-xl text-xs font-semibold gap-1.5"
              >
                <Share2 size={13} />
                <span>Share</span>
              </Button>
            )}
            {canLog && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenGeneralEncounter}
                  className="h-8 rounded-xl text-xs font-semibold gap-1.5"
                >
                  <Users size={13} />
                  <span>Record Person Encounter</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleOpenGeneralLogVisit}
                  className="h-8 rounded-xl text-xs font-semibold gap-1.5"
                >
                  <Clock size={13} />
                  <span>Log Visit</span>
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center bg-card rounded-3xl border border-border space-y-3">
          <div className="h-6 w-48 bg-muted animate-pulse rounded-lg mx-auto" />
          <div className="h-4 w-32 bg-muted animate-pulse rounded-lg mx-auto" />
        </div>
      ) : !householdView ? (
        <div className="p-12 text-center bg-card rounded-3xl border border-border">
          <p className="text-sm text-muted-foreground">Household record not found.</p>
        </div>
      ) : (
        <>
          {/* Household Profile Card */}
          <Card className="bg-card border-border shadow-xs">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                    {householdView.houseNumber ? `${householdView.houseNumber} ` : ''}
                    {householdView.streetName || householdView.address}
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {householdView.address}, {householdView.city}
                    {householdView.postalCode ? ` (${householdView.postalCode})` : ''}
                    {householdView.creatorName ? ` · Added by: ${householdView.creatorName}` : ''}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize text-xs font-bold py-1 px-3">
                  {householdView.status.replace(/_/g, ' ')}
                </Badge>
              </div>

              <div className="flex gap-2 flex-wrap text-xs pt-1">
                <Badge variant="outline" className="bg-muted/30">
                  👥 Occupants: {householdView.occupantsCount ?? 1}
                </Badge>
                <Badge variant="outline" className="capitalize bg-muted/30">
                  🏠 {householdView.type}
                </Badge>
                {householdView.latitude && householdView.longitude ? (
                  <Badge
                    variant="outline"
                    className="text-primary font-bold bg-primary/5 border-primary/20"
                  >
                    📍 {Number(householdView.latitude).toFixed(5)},{' '}
                    {Number(householdView.longitude).toFixed(5)}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/40"
                  >
                    📍 Needs Pinning
                  </Badge>
                )}
                {householdView.languages && (
                  <Badge variant="outline" className="bg-muted/30">
                    🗣️ {householdView.languages}
                  </Badge>
                )}
              </div>

              {householdView.notes && (
                <div className="p-3 bg-muted/30 rounded-xl border border-border text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground mb-1">
                    Household Notes & Instructions:
                  </p>
                  <p>{householdView.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section: Known Contacts & Person Conversation Threads */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Users size={16} className="text-primary" />
                <span>Known Contacts & Return Visits ({contacts.length})</span>
              </h2>
              {canLog && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenGeneralEncounter}
                  className="h-7 text-xs font-semibold text-primary hover:bg-primary/10 gap-1 rounded-xl"
                >
                  <Plus size={13} />
                  <span>Add Person</span>
                </Button>
              )}
            </div>

            {contacts.length === 0 ? (
              <Card className="p-6 text-center bg-card border-border rounded-2xl">
                <Users size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs font-semibold text-foreground">
                  No person encounters recorded yet.
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Record individuals met at this door to track conversations and schedule return
                  visits.
                </p>
                {canLog && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenGeneralEncounter}
                    className="mt-3 text-xs rounded-xl font-semibold gap-1"
                  >
                    <Plus size={12} />
                    <span>Record First Encounter</span>
                  </Button>
                )}
              </Card>
            ) : (
              <div className="space-y-3">
                {contacts.map((contact) => {
                  const isExpanded = Boolean(expandedContacts[contact.normalizedName]);
                  return (
                    <Card
                      key={contact.normalizedName}
                      className="bg-card border-border shadow-xs hover:border-primary/30 transition-all rounded-2xl"
                    >
                      <CardContent className="p-4 sm:p-5 space-y-3">
                        {/* Person Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                              {contact.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-bold text-foreground">
                                  {contact.name}
                                </h3>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-bold py-0 h-4 bg-muted/50 border-border"
                                >
                                  {contact.encountersCount}{' '}
                                  {contact.encountersCount === 1 ? 'visit' : 'visits'}
                                </Badge>
                                {contact.bibleStudyInterest && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-bold py-0 h-4 bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20"
                                  >
                                    ⭐ Bible Study
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                                {contact.gender !== 'unknown' && (
                                  <span className="capitalize">{contact.gender}</span>
                                )}
                                {contact.ageGroup !== 'unknown' && (
                                  <span>• {contact.ageGroup.replace(/_/g, ' ')}</span>
                                )}
                                {contact.language && <span>• {contact.language}</span>}
                                {contact.lastVisitDate && (
                                  <span>• Last met {timeAgo(contact.lastVisitDate)}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold capitalize py-0.5 ${
                                responseBadgeColors[contact.lastResponse] ?? ''
                              }`}
                            >
                              {contact.lastResponse.replace(/_/g, ' ')}
                            </Badge>

                            {canLog && (
                              <Button
                                size="sm"
                                onClick={() => handleStartFollowUp(contact)}
                                className="h-8 text-xs font-semibold rounded-xl gap-1"
                              >
                                <Sparkles size={12} />
                                <span>Log Return Visit</span>
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Recent Highlights */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                          {contact.nextVisitPlannedTopic && (
                            <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-2">
                              <Sparkles size={14} className="text-primary shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                                  Planned Question / Topic:
                                </span>
                                <p className="font-semibold text-foreground truncate">
                                  "{contact.nextVisitPlannedTopic}"
                                </p>
                              </div>
                            </div>
                          )}

                          {contact.lastTopicDiscussed && (
                            <div className="p-2.5 rounded-xl bg-muted/30 border border-border flex items-start gap-2">
                              <BookOpen size={14} className="text-primary/70 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                  Last Topic Discussed:
                                </span>
                                <p className="font-medium text-foreground truncate">
                                  {contact.lastTopicDiscussed}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Conversation History Thread */}
                        <div className="pt-2 border-t border-border/50 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-foreground">
                              Conversation History ({contact.allEncounters.length}{' '}
                              {contact.allEncounters.length === 1 ? 'visit' : 'visits'})
                            </span>
                            {contact.allEncounters.length > 3 && (
                              <button
                                type="button"
                                onClick={() => toggleExpand(contact.normalizedName)}
                                className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp size={12} />
                                    <span>Show recent (3)</span>
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown size={12} />
                                    <span>Show all {contact.allEncounters.length} visits</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          <div className="space-y-2.5">
                            {(isExpanded || contact.allEncounters.length <= 3
                              ? contact.allEncounters
                              : contact.allEncounters.slice(0, 3)
                            ).map((encounter, idx, arr) => {
                              const isLast = idx === arr.length - 1;
                              const visitNumber = contact.allEncounters.length - idx;
                              const dateFormatted = encounter.visitDate
                                ? new Date(encounter.visitDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : 'Recent';

                              return (
                                <div
                                  key={encounter.id || idx}
                                  className="relative flex gap-3 items-stretch"
                                >
                                  {/* Timeline Node Column */}
                                  <div className="relative flex flex-col items-center shrink-0 w-3 self-stretch">
                                    {/* Timeline bullet dot */}
                                    <div
                                      className="h-2 w-2 rounded-full bg-primary ring-4 ring-card shrink-0 mt-3.5 z-10"
                                      aria-hidden="true"
                                    />
                                    {/* Connecting line to next visit dot */}
                                    {!isLast && (
                                      <div
                                        className="absolute top-3.5 -bottom-6 w-0.5 bg-border pointer-events-none -translate-x-1/2 left-1/2"
                                        aria-hidden="true"
                                      />
                                    )}
                                  </div>

                                  {/* Content Card */}
                                  <div className="flex-1 min-w-0 p-3 rounded-xl bg-muted/30 border border-border/70 text-xs space-y-1.5 hover:border-primary/40 transition-colors">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <span className="font-bold text-foreground flex items-center gap-1.5">
                                        <span>
                                          Visit {visitNumber} ({dateFormatted})
                                        </span>
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className={`text-[9px] font-bold capitalize py-0 ${
                                          responseBadgeColors[encounter.response] ?? ''
                                        }`}
                                      >
                                        {encounter.response.replace(/_/g, ' ')}
                                      </Badge>
                                    </div>

                                    {(encounter.topicDiscussed || encounter.topicsDiscussed) && (
                                      <p className="text-muted-foreground">
                                        <strong className="text-foreground">Topic:</strong>{' '}
                                        {encounter.topicDiscussed || encounter.topicsDiscussed}
                                      </p>
                                    )}

                                    {(encounter.literatureAccepted ||
                                      encounter.literatureOffered) && (
                                      <p className="text-muted-foreground">
                                        <strong className="text-foreground">Literature:</strong>{' '}
                                        {encounter.literatureAccepted ||
                                          encounter.literatureOffered}
                                      </p>
                                    )}

                                    {encounter.nextVisitNotes && (
                                      <p className="text-primary font-medium bg-primary/5 p-1.5 rounded-lg border border-primary/20">
                                        <strong className="text-primary">Next Plan:</strong> "
                                        {encounter.nextVisitNotes}"
                                      </p>
                                    )}

                                    {encounter.notes && (
                                      <p className="text-muted-foreground italic">
                                        &ldquo;{encounter.notes}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Door Visit Records */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Clock size={16} className="text-primary" />
                <span>Door Visit History ({visitsView.length})</span>
              </h2>
              {canLog && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLogVisitOpen(true)}
                  className="h-7 text-xs font-semibold text-primary hover:bg-primary/10 gap-1 rounded-xl"
                >
                  <Plus size={13} />
                  <span>Log Visit</span>
                </Button>
              )}
            </div>

            {visitsView.length === 0 ? (
              <Card className="p-6 text-center bg-card border-border rounded-2xl">
                <p className="text-xs text-muted-foreground">
                  No visits logged for this household yet.
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {visitsView.map((visit) => (
                  <div
                    key={visit.id}
                    className="p-3.5 rounded-2xl border border-border bg-card space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold capitalize py-0.5 ${
                            outcomeBadgeColors[visit.outcome] ?? ''
                          }`}
                        >
                          {visit.outcome.replace(/_/g, ' ')}
                        </Badge>
                        {visit.publisherName && (
                          <span className="text-xs text-muted-foreground font-medium">
                            by {visit.publisherName}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(visit.visitDate).toLocaleString()}
                      </p>
                    </div>

                    {visit.bibleTopicDiscussed && (
                      <p className="text-xs text-foreground">
                        <strong>Topic:</strong> {visit.bibleTopicDiscussed}
                      </p>
                    )}

                    {visit.literatureLeft && (
                      <p className="text-xs text-foreground">
                        <strong>Literature Left:</strong> {visit.literatureLeft}
                      </p>
                    )}

                    {visit.notes && <p className="text-xs text-muted-foreground">{visit.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Sheets */}
          <HouseholdLogVisitSheet
            open={logVisitOpen}
            onOpenChange={setLogVisitOpen}
            household={householdView}
            initialOutcome={initialLogVisitOutcome as any}
            initialContact={initialEncounterValues}
            onSaved={reload}
          />

          <HouseholdEncounterSheet
            open={encounterOpen}
            onOpenChange={setEncounterOpen}
            household={householdView}
            initialValues={initialEncounterValues}
            onSaved={reload}
          />

          <ShareHouseholdDialog
            open={shareOpen}
            onOpenChange={setShareOpen}
            household={householdView}
          />
        </>
      )}
    </main>
  );
}
