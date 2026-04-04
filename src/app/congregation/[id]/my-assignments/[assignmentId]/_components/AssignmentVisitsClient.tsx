'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Plus,
  MapPin,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  User,
} from 'lucide-react';

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
  addEncounterSchema,
  type LogVisitFormData,
  type AddHouseholdFormData,
  type AddEncounterFormData,
} from '@/schemas/visit';
import {
  queueVisit,
  queueHousehold,
  queueEncounter,
  getPendingVisits,
  getPendingHouseholds,
  clearPendingVisit,
  clearPendingHousehold,
  registerVisitSync,
  type PendingWrite,
} from '@/lib/visits-store';
import type { Household, Visit, Encounter } from '@/types/api';

// ─── Outcome labels ────────────────────────────────────────────────────────────

const OUTCOME_LABELS: Record<string, string> = {
  answered: 'Answered',
  not_home: 'Not Home',
  return_visit: 'Return Visit',
  do_not_visit: 'Do Not Visit',
  moved: 'Moved',
  other: 'Other',
};

const OUTCOME_COLORS: Record<string, string> = {
  answered: 'bg-green-100 text-green-800 border-green-200',
  not_home: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  return_visit: 'bg-purple-100 text-purple-800 border-purple-200',
  do_not_visit: 'bg-red-100 text-red-800 border-red-200',
  moved: 'bg-gray-100 text-gray-600 border-gray-200',
  other: 'bg-blue-100 text-blue-800 border-blue-200',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700 border-gray-200',
  active: 'bg-blue-100 text-blue-800 border-blue-200',
  not_home: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  return_visit: 'bg-purple-100 text-purple-800 border-purple-200',
  do_not_visit: 'bg-red-100 text-red-800 border-red-200',
  moved: 'bg-gray-100 text-gray-400 border-gray-100',
  inactive: 'bg-gray-100 text-gray-400 border-gray-100',
};

const RESPONSE_LABELS: Record<string, string> = {
  receptive: 'Receptive',
  neutral: 'Neutral',
  not_interested: 'Not Interested',
  hostile: 'Hostile',
  do_not_visit: 'Do Not Visit',
  moved: 'Moved',
};

// ─── Add Encounter Dialog ──────────────────────────────────────────────────────

