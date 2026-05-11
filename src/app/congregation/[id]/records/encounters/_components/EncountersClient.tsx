'use client';

import { Pencil, Trash2, Plus, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AddEncounterForm,
  type AddEncounterFormValues,
} from '@/components/households/add-encounter-form';
import { useHouseholds, useMyEncounters } from '@/hooks';
import {
  deleteEncounterRecord,
  saveEncounterRecord,
  updateEncounterRecord,
} from '@/lib/record-writes';
import type { Encounter, Household } from '@/types/api';

const responseColors: Record<string, string> = {
  receptive: 'text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20',
  neutral: 'text-blue-700 border-blue-200 bg-blue-50',
  not_interested: 'text-yellow-700 border-yellow-200 bg-yellow-50',
  hostile: 'text-red-700 border-red-200 bg-red-50',
  do_not_visit: 'text-red-700 border-red-200 bg-red-50',
  moved: 'text-muted-foreground border-border bg-muted/30',
};

const responseLabels: Record<string, string> = {
  receptive: 'Receptive',
  neutral: 'Neutral',
  not_interested: 'Not Interested',
  hostile: 'Hostile',
  do_not_visit: 'Do Not Visit',
  moved: 'Moved',
};
const DIALOG_CONTENT_OFFSET_PX = 200;

function householdLabel(household: Household) {
  const address =
    household.address || [household.houseNumber, household.streetName].filter(Boolean).join(' ');
  return `${address || 'Unnamed household'}${household.city ? `, ${household.city}` : ''}`;
}

