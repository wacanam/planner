'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ChevronDown, ChevronRight, ChevronUp, MapPin, MapPinOff, Plus, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { ProtectedPage } from '@/components/protected-page';
import { TerritoryRequestDialog } from '@/components/territory-request-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useCongregationTerritories,
  useCongregationTerritoryRequests,
  useTerritoryDetail,
} from '@/hooks';
import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import { queueHouseholdDelete } from '@/lib/visits-store';
import { AddHouseholdSheet } from '../../territories/[territoryId]/_components/AddHouseholdSheet';
import { MAP_STYLES } from '@/components/territory-map';
import type { StyleId } from '@/components/territory-map';
import type { Territory } from '@/types/api';
import { toast } from 'sonner';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import {
  LogVisitForm,
  type AddEncounterFormValues,
  type LogVisitFormValues,
} from '@/components/households/log-visit-form';
import { PinHouseModeToggle } from '@/components/households/pin-house-mode-toggle';
import { createVisit } from '@/lib/db/visits';
import { createEncounter } from '@/lib/db/encounters';
import { bulkUpsertHouseholds, deleteHousehold, getHouseholdById } from '@/lib/db/households';
import { useIDBHouseholds } from '@/hooks/use-idb-households';
import type { HouseholdRecord } from '@/lib/db/types';

// biome-ignore lint/suspicious/noExplicitAny: dynamic import
const TerritoryMap = dynamic(() => import('@/components/territory-map'), { ssr: false }) as any;

interface HouseholdMapItem {
  id: string;
  address?: string | null;
  streetName?: string | null;
  city?: string | null;
  notes?: string | null;
  membersCount?: number | null;
  createdAt?: string;
  updatedAt?: string;
  latitude?: number | null;
  longitude?: number | null;
}

// ─── Log Visit Dialog ──────────────────────────────────────────────────────────