interface AddEncounterDialogProps {
  open: boolean;
  visitId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

function AddEncounterDialog({ open, visitId, onClose, onSaved }: AddEncounterDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddEncounterFormData>({
    resolver: zodResolver(addEncounterSchema),
    defaultValues: {
      gender: 'unknown',
      role: 'unknown',
      bibleStudyInterest: false,
      returnVisitRequested: false,
    },
  });

  const onSubmit = async (values: AddEncounterFormData) => {
    if (!visitId) return;
    const payload: Record<string, unknown> = { visitId, ...values };
    await queueEncounter(payload);
    await registerVisitSync();
    onSaved();
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Encounter</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Record a person you met during this visit
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Response (required) */}
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Response *</span>
            <Controller
              name="response"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select response…" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RESPONSE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.response && (
              <p className="text-xs text-destructive">{errors.response.message}</p>
            )}
          </div>

          {/* Name */}
          <FormField
            label="Name (optional)"
            id="enc-name"
            error={errors.name?.message}
            {...register('name')}
          />

          {/* Gender */}
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Gender</span>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Age Group */}
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Age Group</span>
            <Controller
              name="ageGroup"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={(v) => field.onChange(v || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="youth">Youth</SelectItem>
                    <SelectItem value="adult">Adult</SelectItem>
                    <SelectItem value="elderly">Elderly</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Role</span>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="family_member">Family Member</SelectItem>
                    <SelectItem value="visitor">Visitor</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <FormField
            label="Language Spoken"
            id="enc-lang"
            error={errors.languageSpoken?.message}
            {...register('languageSpoken')}
          />
          <FormField
            label="Topic Discussed"
            id="enc-topic"
            error={errors.topicDiscussed?.message}
            {...register('topicDiscussed')}
          />
          <FormField
            label="Literature Accepted"
            id="enc-lit"
            error={errors.literatureAccepted?.message}
            {...register('literatureAccepted')}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enc-bsi"
              className="h-4 w-4 rounded border"
              {...register('bibleStudyInterest')}
            />
            <label htmlFor="enc-bsi" className="text-sm font-medium">
              Bible study interest
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enc-rvr"
              className="h-4 w-4 rounded border"
              {...register('returnVisitRequested')}
            />
            <label htmlFor="enc-rvr" className="text-sm font-medium">
              Return visit requested
            </label>
          </div>

          <FormField
            label="Notes"
            id="enc-notes"
            multiline
            rows={3}
            error={errors.notes?.message}
            {...register('notes')}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Save Encounter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Log Visit Dialog ──────────────────────────────────────────────────────────

interface LogVisitDialogProps {
  open: boolean;
  household: Household | null;
  assignmentId: string;
  onClose: () => void;
  onSaved: (pendingId: string, householdId: string) => void;
}

function LogVisitDialog({ open, household, assignmentId, onClose, onSaved }: LogVisitDialogProps) {
  const [savedVisitId, setSavedVisitId] = useState<string | null>(null);
  const [showEncounterDialog, setShowEncounterDialog] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(logVisitSchema),
    defaultValues: { returnVisitPlanned: false },
  });

  const returnVisitPlanned = watch('returnVisitPlanned');

  const onSubmit = async (values: LogVisitFormData) => {
    if (!household) return;
    const payload = {
      householdId: household.id,
      assignmentId: assignmentId || undefined,
      outcome: values.outcome,
      householdStatusAfter: values.householdStatusAfter,
      notes: values.notes,
      duration: values.duration,
      literatureLeft: values.literatureLeft,
      bibleTopicDiscussed: values.bibleTopicDiscussed,
      returnVisitPlanned: values.returnVisitPlanned ?? false,
      nextVisitDate: values.nextVisitDate,
      nextVisitNotes: values.nextVisitNotes,
    };
    const pending = await queueVisit(payload);
    await registerVisitSync();
    setSavedVisitId(pending);
    onSaved(pending, household.id);
    reset();
  };

  const handleClose = () => {
    setSavedVisitId(null);
    onClose();
  };

  return (
    <>
      <Dialog open={open && !savedVisitId} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
              <span className="text-sm font-medium">Outcome *</span>
              <Controller
                name="outcome"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select outcome…" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(OUTCOME_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
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
              <span className="text-sm font-medium">Update Household Status</span>
              <Controller
                name="householdStatusAfter"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Keep current status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="not_home">Not Home</SelectItem>
                      <SelectItem value="return_visit">Return Visit</SelectItem>
                      <SelectItem value="do_not_visit">Do Not Visit</SelectItem>
                      <SelectItem value="moved">Moved</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <FormField
              label="Duration (minutes)"
              id="duration"
              type="number"
              min={1}
              max={300}
              error={errors.duration?.message}
              {...register('duration', { valueAsNumber: true })}
            />

            <FormField
              label="Literature Left"
              id="literatureLeft"
              error={errors.literatureLeft?.message}
              {...register('literatureLeft')}
            />

            <FormField
              label="Bible Topic Discussed"
              id="bibleTopicDiscussed"
              error={errors.bibleTopicDiscussed?.message}
              {...register('bibleTopicDiscussed')}
            />

            <FormField
              label="Notes"
              id="notes"
              multiline
              rows={3}
              error={errors.notes?.message}
              {...register('notes')}
            />

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
              <>
                <FormField
                  label="Next visit date"
                  id="nextVisitDate"
                  type="date"
                  error={errors.nextVisitDate?.message}
                  {...register('nextVisitDate')}
                />
                <FormField
                  label="Next visit notes"
                  id="nextVisitNotes"
                  multiline
                  rows={2}
                  error={errors.nextVisitNotes?.message}
                  {...register('nextVisitNotes')}
                />
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Save Visit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Post-save: offer to add encounter */}
      <Dialog
        open={!!savedVisitId}
        onOpenChange={(v) => {
          if (!v) handleClose();
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Visit Saved ✓</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Would you like to record a person you spoke with?
            </p>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={handleClose}>
              Done
            </Button>
            <Button
              onClick={() => {
                setShowEncounterDialog(true);
                setSavedVisitId(null);
              }}
            >
              Add Encounter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddEncounterDialog
        open={showEncounterDialog}
        visitId={savedVisitId}
        onClose={() => {
          setShowEncounterDialog(false);
          handleClose();
        }}
        onSaved={() => {
          setShowEncounterDialog(false);
          handleClose();
        }}
      />
    </>
  );
}

// ─── Add Household Dialog ──────────────────────────────────────────────────────

interface AddHouseholdDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (pendingId: string) => void;
}

