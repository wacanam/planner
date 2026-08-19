'use client';

import { BookOpen, Calendar, Home, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AddEncounterForm,
  type AddEncounterFormValues,
} from '@/components/households/add-encounter-form';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCurrentUser, useHouseholds, useMyEncounters, useOverseenGroupMates } from '@/hooks';
import { canDeleteEncounter, canEditEncounter, isTerritoryServant } from '@/lib/permissions';
import {
  deleteEncounterRecord,
  saveEncounterRecord,
  updateEncounterRecord,
} from '@/lib/record-writes';
import type { Encounter } from '@/types/api';

const responseColors: Record<string, string> = {
  receptive: 'text-green-700 border-green-200 bg-green-50 dark:bg-green-950/40 dark:text-green-400',
  study_accepted:
    'text-violet-700 border-violet-200 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-400',
  neutral: 'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400',
  busy: 'text-orange-700 border-orange-200 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400',
  foreign_language:
    'text-cyan-700 border-cyan-200 bg-cyan-50 dark:bg-cyan-950/40 dark:text-cyan-400',
  not_interested:
    'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400',
  hostile: 'text-red-700 border-red-200 bg-red-50 dark:bg-red-950/40 dark:text-red-400',
  do_not_visit: 'text-red-700 border-red-200 bg-red-50 dark:bg-red-950/40 dark:text-red-400',
  moved: 'text-muted-foreground border-border bg-muted/30',
};

