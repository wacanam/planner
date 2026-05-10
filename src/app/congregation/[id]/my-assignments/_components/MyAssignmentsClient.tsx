'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ChevronDown, ChevronRight, ChevronUp, MapPin, Plus, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuthSession as useSession } from '@/lib/firebase/auth';
import { ProtectedPage } from '@/components/protected-page';
import { TerritoryRequestDialog } from '@/components/territory-request-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  HouseholdEncounterSheet,
  HouseholdLogVisitSheet,
} from '@/components/households/household-action-sheets';
import {
  useCongregationTerritories,
  useCongregationTerritoryRequests,
  useTerritoryDetail,
  useHouseholds,
} from '@/hooks';
import { AddHouseholdSheet } from '../../territories/[territoryId]/_components/AddHouseholdSheet';
import type { StyleId } from '@/components/territory-map';
import type { Household, Territory } from '@/types/api';

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

// ─── InlineMapView ─────────────────────────────────────────────────────────────

interface InlineMapViewProps {
  territory: Territory;
  onClose: () => void;
}

function InlineMapView({ territory, onClose }: InlineMapViewProps) {
  const router = useRouter();
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [showAllPins, setShowAllPins] = useState(false);
  const [mapStyle, setMapStyle] = useState<StyleId>('streets');

  // Action states — opened from popup buttons
  const [logVisitHouseholdId, setLogVisitHouseholdId] = useState<string | null>(null);
  const [encounterHouseholdId, setEncounterHouseholdId] = useState<string | null>(null);

  // Load the FULL territory detail to get the boundary (the list API omits it)
  const { territory: fullTerritory, isLoading: territoryLoading } = useTerritoryDetail(
    territory.id
  );

  const { households: localHouseholds } = useHouseholds({
    congregationId: territory.congregationId,
    territoryId: showAllPins ? undefined : territory.id,
  });

  const households: HouseholdMapItem[] = localHouseholds
    .filter((household) => household.latitude != null && household.longitude != null)
    .map((household) => ({
      id: household.id,
      address: household.address,
      streetName: household.streetName ?? null,
      city: household.city ?? '',
      latitude: Number(household.latitude),
      longitude: Number(household.longitude),
    }));

  const logVisitHousehold = households.find((h) => h.id === logVisitHouseholdId) ?? null;
  const logVisitHouseholdRecord =
    localHouseholds.find((household) => household.id === logVisitHouseholdId) ?? null;
  const encounterHouseholdRecord =
    localHouseholds.find((household) => household.id === encounterHouseholdId) ?? null;

  return createPortal(
    <div className="fixed inset-0 bg-background flex flex-col" style={{ zIndex: 9000 }}>
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
            onMapStyleChange={setMapStyle}
            mapInteractionMode="add"
            pinPreview={pendingPin}
            onPinPreviewChange={setPendingPin}
            pinPlacement="instant"
            showPinControl={false}
            onHouseholdPinPlaced={(lat: number, lng: number) => {
              setPendingPin({ lat, lng });
            }}
            onHouseholdClick={(id: string) => {
              setLogVisitHouseholdId(id);
            }}
            onHouseholdAddEncounter={(id: string) => {
              setEncounterHouseholdId(id);
            }}
            onHouseholdViewDetails={(id: string) => {
              router.push(`/congregation/${territory.congregationId}/records/households/${id}`);
            }}
            className="w-full h-full"
          />
        )}

        <div className="absolute left-3 bottom-4 z-10 flex flex-col gap-2 items-start">
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
        <HouseholdLogVisitSheet
          household={(logVisitHouseholdRecord ?? logVisitHousehold) as Household | null}
          open={!!logVisitHouseholdId}
          onOpenChange={(open) => {
            if (!open) setLogVisitHouseholdId(null);
          }}
        />
      )}

      {encounterHouseholdId && (
        <HouseholdEncounterSheet
          household={encounterHouseholdRecord}
          open={!!encounterHouseholdId}
          onOpenChange={(open) => {
            if (!open) setEncounterHouseholdId(null);
          }}
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

  const { data: territoriesData, isLoading: territoriesLoading } =
    useCongregationTerritories(congregationId);
  const territories = territoriesData;

  const { data: requestsData, isLoading: requestsLoading } = useCongregationTerritoryRequests(
    congregationId,
    'pending'
  );
  const requests = requestsData;

  const loading = territoriesLoading || requestsLoading;
  const reload = () => undefined;

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
