'use client';

import dynamic from 'next/dynamic';
import { ChevronDown, ChevronRight, ChevronUp, MapPin, MapPinOff, Plus, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ProtectedPage } from '@/components/protected-page';
import { TerritoryRequestDialog } from '@/components/territory-request-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCongregationTerritories, useCongregationTerritoryRequests, useTerritoryDetail, useHouseholdVisits } from '@/hooks';
import useSWR, { mutate } from 'swr';
import { apiClient } from '@/lib/api-client';
import { queueHouseholdDelete, queueVisit, registerVisitSync } from '@/lib/visits-store';
import { AddHouseholdSheet } from '../../territories/[territoryId]/_components/AddHouseholdSheet';
import { MAP_STYLES } from '@/components/territory-map';
import type { StyleId } from '@/components/territory-map';
import type { Territory } from '@/types/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// biome-ignore lint/suspicious/noExplicitAny: dynamic import
const TerritoryMap = dynamic(() => import('@/components/territory-map'), { ssr: false }) as any;

interface HouseholdMapItem {
  id: string;
  address?: string | null;
  streetName?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

// ─── Log Visit form schema ─────────────────────────────────────────────────────

const outcomeLabels: Record<string, string> = {
  not_home: 'Not Home',
  contacted: 'Contacted',
  do_not_visit: 'Do Not Visit',
  revisit: 'Revisit',
  bible_study: 'Bible Study',
};

const logVisitSchema = z.object({
  outcome: z.string().min(1, 'Required'),
  notes: z.string().optional(),
});
type LogVisitForm = z.infer<typeof logVisitSchema>;

// ─── Log Visit Sheet ───────────────────────────────────────────────────────────

function LogVisitSheet({
  householdId,
  householdLabel,
  onClose,
}: { householdId: string; householdLabel: string; onClose: () => void }) {
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } =
    useForm<LogVisitForm>({ resolver: zodResolver(logVisitSchema) });