export default function EncountersClient() {
  const params = useParams();
  const { user } = useCurrentUser();
  const congregationId = (params?.id as string) || user?.congregationId || '';
  const groupMateUserIds = useOverseenGroupMates(congregationId, user?.id);

  const { encounters = [], isLoading } = useMyEncounters({
    userId: user?.id,
    userRole: user?.role,
    groupMateUserIds,
  });
  const { households = [] } = useHouseholds({
    userId: user?.id,
    userRole: user?.role,
    personalOnly: true,
    groupMateUserIds,
  });

  const [search, setSearch] = useState('');
  const [responseFilter, setResponseFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editEncounter, setEditEncounter] = useState<Encounter | null>(null);
  const [editingEncounter, setEditingEncounter] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = encounters;
    if (responseFilter !== 'all') {
      list = list.filter((e) => e.response === responseFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          (e.name && e.name.toLowerCase().includes(q)) ||
          (e.notes && e.notes.toLowerCase().includes(q)) ||
          (e.topicDiscussed && e.topicDiscussed.toLowerCase().includes(q)) ||
          (e.topicsDiscussed && e.topicsDiscussed.toLowerCase().includes(q))
      );
    }
    return list;
  }, [encounters, responseFilter, search]);

  const handleSaveEncounter = async (values: AddEncounterFormValues) => {
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
      toast.success(`Encounter with ${values.name} recorded`);
      setAddDialogOpen(false);
    } catch (err) {
      toast.error('Failed to record encounter');
    }
  };

  const handleUpdateEncounter = async (values: AddEncounterFormValues) => {
    if (!editEncounter) return;
    setEditingEncounter(true);
    try {
      await updateEncounterRecord(editEncounter.id, {
        householdId: values.householdId ?? null,
        name: values.name,
        response: values.response,
        gender: values.gender,
        ageGroup: values.ageGroup,
        languageSpoken: values.language,
        notes: values.notes || undefined,
        topicDiscussed: values.topicsDiscussed || undefined,
        literatureAccepted: values.literatureOffered || undefined,
        returnVisitRequested: values.returnVisitRequested,
        nextVisitDate: values.nextVisitDate || undefined,
        nextVisitTime: values.nextVisitTime || undefined,
        nextVisitNotes: values.nextVisitNotes || undefined,
        bibleStudyInterest: values.bibleStudyInterest,
      });
      toast.success('Encounter updated');
      setEditEncounter(null);
    } catch (err) {
      toast.error('Failed to update encounter');
    } finally {
      setEditingEncounter(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteEncounterRecord(id);
      setDeleteConfirmId(null);
      toast.success('Encounter deleted');
    } catch (err) {
      toast.error('Failed to delete encounter');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 min-w-0 w-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Person & Street Encounters</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log conversations met during field work, cart witnessing, and informal ministry
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setAddDialogOpen(true)}
          className="rounded-2xl text-xs font-semibold gap-1.5 h-9"
        >
          <Plus size={14} />
          <span>New Encounter</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search person or topic…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 rounded-xl text-xs"
          />
        </div>

        <select
          value={responseFilter}
          onChange={(e) => setResponseFilter(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground h-9 font-medium"
        >
          <option value="all">All responses</option>
          <option value="receptive">Receptive / Interested</option>
          <option value="study_accepted">Bible Study Accepted</option>
          <option value="neutral">Neutral</option>
          <option value="busy">Busy / Call Back</option>
          <option value="foreign_language">Foreign Language</option>
          <option value="not_interested">Not Interested</option>
          <option value="hostile">Hostile</option>
          <option value="do_not_visit">Do Not Visit</option>
          <option value="moved">Moved Out</option>
        </select>
      </div>

      {/* Encounters List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border rounded-3xl p-6">
          <Users size={40} className="text-muted-foreground/30 mb-3" />
          <p className="text-sm font-semibold text-foreground">No encounters logged</p>
          <p className="text-xs text-muted-foreground mt-1">
            Record people met in your ministry to track interest.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <Card
              key={e.id}
              className="bg-card border-border shadow-xs hover:border-primary/40 transition-all"
            >
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm text-foreground">{e.name}</p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold capitalize py-0 ${responseColors[e.response] ?? ''}`}
                    >
                      {e.response.replace(/_/g, ' ')}
                    </Badge>
                    {(e.language || e.languageSpoken) && (
                      <Badge variant="outline" className="text-[10px] py-0">
                        {e.language || e.languageSpoken}
                      </Badge>
                    )}
                  </div>
                  {/* Household / Location Indicator */}
                  {e.householdAddress ? (
                    <Link
                      href={
                        e.householdId
                          ? `/congregation/${congregationId}/records/households/${e.householdId}`
                          : `/congregation/${congregationId}/records/households?search=${encodeURIComponent(e.householdAddress || '')}`
                      }
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold flex-wrap"
                    >
                      <Home size={12} className="shrink-0" />
                      <span>
                        {e.houseNumber ? `${e.houseNumber} ` : ''}
                        {e.householdAddress}
                        {e.unitNumber ? ` (Unit ${e.unitNumber})` : ''}
                        {e.householdCity ? ` · ${e.householdCity}` : ''}
                      </span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] text-blue-700 dark:text-blue-400 font-medium">
                      <span>🚶 Street / Public Witnessing / Informal</span>
                    </div>
                  )}

                  {/* Date & Linked Visit */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} className="shrink-0" />
                      <span>{new Date(e.visitDate ?? e.createdAt).toLocaleDateString()}</span>
                    </div>
                    {e.userId !== user?.id && e.publisherName && (
                      <span className="text-foreground/80 font-medium">
                        · Recorded by {e.publisherName}
                      </span>
                    )}
                    {e.visitId && (
                      <span className="text-[11px] bg-muted/60 px-1.5 py-0.5 rounded-md font-medium">
                        Linked to Visit {e.visitOutcome ? `(${e.visitOutcome})` : ''}
                      </span>
                    )}
                  </div>

                  {(e.topicsDiscussed || e.topicDiscussed) && (
                    <div className="flex items-center gap-1 text-xs text-foreground font-medium">
                      <BookOpen size={12} className="text-primary shrink-0" />
                      <span>Topic: {e.topicsDiscussed || e.topicDiscussed}</span>
                    </div>
                  )}

                  {(e.literatureOffered || e.literatureAccepted) && (
                    <p className="text-xs text-primary font-medium">
                      Literature: {e.literatureOffered || e.literatureAccepted}
                    </p>
                  )}

                  {/* Return Visit & Bible Study Indicators */}
                  {(e.returnVisitRequested || e.bibleStudyInterest || e.nextVisitDate) && (
                    <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                      {e.returnVisitRequested && (
                        <span className="inline-flex items-center gap-1 font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-200/60 dark:border-purple-800/40 text-[11px]">
                          <span>📅 Next Visit Planned</span>
                          {e.nextVisitDate && (
                            <span className="font-normal text-purple-600 dark:text-purple-400">
                              ({new Date(e.nextVisitDate).toLocaleDateString()}
                              {e.nextVisitTime ? ` at ${e.nextVisitTime}` : ''})
                            </span>
                          )}
                        </span>
                      )}
                      {e.bibleStudyInterest && (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/40 text-[11px]">
                          📖 Bible Study Interest
                        </span>
                      )}
                      {e.nextVisitNotes && (
                        <p className="w-full text-xs text-muted-foreground italic">
                          Next visit note: {e.nextVisitNotes}
                        </p>
                      )}
                    </div>
                  )}

                  {e.notes && (
                    <p className="text-xs text-muted-foreground/90 italic line-clamp-2">
                      &ldquo;{e.notes}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {canEditEncounter(
                    user,
                    e,
                    households.find((h) => h.id === e.householdId)
                  ) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 rounded-xl p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      onClick={() => setEditEncounter(e)}
                      title="Edit encounter details"
                    >
                      <Pencil size={14} />
                    </Button>
                  )}

                  {canDeleteEncounter(
                    user,
                    e,
                    households.find((h) => h.id === e.householdId)
                  ) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 rounded-xl p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteConfirmId(e.id)}
                      disabled={deletingId === e.id}
                      title="Delete encounter"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Encounter Dialog */}
      <ResponsiveDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        title="Record Person Encounter"
        description="Save details of receptive people met in field work"
      >
        <AddEncounterForm
          households={households}
          onSubmit={handleSaveEncounter}
          onCancel={() => setAddDialogOpen(false)}
        />
      </ResponsiveDialog>

      {/* Edit Encounter Dialog */}
      <ResponsiveDialog
        open={!!editEncounter}
        onOpenChange={(op) => !op && setEditEncounter(null)}
        title="Edit Person Encounter"
        description={
          editEncounter
            ? `Update details or fix typos for ${editEncounter.name}`
            : 'Update encounter details'
        }
      >
        {editEncounter && (
          <AddEncounterForm
            initialValues={editEncounter}
            households={households}
            onSubmit={handleUpdateEncounter}
            loading={editingEncounter}
            onCancel={() => setEditEncounter(null)}
          />
        )}
      </ResponsiveDialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(op) => !op && setDeleteConfirmId(null)}
        title="Delete Encounter Record"
        description="Are you sure you want to delete this encounter? This action cannot be undone."
        confirmLabel="Delete Encounter"
        variant="destructive"
        onConfirm={() => {
          if (deleteConfirmId) void handleDelete(deleteConfirmId);
        }}
        loading={!!deletingId}
      />
    </div>
  );
}