function LogVisitSheet({
  householdId,
  householdLabel,
  onClose,
}: {
  householdId: string;
  householdLabel: string;
  onClose: () => void;
}) {
  const [isSubmitting, setSubmitting] = useState(false);

  const onSubmit = async (values: LogVisitFormValues, encounters: AddEncounterFormValues[]) => {
    setSubmitting(true);
    try {
      const visit = await createVisit({
        householdId,
        outcome: values.outcome,
        notes: values.notes,
      });

      for (const encounter of encounters) {
        await createEncounter({
          visitId: visit.id,
          householdId,
          name: encounter.name,
          response: encounter.response,
          notes: encounter.notes,
        });
      }

      toast.success('Visit logged successfully');
      onClose();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      toast.error(reason);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Log Visit"
      description={householdLabel}
      contentClassName="sm:max-w-lg"
    >
      <LogVisitForm submitting={isSubmitting} onSubmit={onSubmit} />
    </ResponsiveDialog>
  );
}

// ─── Delete Confirmation Dialog ────────────────────────────────────────────────

function DeleteConfirmDialog({
  householdId,
  householdLabel,
  onClose,
  onDeleted,
}: {
  householdId: string;
  householdLabel: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const existing = await getHouseholdById(householdId);
      if (!existing) {
        throw new Error(`Household ${householdId} was not found in local IndexedDB`);
      }
      await deleteHousehold(householdId);
      await queueHouseholdDelete(householdId);
      onDeleted();
      toast.success('Household deleted');
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      setError(reason);
      toast.error(reason);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Delete household?"
      description={`This removes ${householdLabel} from local records and queues deletion sync.`}
      confirmLabel={deleting ? 'Deleting…' : 'Delete'}
      confirmVariant="destructive"
      loading={deleting}
      error={error}
      onConfirm={handleDelete}
    />
  );
}

// ─── InlineMapView ─────────────────────────────────────────────────────────────

interface InlineMapViewProps {
  territory: Territory;
  onClose: () => void;
}

function InlineMapView({ territory, onClose }: InlineMapViewProps) {
  const router = useRouter();
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [showAllPins, setShowAllPins] = useState(false);
  const [mapMode, setMapMode] = useState<'view' | 'add' | 'remove'>('view');
  const [mapStyle, setMapStyle] = useState<StyleId>('streets');
  const [showStylePicker, setShowStylePicker] = useState(false);

  // Action states — opened from popup buttons
  const [logVisitHouseholdId, setLogVisitHouseholdId] = useState<string | null>(null);
  const [deleteConfirmHouseholdId, setDeleteConfirmHouseholdId] = useState<string | null>(null);

  // Load the FULL territory detail to get the boundary (the list API omits it)
  const { territory: fullTerritory, isLoading: territoryLoading } = useTerritoryDetail(
    territory.id
  );

  // Build boundary-filtered households API key
  const boundaryStr = fullTerritory?.boundary ?? null;
  const householdsKey = useMemo(() => {
    if (!boundaryStr) return null;
    try {
      const geo = JSON.parse(boundaryStr);
      const geoData = geo?.geometry ?? geo;
      if (!geoData?.type || !geoData?.coordinates) return null;
      return `/api/households?boundary=${encodeURIComponent(JSON.stringify(geoData))}`;
    } catch {
      return null;
    }
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

  const serverHouseholds: HouseholdMapItem[] = showAllPins
    ? (allPinsData ?? boundaryHouseholdsData ?? [])
    : (boundaryHouseholdsData ?? []);

  const { households: idbHouseholds } = useIDBHouseholds();
  const lastSyncSignatureRef = useRef<string>('');
  const serverHouseholdsSignature = useMemo(
    () =>
      `${serverHouseholds.length}:${serverHouseholds.map((household) => household.id).join('|')}`,
    [serverHouseholds]
  );

  useEffect(() => {
    const mapped: HouseholdRecord[] = serverHouseholds
      .filter((household) => household.latitude != null && household.longitude != null)
      .map((household) => ({
        id: household.id,
        name: household.address ?? 'Unnamed household',
        address: household.address ?? '',
        streetName: household.streetName ?? null,
        city: household.city ?? null,
        membersCount: household.membersCount ?? 1,
        notes: household.notes ?? null,
        latitude: Number(household.latitude),
        longitude: Number(household.longitude),
        territoryId: territory.id,
        congregationId: territory.congregationId ?? null,
        createdAt: household.createdAt ?? new Date().toISOString(),
        updatedAt: household.updatedAt ?? new Date().toISOString(),
      }));
    if (serverHouseholdsSignature === lastSyncSignatureRef.current) return;
    lastSyncSignatureRef.current = serverHouseholdsSignature;
    void bulkUpsertHouseholds(mapped).catch((error) => {
      const reason = error instanceof Error ? error.message : String(error);
      toast.error(reason);
    });
  }, [serverHouseholds, serverHouseholdsSignature, territory.id, territory.congregationId]);

  const households: HouseholdMapItem[] = idbHouseholds.map((household) => ({
    id: household.id,
    address: household.address,
    streetName: household.streetName ?? null,
    city: household.city ?? '',
    latitude: household.latitude,
    longitude: household.longitude,
  }));

  const logVisitHousehold = households.find((h) => h.id === logVisitHouseholdId) ?? null;

  const handleDeleted = useCallback(() => {
    setDeleteConfirmHouseholdId(null);
  }, []);

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
              router.push(`/congregation/${territory.congregationId}/records/households/${id}`);
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
                  onClick={() => {
                    setMapStyle(s.id as StyleId);
                    setShowStylePicker(false);
                  }}
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

          <PinHouseModeToggle
            active={mapMode === 'add'}
            onToggle={() => setMapMode((m) => (m === 'add' ? 'view' : 'add'))}
          />

          <button
            type="button"
            onClick={() => setMapMode((m) => (m === 'remove' ? 'view' : 'remove'))}
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
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
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
          onSuccess={() => {
            setPendingPin(null);
          }}
        />
      )}

      {/* Log Visit bottom sheet */}
      {logVisitHouseholdId && (
        <LogVisitSheet
          householdId={logVisitHouseholdId}
          householdLabel={logVisitHousehold?.address ?? 'Unnamed Household'}
          onClose={() => setLogVisitHouseholdId(null)}
        />
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirmHouseholdId && (
        <DeleteConfirmDialog
          householdId={deleteConfirmHouseholdId}
          householdLabel={
            households.find((h) => h.id === deleteConfirmHouseholdId)?.address ??
            deleteConfirmHouseholdId
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
  const mapOpenTerritory = mapOpenTerritoryId
    ? (territories.find((t) => t.id === mapOpenTerritoryId) ?? null)
    : null;

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
        <InlineMapView territory={mapOpenTerritory} onClose={() => setMapOpenTerritoryId(null)} />
      )}
    </ProtectedPage>
  );
}
