'use client';

import dynamic from 'next/dynamic';
import { ChevronDown, ChevronUp, ClipboardList, MapPin, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ProtectedPage } from '@/components/protected-page';
import { TerritoryRequestDialog } from '@/components/territory-request-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCongregationTerritories, useCongregationTerritoryRequests } from '@/hooks';
import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import { AddHouseholdSheet } from '../../territories/[territoryId]/_components/AddHouseholdSheet';
import type { Territory } from '@/types/api';

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

interface HouseholdsApiResponse {
  data?: HouseholdMapItem[];
}

interface InlineMapViewProps {
  territory: Territory;
  congregationId: string;
  onClose: () => void;
}

function InlineMapView({ territory, congregationId, onClose }: InlineMapViewProps) {
  const [pinMode, setPinMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedHousehold, setSelectedHousehold] = useState<HouseholdMapItem | null>(null);

  const { data: householdsData } = useSWR(
    territory.id ? `/api/households?territoryId=${territory.id}` : null,
    (url: string) => apiClient.get<HouseholdsApiResponse>(url).then((r) => r.data),
  );
  const households: HouseholdMapItem[] = householdsData ?? [];

  return (
    <div className="fixed inset-0 z-[2000] bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background z-10 shrink-0">
        <div className="min-w-0">
          <p className="text-xs text-primary font-medium uppercase tracking-wide">Territory Map</p>
          <p className="text-base font-bold text-foreground leading-tight truncate">
            #{territory.number} {territory.name}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!pinMode && (
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setPinMode(true)}>
              <Plus size={12} />
              Add HH
            </Button>
          )}
          {pinMode && (
            <Button size="sm" variant="destructive" className="text-xs" onClick={() => setPinMode(false)}>
              Cancel
            </Button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted"
            aria-label="Close map"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="flex-1 relative">
        <TerritoryMap
          boundary={territory.boundary}
          households={households}
          pinHouseholdMode={pinMode}
          onHouseholdPinPlaced={(lat: number, lng: number) => {
            setPendingPin({ lat, lng });
            setPinMode(false);
          }}
          onHouseholdClick={(hh: { id: string }) => {
            const found = households.find((h) => h.id === hh.id);
            if (found) setSelectedHousehold(found);
          }}
          className="w-full h-full"
        />
      </div>

      {pendingPin && (
        <AddHouseholdSheet
          lat={pendingPin.lat}
          lng={pendingPin.lng}
          territoryId={territory.id}
          congregationId={congregationId}
          onClose={() => setPendingPin(null)}
          onSuccess={() => setPendingPin(null)}
        />
      )}

      {selectedHousehold && (
        <div className="fixed bottom-0 inset-x-0 z-[2100] bg-background border-t rounded-t-2xl p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground">
                {selectedHousehold.address ?? 'Unnamed household'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedHousehold(null)}
              className="p-1.5 rounded-full hover:bg-muted shrink-0"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" className="flex-1">
              <Link
                href={`/congregation/${congregationId}/my-assignments/${territory.id}?householdId=${selectedHousehold.id}`}
              >
                <ClipboardList size={12} />
                Log Visit
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="flex-1">
              <Link href={`/records/households?householdId=${selectedHousehold.id}`}>
                View Records
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
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
              <div
                key={t.id}
                className="rounded-2xl bg-primary/8 border border-primary/20 p-5 space-y-4"
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
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{t.notes}</p>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <MapPin size={18} className="text-primary" />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 bg-background/80"
                    onClick={() => setMapOpenTerritoryId(t.id)}
                  >
                    <MapPin size={12} />
                    View Map
                  </Button>
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/congregation/${congregationId}/my-assignments/${t.id}`}>
                      <ClipboardList size={12} />
                      Log Visits
                    </Link>
                  </Button>
                </div>
              </div>
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

