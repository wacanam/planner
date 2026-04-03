'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus, MapPin, Clock, ClipboardList } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProtectedPage } from '@/components/protected-page';
import { useTerritoryVisits, useHouseholds, useTerritoryDetail } from '@/hooks';
import {
  logVisitSchema,
  addHouseholdSchema,
  type LogVisitFormData,
  type AddHouseholdFormData,
} from '@/schemas/visit';
import {
  queueVisit,
  queueHousehold,
  getPendingVisits,
  getPendingHouseholds,
  clearPendingVisit,
  clearPendingHousehold,
  registerVisitSync,
  type PendingWrite,
  
} from '@/lib/visits-store';
import type { Household, Visit } from '@/types/api';

// ─── Outcome labels ────────────────────────────────────────────────────────────

const OUTCOME_LABELS: Record<string, string> = {
  answered: 'Answered',
  not_home: 'Not Home',
  do_not_call: 'Do Not Call',
  moved: 'Moved',
  other: 'Other',
};

const OUTCOME_COLORS: Record<string, string> = {
  answered: 'bg-green-100 text-green-800 border-green-200',
  not_home: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  do_not_call: 'bg-red-100 text-red-800 border-red-200',
  moved: 'bg-gray-100 text-gray-600 border-gray-200',
  other: 'bg-blue-100 text-blue-800 border-blue-200',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800 border-blue-200',
  VISITED: 'bg-green-100 text-green-800 border-green-200',
  RETURN_VISIT: 'bg-purple-100 text-purple-800 border-purple-200',
  DO_NOT_CALL: 'bg-red-100 text-red-800 border-red-200',
  MOVED: 'bg-gray-100 text-gray-600 border-gray-200',
};

// ─── Log Visit Dialog ──────────────────────────────────────────────────────────

interface LogVisitDialogProps {
  open: boolean;
  household: Household | null;
  assignmentId: string;
  onClose: () => void;
  onSaved: (pendingId: string, householdId: string) => void;
}

