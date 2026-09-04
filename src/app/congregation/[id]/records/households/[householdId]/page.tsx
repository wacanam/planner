'use client';

import { ArrowLeft, BookOpen, Clock, Edit3, Lock, Plus, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { HouseholdLogVisitSheet } from '@/components/households/household-action-sheets';
import { PersonalCallDialog } from '@/components/households/PersonalCallDialog';
import { ShareHouseholdDialog } from '@/components/households/ShareHouseholdDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrentUser, useKeyboardShortcuts } from '@/hooks';
import { formatDateTime } from '@/lib/date-utils';
import {
  getHouseholdById,
  getVisitsByHousehold,
  toHouseholdView,
  toVisitView,
} from '@/lib/local-first';
import {
  getPersonalCallByHousehold,
  type PersonalCallRecord,
} from '@/lib/local-first/personal-calls';
import type { LocalHousehold, LocalVisit } from '@/lib/local-first/types';
import { canLogVisitOrEncounter, canShareHousehold } from '@/lib/permissions';
import { timeAgo } from '@/lib/time-ago';
import type { Household, Visit } from '@/types/api';

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
  const router = useRouter();
  const congregationId = params?.id;
  const householdId = params?.householdId;
  const { user } = useCurrentUser();

  const [rawHousehold, setRawHousehold] = useState<LocalHousehold | null>(null);
  const [rawVisits, setRawVisits] = useState<LocalVisit[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [logVisitOpen, setLogVisitOpen] = useState(false);
  const [initialLogVisitOutcome, setInitialLogVisitOutcome] = useState<string | undefined>();
  const [shareOpen, setShareOpen] = useState(false);
  const [personalCall, setPersonalCall] = useState<PersonalCallRecord | null>(null);
  const [personalCallDialogOpen, setPersonalCallDialogOpen] = useState(false);

  const reload = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    try {
      const [hResult, vResult] = await Promise.all([
        getHouseholdById(householdId),
        getVisitsByHousehold(householdId),
      ]);
      setRawHousehold(hResult ?? null);
      setRawVisits(vResult);

      if (user?.id) {
        try {
          const pc = await getPersonalCallByHousehold(user.id, householdId);
          setPersonalCall(pc);
        } catch {
          // Local storage read fallback
        }
      }
    } finally {
      setLoading(false);
    }
  }, [householdId, user?.id]);

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

  const canLog = canLogVisitOrEncounter(user, householdView);
  const canShare = canShareHousehold(user, householdView);

  const handleOpenGeneralLogVisit = () => {
    setInitialLogVisitOutcome(undefined);
    setLogVisitOpen(true);
  };

  useKeyboardShortcuts([
    {
      key: ['v', 'V'],
      handler: () => {
        if (canLog) handleOpenGeneralLogVisit();
      },
    },
    {
      key: ['n', 'N'],
      handler: () => {
        if (canLog) setPersonalCallDialogOpen(true);
      },
    },
    {
      key: ['s', 'S'],
      handler: () => {
        if (canShare) setShareOpen(true);
      },
    },
    {
      key: 'Escape',
      handler: () => {
        if (logVisitOpen) setLogVisitOpen(false);
        else if (personalCallDialogOpen) setPersonalCallDialogOpen(false);
        else if (shareOpen) setShareOpen(false);
        else router.push(`/congregation/${congregationId}/records/households`);
      },
    },
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl min-w-0 space-y-6 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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
                  onClick={() => setPersonalCallDialogOpen(true)}
                  className="h-8 rounded-xl text-xs font-semibold gap-1.5 text-primary border-primary/25 hover:bg-primary/10 hover:border-primary/40 transition-colors shadow-2xs"
                >
                  <BookOpen size={13} className="text-primary" />
                  <span>Personal Note</span>
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

          {/* Section: Personal Ministry Follow-up (Device Only) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <BookOpen size={16} className="text-primary" />
                <span>My Personal Follow-up</span>
              </h2>
              <Badge
                variant="outline"
                className="text-[10px] gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
              >
                <Lock size={10} />
                Private to You (On-Device)
              </Badge>
            </div>

            {personalCall ? (
              <Card className="bg-card border-border shadow-xs rounded-2xl">
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                        {personalCall.personName?.charAt(0).toUpperCase() || 'P'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-foreground">
                            {personalCall.personName}
                          </h3>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold capitalize py-0 h-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                          >
                            {personalCall.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        {personalCall.phoneNumber && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            📞 {personalCall.phoneNumber}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPersonalCallDialogOpen(true)}
                      className="h-8 text-xs rounded-xl gap-1.5 self-end sm:self-auto"
                    >
                      <Edit3 size={12} />
                      <span>Edit Note</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    {personalCall.scripturesDiscussed && (
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70">
                        <span className="font-semibold text-foreground">Scriptures / Topic:</span>
                        <p className="text-muted-foreground mt-0.5">
                          {personalCall.scripturesDiscussed}
                        </p>
                      </div>
                    )}
                    {personalCall.literaturePlaced && (
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70">
                        <span className="font-semibold text-foreground">Literature:</span>
                        <p className="text-muted-foreground mt-0.5">
                          {personalCall.literaturePlaced}
                        </p>
                      </div>
                    )}
                    {personalCall.nextVisitDate && (
                      <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20">
                        <span className="font-semibold text-primary">Next Agreed Visit:</span>
                        <p className="text-foreground font-medium mt-0.5">
                          {personalCall.nextVisitDate}{' '}
                          {personalCall.nextVisitTime ? `at ${personalCall.nextVisitTime}` : ''}
                        </p>
                      </div>
                    )}
                    {personalCall.notes && (
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 sm:col-span-2">
                        <span className="font-semibold text-foreground">Personal Notes:</span>
                        <p className="text-muted-foreground mt-0.5 italic">
                          &ldquo;{personalCall.notes}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="p-5 text-center bg-card border-border rounded-2xl space-y-2">
                <BookOpen size={28} className="mx-auto text-muted-foreground/40" />
                <p className="text-xs font-semibold text-foreground">
                  No personal follow-up saved for this household.
                </p>
                <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
                  Are you cultivating interest here? Save return visit notes, scriptures, and
                  callback times securely on your device.
                </p>
                {canLog && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPersonalCallDialogOpen(true)}
                    className="text-xs rounded-xl font-semibold gap-1.5 mt-1"
                  >
                    <Plus size={12} />
                    <span>Add to Personal Notebook</span>
                  </Button>
                )}
              </Card>
            )}
          </div>

          {/* Section: Door Visit Records */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Clock size={16} className="text-primary" />
                <span>Visit History ({visitsView.length})</span>
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
                        {formatDateTime(visit.visitDate)} ({timeAgo(visit.visitDate)})
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
            onSaved={reload}
          />

          <ShareHouseholdDialog
            open={shareOpen}
            onOpenChange={setShareOpen}
            household={householdView}
          />

          {user?.id && householdView && (
            <PersonalCallDialog
              open={personalCallDialogOpen}
              onOpenChange={setPersonalCallDialogOpen}
              userId={user.id}
              householdId={householdView.id}
              address={householdView.address}
              houseNumber={householdView.houseNumber}
              streetName={householdView.streetName}
              territoryId={householdView.territoryId}
              initialCall={personalCall}
              onSaved={reload}
            />
          )}
        </>
      )}
    </main>
  );
}