function AddHouseholdDialog({ open, onClose, onSaved }: AddHouseholdDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(addHouseholdSchema),
    defaultValues: { type: 'house' },
  });

  const onSubmit = async (values: AddHouseholdFormData) => {
    const pending = await queueHousehold(values as Record<string, unknown>);
    await registerVisitSync();
    onSaved(pending);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
            label="House Number"
            id="houseNumber"
            placeholder="Optional"
            error={errors.houseNumber?.message}
            {...register('houseNumber')}
          />
          <FormField
            label="Unit Number"
            id="unitNumber"
            placeholder="Apt, Suite, etc."
            error={errors.unitNumber?.message}
            {...register('unitNumber')}
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
            label="Postal Code"
            id="postalCode"
            error={errors.postalCode?.message}
            {...register('postalCode')}
          />
          <FormField
            label="Country"
            id="country"
            error={errors.country?.message}
            {...register('country')}
          />

          <div className="space-y-1.5">
            <span className="text-sm font-medium">Type</span>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="house">House</SelectItem>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="mobile_home">Mobile Home</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <FormField
            label="Floor"
            id="floor"
            type="number"
            error={errors.floor?.message}
            {...register('floor', { valueAsNumber: true })}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Latitude"
              id="latitude"
              placeholder="Optional"
              error={errors.latitude?.message}
              {...register('latitude')}
            />
            <FormField
              label="Longitude"
              id="longitude"
              placeholder="Optional"
              error={errors.longitude?.message}
              {...register('longitude')}
            />
          </div>

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

// ─── Visit Card with Encounters ───────────────────────────────────────────────

interface VisitCardProps {
  visit: Visit & { pending?: boolean };
  householdMap: Record<string, Household>;
  pendingVisitIds: Set<string>;
  syncedIds: Set<string>;
}

function VisitCard({ visit, householdMap, pendingVisitIds, syncedIds }: VisitCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [loadingEncounters, setLoadingEncounters] = useState(false);
  const [addEncounterOpen, setAddEncounterOpen] = useState(false);

  const hh = householdMap[visit.householdId];
  const address =
    visit.householdAddress ?? (hh ? `${hh.address} ${hh.streetName}` : visit.householdId);

  const loadEncounters = useCallback(async () => {
    if (visit.pending) return;
    setLoadingEncounters(true);
    try {
      const res = await fetch(`/api/visits/${visit.id}/encounters`);
      if (res.ok) {
        const json = (await res.json()) as { data: Encounter[] };
        setEncounters(json.data ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingEncounters(false);
    }
  }, [visit.id, visit.pending]);

  const handleToggle = () => {
    if (!expanded && encounters.length === 0 && !visit.pending) {
      void loadEncounters();
    }
    setExpanded((v) => !v);
  };

  return (
    <>
      <Card className="border border-border">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-sm flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {address}
              {pendingVisitIds.has(visit.id) &&
                (syncedIds.has(visit.id) ? (
                  <span className="text-xs text-green-600 font-medium">✓ Synced</span>
                ) : (
                  <span className="text-xs text-amber-600">⏳ Pending</span>
                ))}
            </p>
            {visit.outcome && (
              <Badge
                variant="outline"
                className={`text-xs shrink-0 ${OUTCOME_COLORS[visit.outcome] ?? ''}`}
              >
                {OUTCOME_LABELS[visit.outcome] ?? visit.outcome}
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {new Date(visit.visitDate).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
            {visit.duration ? ` · ${visit.duration} min` : ''}
            {typeof visit.encounterCount === 'number' && visit.encounterCount > 0 && (
              <span className="ml-1">
                · {visit.encounterCount} encounter{visit.encounterCount !== 1 ? 's' : ''}
              </span>
            )}
          </p>

          {visit.notes && (
            <p className="text-xs text-muted-foreground line-clamp-2">{visit.notes}</p>
          )}

          <div className="flex items-center justify-between pt-1">
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-7 px-2 gap-1"
              onClick={handleToggle}
              disabled={visit.pending}
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? 'Hide' : 'Encounters'}
            </Button>
            {!visit.pending && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => setAddEncounterOpen(true)}
              >
                <User className="h-3 w-3 mr-1" />
                Add Encounter
              </Button>
            )}
          </div>

          {expanded && (
            <div className="border-t pt-2 mt-1 space-y-2">
              {loadingEncounters ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : encounters.length === 0 ? (
                <p className="text-xs text-muted-foreground">No encounters recorded</p>
              ) : (
                encounters.map((enc) => (
                  <div key={enc.id} className="bg-muted/40 rounded p-2 text-xs space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{enc.name ?? 'Unknown'}</span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {RESPONSE_LABELS[enc.response] ?? enc.response}
                      </Badge>
                    </div>
                    {enc.topicDiscussed && (
                      <p className="text-muted-foreground">Topic: {enc.topicDiscussed}</p>
                    )}
                    {enc.literatureAccepted && (
                      <p className="text-muted-foreground">Literature: {enc.literatureAccepted}</p>
                    )}
                    <div className="flex gap-2 text-muted-foreground">
                      {enc.bibleStudyInterest && <span>📖 Bible study interest</span>}
                      {enc.returnVisitRequested && <span>🔄 Return requested</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AddEncounterDialog
        open={addEncounterOpen}
        visitId={visit.id}
        onClose={() => setAddEncounterOpen(false)}
        onSaved={() => {
          setAddEncounterOpen(false);
          void loadEncounters();
        }}
      />
    </>
  );
}

// ─── Main Client Component ─────────────────────────────────────────────────────

type Tab = 'households' | 'history';

export default function VisitsClient() {
  const { id: congregationId, assignmentId } = useParams<{
    id: string;
    assignmentId: string;
  }>();
  const territoryId = assignmentId ?? null;

  const { territory, isLoading: territoryLoading } = useTerritoryDetail(territoryId ?? null);
  const {
    households: serverHouseholds,
    isLoading: householdsLoading,
    mutate: mutateHouseholds,
    dataSource: householdsSource,
  } = useHouseholds();
  const {
    visits: serverVisits,
    isLoading: visitsLoading,
    mutate: mutateVisits,
    dataSource: visitsSource,
  } = useTerritoryVisits(territoryId ?? null);

  const [activeTab, setActiveTab] = useState<Tab>('households');
  const [logVisitHousehold, setLogVisitHousehold] = useState<Household | null>(null);
  const [showAddHousehold, setShowAddHousehold] = useState(false);

  // Auto-open log dialog when navigated from map with ?householdId=
  const searchParams = useSearchParams();
  useEffect(() => {
    const hid = searchParams?.get('householdId');
    if (!hid || householdsLoading) return;
    const target = serverHouseholds.find((h) => h.id === hid);
    if (target) setLogVisitHousehold(target);
  }, [searchParams, serverHouseholds, householdsLoading]);

  const [pendingVisits, setPendingVisits] = useState<PendingWrite[]>([]);
  const [pendingHouseholds, setPendingHouseholds] = useState<PendingWrite[]>([]);
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getPendingVisits().then(setPendingVisits).catch(console.error);
    getPendingHouseholds().then(setPendingHouseholds).catch(console.error);
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      const { type, pendingId } = (event.data ?? {}) as { type?: string; pendingId?: string };
      if (type === 'VISIT_SYNCED' && pendingId) {
        setSyncedIds((prev) => new Set(prev).add(pendingId));
        setTimeout(() => {
          void clearPendingVisit(pendingId).catch(console.error);
          setPendingVisits((prev) => prev.filter((v) => v.id !== pendingId));
          setSyncedIds((prev) => {
            const s = new Set(prev);
            s.delete(pendingId);
            return s;
          });
          void mutateVisits();
        }, 2000);
      }
      if (type === 'HOUSEHOLD_SYNCED' && pendingId) {
        setSyncedIds((prev) => new Set(prev).add(pendingId));
        setTimeout(() => {
          void clearPendingHousehold(pendingId).catch(console.error);
          setPendingHouseholds((prev) => prev.filter((h) => h.id !== pendingId));
          setSyncedIds((prev) => {
            const s = new Set(prev);
            s.delete(pendingId);
            return s;
          });
          void mutateHouseholds();
        }, 2000);
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [mutateVisits, mutateHouseholds]);

  const activeAssignmentId = territory?.publisherId ?? '';

  const allHouseholds = useMemo<Array<Household & { pending?: boolean }>>(() => {
    const serverIds = new Set(serverHouseholds.map((h) => h.id));
    const unsyncedPending = pendingHouseholds
      .filter((ph) => !serverIds.has(ph.id))
      .map<Household & { pending: boolean }>((ph) => ({
        id: ph.id,
        address: ((ph.data as Record<string, unknown>).address as string) ?? '',
        houseNumber: null,
        unitNumber: null,
        streetName: ((ph.data as Record<string, unknown>).streetName as string) ?? '',
        city: ((ph.data as Record<string, unknown>).city as string) ?? '',
        postalCode: null,
        country: null,
        latitude: null,
        longitude: null,
        location: null,
        type: ((ph.data as Record<string, unknown>).type as string) ?? 'house',
        floor: null,
        occupantsCount: null,
        languages: null,
        bestTimeToCall: null,
        status: 'new',
        lastVisitDate: null,
        lastVisitOutcome: null,
        notes: ((ph.data as Record<string, unknown>).notes as string) ?? null,
        lwpNotes: null,
        createdById: null,
        updatedById: null,
        createdAt: ph.createdAt,
        updatedAt: ph.createdAt,
        pending: true,
      }));
    return [...unsyncedPending, ...serverHouseholds];
  }, [serverHouseholds, pendingHouseholds]);

  const pendingHouseholdIds = useMemo(() => {
    const serverIds = new Set(serverHouseholds.map((h) => h.id));
    return new Set(pendingHouseholds.filter((ph) => !serverIds.has(ph.id)).map((ph) => ph.id));
  }, [pendingHouseholds, serverHouseholds]);

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
        userId: '',
        householdId: ((pv.data as Record<string, unknown>).householdId as string) ?? '',
        assignmentId: ((pv.data as Record<string, unknown>).assignmentId as string) ?? null,
        householdStatusBefore: null,
        householdStatusAfter:
          ((pv.data as Record<string, unknown>).householdStatusAfter as string) ?? null,
        visitDate: pv.createdAt,
        duration: ((pv.data as Record<string, unknown>).duration as number) ?? null,
        outcome: ((pv.data as Record<string, unknown>).outcome as string) ?? '',
        literatureLeft: null,
        bibleTopicDiscussed: null,
        returnVisitPlanned:
          ((pv.data as Record<string, unknown>).returnVisitPlanned as boolean) ?? false,
        nextVisitDate: ((pv.data as Record<string, unknown>).nextVisitDate as string) ?? null,
        nextVisitNotes: null,
        notes: ((pv.data as Record<string, unknown>).notes as string) ?? null,
        syncStatus: 'pending',
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
  const backHref = `/congregation/${congregationId}/my-assignments`;

  const householdMap = useMemo<Record<string, Household>>(() => {
    const m: Record<string, Household> = {};
    for (const h of serverHouseholds) m[h.id] = h;
    return m;
  }, [serverHouseholds]);

  return (
    <ProtectedPage congregationId={congregationId}>
      <main className="max-w-2xl mx-auto min-w-0 w-full">
        {/* Sticky header — compact, app-like */}
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center gap-2 px-4 py-3">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium">
                {territory?.number ? `Territory ${territory.number}` : 'My Work'}
              </p>
              <p className="text-sm font-semibold text-foreground truncate leading-tight">
                {territory?.name ?? 'Households & Visits'}
              </p>
            </div>
            {/* Data source dot */}
            {!loading && (
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  (activeTab === 'households' ? householdsSource : visitsSource) === 'server'
                    ? 'bg-green-500'
                    : (activeTab === 'households' ? householdsSource : visitsSource) === 'cache'
                      ? 'bg-amber-400'
                      : 'bg-muted'
                }`}
                title={
                  (activeTab === 'households' ? householdsSource : visitsSource) === 'server'
                    ? 'Live data'
                    : 'Cached — offline'
                }
              />
            )}
          </div>

          {/* Tab bar */}
          <div className="flex px-4">
            {(['households', 'history'] as const).map((tab) => (
              <button
                type="button"
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground'
                }`}
              >
                {tab === 'households' ? (
                  <MapPin className="h-3.5 w-3.5" />
                ) : (
                  <ClipboardList className="h-3.5 w-3.5" />
                )}
                {tab === 'households' ? 'Doors' : 'Visits'}
                {tab === 'households' && pendingHouseholds.length > 0 && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded-full">
                    {pendingHouseholds.length}
                  </span>
                )}
                {tab === 'history' && pendingVisits.length > 0 && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded-full">
                    {pendingVisits.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-3">
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-xl" />
              ))}
            </div>
          ) : activeTab === 'households' ? (
            <>
              {/* Add button — floating at top right */}
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setShowAddHousehold(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add Door
                </Button>
              </div>

              {allHouseholds.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                  <MapPin className="h-10 w-10 text-muted-foreground/30" />
                  <div>
                    <p className="text-sm font-medium text-foreground">No doors recorded</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tap "Add Door" to start logging
                    </p>
                  </div>
                </div>
              ) : (
                allHouseholds.map((h) => (
                  <div key={h.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {/* Address — concise */}
                        <p className="font-semibold text-sm text-foreground leading-tight">
                          {[h.houseNumber, h.streetName].filter(Boolean).join(' ')}
                          {h.unitNumber ? ` #${h.unitNumber}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">{h.city}</p>

                        {/* Status row */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[h.status] ?? 'text-muted-foreground border-border bg-muted/30'}`}
                          >
                            {h.status.replace(/_/g, ' ')}
                          </span>
                          {h.lastVisitDate && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(h.lastVisitDate).toLocaleDateString()}
                            </span>
                          )}
                          {pendingHouseholdIds.has(h.id) &&
                            (syncedIds.has(h.id) ? (
                              <span className="text-xs text-green-600 font-medium">✓ Synced</span>
                            ) : (
                              <span className="text-xs text-amber-500">⏳ Pending</span>
                            ))}
                        </div>
                      </div>

                      {/* Log Visit button */}
                      {!pendingHouseholdIds.has(h.id) && (
                        <Button
                          size="sm"
                          onClick={() => setLogVisitHousehold(h)}
                          className="shrink-0 h-9"
                        >
                          Log Visit
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            /* Visit History */
            <div>
              {allVisits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                  <ClipboardList className="h-10 w-10 text-muted-foreground/30" />
                  <div>
                    <p className="text-sm font-medium text-foreground">No visits yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Log a visit from the Doors tab
                    </p>
                  </div>
                </div>
              ) : (
                allVisits.map((v) => (
                  <VisitCard
                    key={v.id}
                    visit={v}
                    householdMap={householdMap}
                    pendingVisitIds={pendingVisitIds}
                    syncedIds={syncedIds}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </main>

      <LogVisitDialog
        open={!!logVisitHousehold}
        household={logVisitHousehold}
        assignmentId={activeAssignmentId}
        onClose={() => setLogVisitHousehold(null)}
        onSaved={handleVisitSaved}
      />

      <AddHouseholdDialog
        open={showAddHousehold}
        onClose={() => setShowAddHousehold(false)}
        onSaved={handleHouseholdSaved}
      />
    </ProtectedPage>
  );
}