function getEncounterDateISO(encounter?: Encounter | null) {
  if (!encounter) return new Date().toISOString();
  const source = encounter.visitDate ?? encounter.createdAt;
  const parsed = new Date(source);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

interface LogEncounterDialogProps {
  households: Household[];
  encounter?: Encounter | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function LogEncounterDialog({
  households,
  encounter,
  open,
  onOpenChange,
  onSaved,
}: LogEncounterDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [householdId, setHouseholdId] = useState('');

  useEffect(() => {
    if (!open) return;
    setHouseholdId(encounter?.householdId ?? '');
  }, [encounter, open]);

  const onSubmit = async (values: AddEncounterFormValues) => {
    const payload = {
      householdId: householdId || null,
      encounterDate: getEncounterDateISO(encounter),
      name: values.name,
      response: values.response,
      topicDiscussed: values.topicDiscussed,
      literatureAccepted: values.literatureAccepted,
      returnVisitRequested: values.returnVisitRequested,
      notes: values.notes,
    };

    setSubmitting(true);
    try {
      if (encounter) {
        await updateEncounterRecord(encounter.id, payload);
      } else {
        await saveEncounterRecord(payload);
      }
      onSaved();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={encounter ? 'Edit Encounter' : 'Add Encounter'}
      description="Record conversation details and optionally link to a household."
      contentClassName="sm:max-w-lg"
    >
      <div
        style={{ maxHeight: `calc(90vh - ${DIALOG_CONTENT_OFFSET_PX}px)` }}
        className="space-y-4 overflow-y-auto pr-4"
      >
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Linked Household</span>
          <Select
            value={householdId || 'none'}
            onValueChange={(value) => setHouseholdId(value === 'none' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="No linked household" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No linked household</SelectItem>
              {households.map((household) => (
                <SelectItem key={household.id} value={household.id}>
                  {householdLabel(household)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <AddEncounterForm
          submitting={submitting}
          isEditing={!!encounter}
          submitLabel={encounter ? 'Save Changes' : 'Add Encounter'}
          initialValues={
            encounter
              ? {
                  name: encounter.name ?? undefined,
                  response: encounter.response as AddEncounterFormValues['response'],
                  topicDiscussed: encounter.topicDiscussed ?? undefined,
                  literatureAccepted: encounter.literatureAccepted ?? undefined,
                  returnVisitRequested: encounter.returnVisitRequested,
                  notes: encounter.notes ?? undefined,
                }
              : undefined
          }
          onSubmit={onSubmit}
        />
      </div>
    </ResponsiveDialog>
  );
}

// ─── Swipe Card for Encounter ─────────────────────────────────────────────────

interface EncounterSwipeCardProps {
  isRevealed: boolean;
  onSwipe: (revealed: boolean) => void;
  onDelete: () => void;
  deleting: boolean;
  children: React.ReactNode;
}

function EncounterSwipeCard({
  isRevealed,
  onSwipe,
  onDelete,
  deleting,
  children,
}: EncounterSwipeCardProps) {
  const startXRef = useRef<number>(0);
  const draggingRef = useRef(false);
  const [offset, setOffset] = useState(0);
  const ACTION_WIDTH = 72;
  const THRESHOLD = 40;

  const onTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    draggingRef.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!draggingRef.current) return;
    const dx = startXRef.current - e.touches[0].clientX;
    if (isRevealed) {
      setOffset(Math.max(0, Math.min(ACTION_WIDTH, ACTION_WIDTH + dx)));
    } else {
      setOffset(Math.max(0, Math.min(ACTION_WIDTH, dx)));
    }
  };

  const onTouchEnd = () => {
    draggingRef.current = false;
    if (offset > THRESHOLD) {
      setOffset(ACTION_WIDTH);
      onSwipe(true);
    } else {
      setOffset(0);
      if (isRevealed) onSwipe(false);
    }
  };

  useEffect(() => {
    if (!isRevealed) setOffset(0);
    else setOffset(ACTION_WIDTH);
  }, [isRevealed]);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div
        className="absolute right-0 top-0 bottom-0 flex items-stretch"
        style={{ width: ACTION_WIDTH }}
      >
        <button
          type="button"
          disabled={deleting}
          onClick={onDelete}
          className="flex flex-col items-center justify-center w-full bg-destructive text-destructive-foreground rounded-r-2xl text-xs font-medium gap-1 disabled:opacity-50"
        >
          {deleting ? (
            <span>…</span>
          ) : (
            <>
              <Trash2 size={16} />
              <span>Delete</span>
            </>
          )}
        </button>
      </div>
      <div
        className="border border-border bg-card p-4 flex items-start justify-between gap-3"
        style={{
          transform: `translateX(-${offset}px)`,
          transition: draggingRef.current ? 'none' : 'transform 0.2s ease',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

export default function EncountersClient() {
  const { encounters, isLoading, error } = useMyEncounters();
  const { households } = useHouseholds();
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [editingEncounter, setEditingEncounter] = useState<Encounter | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteEncounterRecord(id);
      setDeletedIds((prev) => new Set(prev).add(id));
      setSwipedId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const visibleEncounters = encounters.filter((e) => !deletedIds.has(e.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 min-w-0 w-full">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">My Encounters</h1>
        <Button size="sm" onClick={() => setShowLogDialog(true)} className="gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" />
          Log Encounter
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : visibleEncounters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users size={40} className="text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No encounters logged yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Use Log Encounter for conversations inside or outside your assignment.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleEncounters.map((encounter) => (
            <EncounterSwipeCard
              key={encounter.id}
              isRevealed={swipedId === encounter.id}
              onSwipe={(revealed) => setSwipedId(revealed ? encounter.id : null)}
              onDelete={() => void handleDelete(encounter.id)}
              deleting={deletingId === encounter.id}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {encounter.name ?? 'Unknown person'}
                  {encounter.householdAddress ? (
                    <span className="text-muted-foreground font-normal">
                      {' '}
                      · {encounter.householdAddress}
                      {encounter.householdCity ? `, ${encounter.householdCity}` : ''}
                    </span>
                  ) : (
                    <span className="text-muted-foreground font-normal">
                      {' '}
                      · Standalone encounter
                    </span>
                  )}
                </p>
                {(encounter.topicDiscussed || encounter.notes) && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {encounter.topicDiscussed ?? encounter.notes}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    {encounter.visitDate
                      ? new Date(encounter.visitDate).toLocaleDateString()
                      : new Date(encounter.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingEncounter(encounter)}
                  aria-label="Edit encounter"
                >
                  <Pencil size={13} />
                </Button>
                <Badge variant="outline" className={responseColors[encounter.response] ?? ''}>
                  {responseLabels[encounter.response] ?? encounter.response}
                </Badge>
              </div>
            </EncounterSwipeCard>
          ))}
        </div>
      )}

      <LogEncounterDialog
        households={households}
        open={showLogDialog}
        onOpenChange={setShowLogDialog}
        onSaved={() => undefined}
      />
      <LogEncounterDialog
        households={households}
        encounter={editingEncounter}
        open={!!editingEncounter}
        onOpenChange={(open) => {
          if (!open) setEditingEncounter(null);
        }}
        onSaved={() => setEditingEncounter(null)}
      />
    </div>
  );
}