  const onSubmit = async (values: LogVisitForm) => {
    await queueVisit({ householdId, outcome: values.outcome, notes: values.notes });
    void registerVisitSync().catch(() => {});
    reset();
    onClose();
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss
    // biome-ignore lint/a11y/useKeyWithClickEvents: intentional overlay dismiss
    <div className="fixed inset-0 z-[9200] flex flex-col justify-end" onClick={onClose}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation */}
      <div
        className="bg-background rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <p className="font-semibold text-sm">Log Visit</p>
            <p className="text-xs text-muted-foreground">{householdLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-muted">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="outcome">Outcome *</label>
            <Controller
              name="outcome"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="outcome">
                    <SelectValue placeholder="Select outcome…" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(outcomeLabels).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.outcome && <p className="text-xs text-destructive">{errors.outcome.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              rows={3}
              className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Optional notes…"
              {...register('notes')}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save Visit'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── View Details Sheet ────────────────────────────────────────────────────────

function ViewDetailsSheet({
  household,
  onClose,
  onLogVisit,
}: { household: HouseholdMapItem; onClose: () => void; onLogVisit: () => void }) {
  const { visits, isLoading } = useHouseholdVisits(household.id);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss
    // biome-ignore lint/a11y/useKeyWithClickEvents: intentional overlay dismiss
    <div className="fixed inset-0 z-[9200] flex justify-end" onClick={onClose}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation */}
      <div
        className="w-full max-w-md h-full bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 border-b">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{household.address ?? 'Unnamed household'}</p>
            {(household.streetName || household.city) && (
              <p className="text-xs text-muted-foreground">
                {[household.streetName, household.city].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-muted shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-3 border-b">
          <Button size="sm" className="w-full" onClick={onLogVisit}>+ Log Visit</Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Visit History ({isLoading ? '…' : visits.length})
          </p>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />)}
            </div>
          ) : visits.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No visits recorded yet.</p>
          ) : (
            visits.map((v) => (
              <div key={v.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{new Date(v.visitDate).toLocaleDateString()}</p>
                    {v.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{v.notes}</p>}
                  </div>
                  <Badge variant="outline" className="text-xs capitalize shrink-0">
                    {(v.outcome as string)?.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Dialog ────────────────────────────────────────────────

function DeleteConfirmDialog({
  householdId,
  householdLabel,
  onClose,
  onDeleted,
}: { householdId: string; householdLabel: string; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await queueHouseholdDelete(householdId);
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss
    // biome-ignore lint/a11y/useKeyWithClickEvents: intentional overlay dismiss
    <div className="fixed inset-0 z-[9200] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation */}
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="font-semibold text-sm">Delete Household?</p>
          <p className="text-xs text-muted-foreground mt-1">{householdLabel}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          This will queue the household for deletion. The action will sync when online.
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── InlineMapView ─────────────────────────────────────────────────────────────

interface InlineMapViewProps {
  territory: Territory;
  congregationId: string;
  onClose: () => void;
}

function InlineMapView({ territory, congregationId: _congregationId, onClose }: InlineMapViewProps) {
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [showAllPins, setShowAllPins] = useState(false);
  const [mapMode, setMapMode] = useState<'view' | 'add' | 'remove'>('view');
  const [mapStyle, setMapStyle] = useState<StyleId>('streets');
  const [showStylePicker, setShowStylePicker] = useState(false);

  // Action states — opened from popup buttons
  const [logVisitHouseholdId, setLogVisitHouseholdId] = useState<string | null>(null);
  const [viewDetailsHouseholdId, setViewDetailsHouseholdId] = useState<string | null>(null);
  const [deleteConfirmHouseholdId, setDeleteConfirmHouseholdId] = useState<string | null>(null);

  // Load the FULL territory detail to get the boundary (the list API omits it)
  const { territory: fullTerritory, isLoading: territoryLoading } = useTerritoryDetail(territory.id);

  // Build boundary-filtered households API key
  const boundaryStr = fullTerritory?.boundary ?? null;
  const householdsKey = useMemo(() => {
    if (!boundaryStr) return null;
    try {
      const geo = JSON.parse(boundaryStr);
      const geoData = geo?.geometry ?? geo;
      if (!geoData?.type || !geoData?.coordinates) return null;
      return `/api/households?boundary=${encodeURIComponent(JSON.stringify(geoData))}`;
    } catch { return null; }
  }, [boundaryStr]);

  const allPinsKey = showAllPins ? '/api/households' : null;

  const { data: boundaryHouseholdsData } = useSWR(
    householdsKey,
    (url: string) => apiClient.get<HouseholdMapItem[]>(url),
    { revalidateOnFocus: false }
  );
  const { data: allPinsData } = useSWR(
    allPinsKey,
    (url: string) => apiClient.get<HouseholdMapItem[]>(url),
    { revalidateOnFocus: false }
  );

  const households: HouseholdMapItem[] = showAllPins
    ? (allPinsData ?? boundaryHouseholdsData ?? [])
    : (boundaryHouseholdsData ?? []);

  const logVisitHousehold = households.find((h) => h.id === logVisitHouseholdId) ?? null;
  const viewDetailsHousehold = households.find((h) => h.id === viewDetailsHouseholdId) ?? null;

  const handleDeleted = useCallback(() => {
    setDeleteConfirmHouseholdId(null);
    void mutate(householdsKey);
    if (showAllPins) void mutate(allPinsKey);
  }, [householdsKey, allPinsKey, showAllPins]);

  return createPortal(
    <div className="fixed inset-0 z-[9000] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background z-10 shrink-0">
        <div className="min-w-0">
          <p className="text-xs text-primary font-medium uppercase tracking-wide">Territory Map</p>
          <p className="text-base font-bold text-foreground leading-tight truncate">
            #{territory.number} {territory.name}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full hover:bg-muted ml-2"
          aria-label="Close map"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 relative">
        {territoryLoading ? (
          <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading map…</p>
          </div>
        ) : (
          <TerritoryMap
            boundary={fullTerritory?.boundary ?? territory.boundary}
            households={households}
            mapStyle={mapStyle}
            mapInteractionMode={mapMode}
            onHouseholdPinPlaced={(lat: number, lng: number) => {
              setPendingPin({ lat, lng });
            }}
            onHouseholdClick={(id: string) => {
              setLogVisitHouseholdId(id);
            }}
            onHouseholdViewDetails={(id: string) => {
              setViewDetailsHouseholdId(id);
            }}
            onHouseholdDeleteRequest={(id: string) => {
              setDeleteConfirmHouseholdId(id);
            }}
            onHouseholdRemove={(id: string) => {
              setDeleteConfirmHouseholdId(id);
            }}
            className="w-full h-full"
          />
        )}

        {/* Right-side controls — mode buttons + style picker + show all */}
        <div className="absolute right-3 bottom-4 z-10 flex flex-col gap-1.5 items-end">
          {showStylePicker && (
            <div className="mb-1 flex flex-col gap-1 items-end">
              {MAP_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setMapStyle(s.id as StyleId); setShowStylePicker(false); }}
                  style={{ fontWeight: 600, fontSize: '10px' }}
                  className={[
                    'px-2.5 py-1 rounded-lg shadow-sm backdrop-blur-[2px] transition-all',
                    mapStyle === s.id
                      ? 'bg-primary text-white'
                      : 'bg-background/90 text-foreground hover:bg-background',
                  ].join(' ')}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setMapMode((m) => m === 'add' ? 'view' : 'add')}
            title={mapMode === 'add' ? 'Cancel add mode' : 'Add household (tap map)'}
            className={[
              'flex items-center justify-center w-9 h-9 rounded-full shadow-md backdrop-blur-[2px] transition-all',
              mapMode === 'add'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background/90 text-foreground hover:bg-background',
            ].join(' ')}
          >
            <MapPin size={16} />
          </button>

          <button
            type="button"
            onClick={() => setMapMode((m) => m === 'remove' ? 'view' : 'remove')}
            title={mapMode === 'remove' ? 'Cancel remove mode' : 'Remove household (tap marker)'}
            className={[
              'flex items-center justify-center w-9 h-9 rounded-full shadow-md backdrop-blur-[2px] transition-all',
              mapMode === 'remove'
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-background/90 text-foreground hover:bg-background',
            ].join(' ')}
          >
            <MapPinOff size={16} />
          </button>

          <label
            htmlFor="show-all-pins"
            className="flex items-center gap-2 bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-2 shadow-md cursor-pointer text-xs font-medium select-none"
          >
            <input
              id="show-all-pins"
              type="checkbox"
              checked={showAllPins}
              onChange={(e) => setShowAllPins(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-primary"
            />
            Show all Households
          </label>

          <button
            type="button"
            onClick={() => setShowStylePicker((p) => !p)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-background/90 backdrop-blur-[2px] shadow-sm text-[10px] font-semibold text-foreground"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>
            {MAP_STYLES.find((s) => s.id === mapStyle)?.label ?? 'Map'}
          </button>
        </div>
      </div>

      {pendingPin && (
        <AddHouseholdSheet
          lat={pendingPin.lat}
          lng={pendingPin.lng}
          territoryId={territory.id}
          congregationId={territory.congregationId ?? ''}
          onClose={() => setPendingPin(null)}
          onSuccess={() => { setPendingPin(null); void mutate(householdsKey); }}
        />
      )}

      {/* Log Visit bottom sheet */}
      {logVisitHouseholdId && (
        <LogVisitSheet
          householdId={logVisitHouseholdId}
          householdLabel={logVisitHousehold?.address ?? logVisitHouseholdId}
          onClose={() => setLogVisitHouseholdId(null)}
        />
      )}

      {/* View Details side sheet */}
      {viewDetailsHouseholdId && viewDetailsHousehold && (
        <ViewDetailsSheet
          household={viewDetailsHousehold}
          onClose={() => setViewDetailsHouseholdId(null)}
          onLogVisit={() => {
            setViewDetailsHouseholdId(null);
            setLogVisitHouseholdId(viewDetailsHouseholdId);
          }}
        />
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirmHouseholdId && (
        <DeleteConfirmDialog
          householdId={deleteConfirmHouseholdId}
          householdLabel={
            households.find((h) => h.id === deleteConfirmHouseholdId)?.address
            ?? deleteConfirmHouseholdId
          }
          onClose={() => setDeleteConfirmHouseholdId(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>,
    document.body
  );
}

export default function MyAssignmentsClient() {
  const params = useParams();
  const congregationId = params?.id as string;
  const { data: session } = useSession();
  const sessionUser = session?.user as { id?: string; name?: string } | undefined;
  const [showPast, setShowPast] = useState(false);
  const [mapOpenTerritoryId, setMapOpenTerritoryId] = useState<string | null>(null);

  const {
    data: territoriesData,
    isLoading: territoriesLoading,
    mutate: mutateTerritories,
  } = useCongregationTerritories(congregationId);
  const territories = territoriesData;

  const {
    data: requestsData,
    isLoading: requestsLoading,
    mutate: mutateRequests,
  } = useCongregationTerritoryRequests(congregationId, 'pending');
  const requests = requestsData;

  const loading = territoriesLoading || requestsLoading;
  const reload = async () => {
    await Promise.all([mutateTerritories(), mutateRequests()]);
  };

  const myActive = territories.filter(
    (t) => t.status === 'assigned' && t.publisherId === sessionUser?.id
  );
  const myPast = territories.filter(
    (t) =>
      (t.status === 'completed' || t.status === 'archived') && t.publisherId === sessionUser?.id
  );

  function getRequestLabel(territoryId?: string | null) {
    if (!territoryId) return 'Any available territory';
    const t = territories.find((t) => t.id === territoryId);
    return t ? `#${t.number} ${t.name}` : 'Specific territory';
  }

  const firstName = sessionUser?.name?.split(' ')[0] ?? 'Publisher';
  const mapOpenTerritory = mapOpenTerritoryId ? territories.find((t) => t.id === mapOpenTerritoryId) ?? null : null;

  return (
    <ProtectedPage congregationId={congregationId}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 min-w-0 w-full">
        {/* Greeting */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              My Work
            </p>
            <h1 className="text-2xl font-bold text-foreground leading-tight">Hi, {firstName} 👋</h1>
          </div>
          <TerritoryRequestDialog
            congregationId={congregationId}
            onSuccess={reload}
            trigger={
              <Button size="sm" variant="outline" className="gap-1">
                <Plus size={14} />
                Request
              </Button>
            }
          />
        </div>

        {/* Active territory — hero card */}
        {loading ? (
          <div className="h-36 bg-muted animate-pulse rounded-2xl" />
        ) : myActive.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center space-y-3">
            <MapPin size={28} className="mx-auto text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium text-foreground">No active territory</p>
              <p className="text-xs text-muted-foreground mt-0.5">Request one to get started</p>
            </div>
            <TerritoryRequestDialog
              congregationId={congregationId}
              onSuccess={reload}
              trigger={
                <Button size="sm" className="gap-1">
                  <Plus size={14} />
                  Request a Territory
                </Button>
              }
            />
          </div>
        ) : (
          <div className="space-y-3">
            {myActive.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-label={`View map for Territory #${t.number} ${t.name}`}
                className="w-full text-left rounded-2xl bg-primary/8 border border-primary/20 p-5 space-y-3 active:scale-[0.98] transition-transform"
                onClick={() => setMapOpenTerritoryId(t.id)}
              >
                {/* Territory identity */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-primary font-medium uppercase tracking-wide">
                      Active Territory
                    </p>
                    <p className="text-lg font-bold text-foreground mt-0.5 leading-tight">
                      #{t.number} {t.name}
                    </p>
                    {t.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.notes}</p>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <MapPin size={18} className="text-primary" />
                  </div>
                </div>

                {/* View map hint */}
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                  <MapPin size={12} />
                  <span>View Map</span>
                  <ChevronRight size={12} className="ml-auto text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pending requests — compact */}
        {!loading && requests.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium px-1">
              Pending Requests
            </p>
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {getRequestLabel(r.territoryId)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.requestedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400 shrink-0 ml-3">
                  Pending
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Past assignments — collapsed */}
        {!loading && myPast.length > 0 && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowPast((p) => !p)}
              className="flex items-center justify-between w-full px-1 py-1 text-xs text-muted-foreground uppercase tracking-wide font-medium"
            >
              Past Assignments ({myPast.length})
              {showPast ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showPast && (
              <div className="space-y-2">
                {myPast.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        #{t.number} {t.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <Badge variant="outline" className="text-xs capitalize">
                        {t.status}
                      </Badge>
                      <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                        <Link href={`/congregation/${congregationId}/territories/${t.id}`}>
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline map overlay — full screen */}
      {mapOpenTerritory && (
        <InlineMapView
          territory={mapOpenTerritory}
          congregationId={congregationId}
          onClose={() => setMapOpenTerritoryId(null)}
        />
      )}
    </ProtectedPage>
  );
}