function LogVisitDialog({ open, household, assignmentId, onClose, onSaved }: LogVisitDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LogVisitFormData>({
    resolver: zodResolver(logVisitSchema),
    defaultValues: { returnVisitPlanned: false },
  });

  const returnVisitPlanned = watch('returnVisitPlanned');

  const onSubmit = async (values: LogVisitFormData) => {
    if (!household) return;
    const payload = {
      householdId: household.id,
      assignmentId,
      outcome: values.outcome,
      notes: values.notes,
      duration: values.duration,
      returnVisitPlanned: values.returnVisitPlanned ?? false,
      nextVisitDate: values.nextVisitDate,
      householdStatusAfter: values.householdStatusAfter,
    };
    // Write to IDB only — no API call
    const pending = await queueVisit(payload);
    await registerVisitSync();
    onSaved(pending, household.id);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Visit</DialogTitle>
          {household && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-3.5 w-3.5" />
              {household.address}, {household.city}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Outcome */}
          <div className="space-y-1.5">
            <label htmlFor="outcome" className="text-sm font-medium">Outcome *</label>
            <Controller
              name="outcome"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="outcome">
                    <SelectValue placeholder="Select outcome…" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.outcome && (
              <p className="text-xs text-destructive">{errors.outcome.message}</p>
            )}
          </div>

          {/* Household status after */}
          <div className="space-y-1.5">
            <label htmlFor="householdStatusAfter" className="text-sm font-medium">Update Household Status</label>
            <Controller
              name="householdStatusAfter"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger id="householdStatusAfter">
                    <SelectValue placeholder="Keep current status" />
                  </SelectTrigger>
                  <SelectContent>
                    {['NEW', 'VISITED', 'RETURN_VISIT', 'DO_NOT_CALL', 'MOVED'].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Duration */}
          <FormField
            label="Duration (minutes)"
            id="duration"
            type="number"
            min={1}
            max={300}
            error={errors.duration?.message}
            {...register('duration', { valueAsNumber: true })}
          />

          {/* Notes */}
          <FormField
            label="Notes"
            id="notes"
            multiline
            rows={3}
            error={errors.notes?.message}
            {...register('notes')}
          />

          {/* Return visit */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="returnVisitPlanned"
              className="h-4 w-4 rounded border"
              {...register('returnVisitPlanned')}
            />
            <label htmlFor="returnVisitPlanned" className="text-sm font-medium">
              Return visit planned
            </label>
          </div>

          {returnVisitPlanned && (
            <FormField
              label="Next visit date"
              id="nextVisitDate"
              type="date"
              error={errors.nextVisitDate?.message}
              {...register('nextVisitDate')}
            />
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Save Visit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Household Dialog ──────────────────────────────────────────────────────

interface AddHouseholdDialogProps {
  open: boolean;
  territoryId: string;
  onClose: () => void;
  onSaved: (pendingId: string) => void;
}

function AddHouseholdDialog({ open, territoryId, onClose, onSaved }: AddHouseholdDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddHouseholdFormData>({ resolver: zodResolver(addHouseholdSchema) });

  const onSubmit = async (values: AddHouseholdFormData) => {
    const payload = { territoryId, ...values };
    // Write to IDB only — no API call
    const pending = await queueHousehold(payload);
    await registerVisitSync();
    onSaved(pending);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Household</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Address"
            id="address"
            placeholder="e.g. 42"
            required
            error={errors.address?.message}
            {...register('address')}
          />
          <FormField
            label="Street Name"
            id="streetName"
            placeholder="e.g. Main Street"
            required
            error={errors.streetName?.message}
            {...register('streetName')}
          />
          <FormField
            label="City"
            id="city"
            required
            error={errors.city?.message}
            {...register('city')}
          />
          <FormField
            label="Notes"
            id="notes"
            multiline
            rows={2}
            error={errors.notes?.message}
            {...register('notes')}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Add Household
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Client Component ─────────────────────────────────────────────────────

type Tab = 'households' | 'history';

export default function VisitsClient() {
  const { id: congregationId, territoryId } = useParams<{
    id: string;
    territoryId: string;
  }>();

  const { territory, isLoading: territoryLoading } = useTerritoryDetail(territoryId ?? null);
  const { households: serverHouseholds, isLoading: householdsLoading, mutate: mutateHouseholds } =
    useHouseholds(territoryId ?? null);
  const { visits: serverVisits, isLoading: visitsLoading, mutate: mutateVisits } =
    useTerritoryVisits(territoryId ?? null);

  const [activeTab, setActiveTab] = useState<Tab>('households');
  const [logVisitHousehold, setLogVisitHousehold] = useState<Household | null>(null);
  const [showAddHousehold, setShowAddHousehold] = useState(false);

  // Pending IDB state
  const [pendingVisits, setPendingVisits] = useState<PendingWrite[]>([]);
  const [pendingHouseholds, setPendingHouseholds] = useState<PendingWrite[]>([]);
  // Briefly track synced ids to show ✅ indicator before item leaves the list
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());

  // Load pending from IDB on mount
  useEffect(() => {
    getPendingVisits().then(setPendingVisits).catch(console.error);
    getPendingHouseholds().then(setPendingHouseholds).catch(console.error);
  }, []);

  // Listen for SW sync completion messages
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handler = (event: MessageEvent) => {
      const { type, pendingId } = event.data ?? {};
      if (type === 'VISIT_SYNCED' && pendingId) {
        // Show ✅ for 2s then remove
        setSyncedIds((prev) => new Set(prev).add(pendingId));
        setTimeout(() => {
          clearPendingVisit(pendingId).catch(console.error);
          setPendingVisits((prev) => prev.filter((v) => v.id !== pendingId));
          setSyncedIds((prev) => { const s = new Set(prev); s.delete(pendingId); return s; });
          void mutateVisits();
        }, 2000);
      }
      if (type === 'HOUSEHOLD_SYNCED' && pendingId) {
        setSyncedIds((prev) => new Set(prev).add(pendingId));
        setTimeout(() => {
          clearPendingHousehold(pendingId).catch(console.error);
          setPendingHouseholds((prev) => prev.filter((h) => h.id !== pendingId));
          setSyncedIds((prev) => { const s = new Set(prev); s.delete(pendingId); return s; });
          void mutateHouseholds();
        }, 2000);
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [mutateVisits, mutateHouseholds]);

  // Build active assignment id from territory (best effort)
  const activeAssignmentId = territory?.publisherId ?? '';

  // Households: pending (unsynced) first, then server data; deduplicate by id
  const allHouseholds = useMemo<Array<Household & { pending?: boolean }>>(() => {
    const serverIds = new Set(serverHouseholds.map((h) => h.id));
    const unsyncedPending = pendingHouseholds
      .filter((ph) => !serverIds.has(ph.id))
      .map<Household & { pending: boolean }>((ph) => ({
        id: ph.id,
        congregationId: '',
        territoryId: territoryId ?? '',
        address: ((ph.data as Record<string,unknown>).address as string) ?? '',
        houseNumber: null,
        streetName: ((ph.data as Record<string,unknown>).streetName as string) ?? '',
        city: ((ph.data as Record<string,unknown>).city as string) ?? '',
        postalCode: null,
        status: 'NEW',
        lastVisitDate: null,
        lastVisitNotes: null,
        doNotDisturb: false,
        notes: ((ph.data as Record<string,unknown>).notes as string) ?? null,
        createdAt: ph.createdAt,
        updatedAt: ph.createdAt,
        pending: true,
      }));
    return [...unsyncedPending, ...serverHouseholds];
  }, [serverHouseholds, pendingHouseholds, territoryId]);

  // Pending household ids set for quick lookup (only unsynced ones)
  const pendingHouseholdIds = useMemo(() => {
    const serverIds = new Set(serverHouseholds.map((h) => h.id));
    return new Set(pendingHouseholds.filter((ph) => !serverIds.has(ph.id)).map((ph) => ph.id));
  }, [pendingHouseholds, serverHouseholds]);

  // Visits: pending (unsynced) first, then server data; deduplicate by id
  const pendingVisitIds = useMemo(() => {
    const serverIds = new Set(serverVisits.map((v) => v.id));
    return new Set(pendingVisits.filter((pv) => !serverIds.has(pv.id)).map((pv) => pv.id));
  }, [pendingVisits, serverVisits]);

  const allVisits = useMemo<Array<Visit & { pending?: boolean }>>(() => {
    const serverIds = new Set(serverVisits.map((v) => v.id));
    const unsyncedPending = pendingVisits
      .filter((pv) => !serverIds.has(pv.id))
      .map<Visit & { pending: boolean }>((pv) => ({
        id: pv.id,
        householdId: ((pv.data as Record<string,unknown>).householdId as string) ?? '',
        assignmentId: ((pv.data as Record<string,unknown>).assignmentId as string) ?? '',
        householdStatusBefore: null,
        householdStatusAfter: ((pv.data as Record<string,unknown>).householdStatusAfter as string) ?? null,
        visitDate: pv.createdAt,
        duration: ((pv.data as Record<string,unknown>).duration as number) ?? null,
        outcome: ((pv.data as Record<string,unknown>).outcome as string) ?? null,
        returnVisitPlanned: ((pv.data as Record<string,unknown>).returnVisitPlanned as boolean) ?? false,
        nextVisitDate: ((pv.data as Record<string,unknown>).nextVisitDate as string) ?? null,
        notes: ((pv.data as Record<string,unknown>).notes as string) ?? null,
        syncStatus: 'PENDING',
        offlineCreated: true,
        syncedAt: null,
        createdAt: pv.createdAt,
        updatedAt: pv.createdAt,
        pending: true,
      }));
    return [...unsyncedPending, ...serverVisits].sort(
      (a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
    );
  }, [serverVisits, pendingVisits]);

  const handleVisitSaved = useCallback((_pendingId: string, _householdId: string) => {
    getPendingVisits().then(setPendingVisits).catch(console.error);
  }, []);

  const handleHouseholdSaved = useCallback((_pendingId: string) => {
    getPendingHouseholds().then(setPendingHouseholds).catch(console.error);
  }, []);

  const loading = territoryLoading || householdsLoading || visitsLoading;
  const backHref = `/congregation/${congregationId}/territories/${territoryId}`;

  // Resolve household address for visit history display
  const householdMap = useMemo<Record<string, Household>>(() => {
    const m: Record<string, Household> = {};
    for (const h of serverHouseholds) m[h.id] = h;
    return m;
  }, [serverHouseholds]);

  return (
    <ProtectedPage congregationId={congregationId}>
      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold leading-tight">
              {territory
                ? `Territory ${territory.number}${territory.name ? ` — ${territory.name}` : ''}`
                : 'Households & Visits'}
            </h1>
            <p className="text-xs text-muted-foreground">Households &amp; Visit Log</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border gap-0">
          {(['households', 'history'] as const).map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'households' ? (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Households
                  {pendingHouseholds.length > 0 && (
                    <span className="ml-1 text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full">
                      {pendingHouseholds.length}⏳
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Visit History
                  {pendingVisits.length > 0 && (
                    <span className="ml-1 text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full">
                      {pendingVisits.length}⏳
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-xl" />
            ))}
          </div>
        ) : activeTab === 'households' ? (
          /* ── Households Tab ── */
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowAddHousehold(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Household
              </Button>
            </div>

            {allHouseholds.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No households recorded yet</p>
              </div>
            ) : (
              allHouseholds.map((h) => (
                <Card key={h.id} className="border border-border">
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="font-medium text-sm truncate">
                        {h.address} {h.streetName}
                        {pendingHouseholdIds.has(h.id) && (
                          syncedIds.has(h.id)
                            ? <span className="ml-1.5 text-xs text-green-600 font-medium">✓ Synced</span>
                            : <span className="ml-1.5 text-xs text-amber-600">⏳ Pending sync</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{h.city}</p>
                      {h.lastVisitDate && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last visit: {new Date(h.lastVisitDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-xs ${STATUS_COLORS[h.status] ?? ''}`}
                      >
                        {h.status.replace('_', ' ')}
                      </Badge>
                      {!pendingHouseholdIds.has(h.id) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => setLogVisitHousehold(h)}
                        >
                          Log Visit
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          /* ── Visit History Tab ── */
          <div className="space-y-3">
            {allVisits.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No visits recorded yet</p>
              </div>
            ) : (
              allVisits.map((v) => {
                const hh = householdMap[v.householdId];
                const address =
                  v.householdAddress ??
                  (hh ? `${hh.address} ${hh.streetName}` : v.householdId);
                return (
                  <Card key={v.id} className="border border-border">
                    <CardContent className="p-4 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {address}
                          {pendingVisitIds.has(v.id) && (
                            syncedIds.has(v.id)
                              ? <span className="text-xs text-green-600 font-medium">✓ Synced</span>
                              : <span className="text-xs text-amber-600">⏳ Pending sync</span>
                          )}
                        </p>
                        {v.outcome && (
                          <Badge
                            variant="outline"
                            className={`text-xs shrink-0 ${OUTCOME_COLORS[v.outcome] ?? ''}`}
                          >
                            {OUTCOME_LABELS[v.outcome] ?? v.outcome}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.visitDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                        {v.duration ? ` · ${v.duration} min` : ''}
                      </p>
                      {v.notes && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{v.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Log Visit Dialog */}
      <LogVisitDialog
        open={!!logVisitHousehold}
        household={logVisitHousehold}
        assignmentId={activeAssignmentId}
        onClose={() => setLogVisitHousehold(null)}
        onSaved={handleVisitSaved}
      />

      {/* Add Household Dialog */}
      <AddHouseholdDialog
        open={showAddHousehold}
        territoryId={territoryId ?? ''}
        onClose={() => setShowAddHousehold(false)}
        onSaved={handleHouseholdSaved}
      />
    </ProtectedPage>
  );
}
