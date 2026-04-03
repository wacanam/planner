'use client';

import { ArrowRight, ChevronDown, ChevronUp, ClipboardList, MapPin, Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ProtectedPage } from '@/components/protected-page';
import { TerritoryRequestDialog } from '@/components/territory-request-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCongregationTerritories, useCongregationTerritoryRequests } from '@/hooks';

export default function MyAssignmentsClient() {
  const params = useParams();
  const congregationId = params?.id as string;
  const { data: session } = useSession();
  const sessionUser = session?.user as { id?: string; name?: string } | undefined;
  const [showPast, setShowPast] = useState(false);

  const { data: territoriesData, isLoading: territoriesLoading, mutate: mutateTerritories } =
    useCongregationTerritories(congregationId);
  const territories = territoriesData;

  const { data: requestsData, isLoading: requestsLoading, mutate: mutateRequests } =
    useCongregationTerritoryRequests(congregationId, 'pending');
  const requests = requestsData;

  const loading = territoriesLoading || requestsLoading;
  const reload = async () => { await Promise.all([mutateTerritories(), mutateRequests()]); };

  const myActive = territories.filter(t => t.status === 'assigned' && t.publisherId === sessionUser?.id);
  const myPast = territories.filter(
    t => (t.status === 'completed' || t.status === 'archived') && t.publisherId === sessionUser?.id
  );

  function getRequestLabel(territoryId?: string | null) {
    if (!territoryId) return 'Any available territory';
    const t = territories.find(t => t.id === territoryId);
    return t ? `#${t.number} ${t.name}` : 'Specific territory';
  }

  const firstName = sessionUser?.name?.split(' ')[0] ?? 'Publisher';

  return (
    <ProtectedPage congregationId={congregationId}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 min-w-0 w-full">

        {/* Greeting */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">My Work</p>
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
            {myActive.map(t => (
              <div key={t.id} className="rounded-2xl bg-primary/8 border border-primary/20 p-5 space-y-4">
                {/* Territory identity */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-primary font-medium uppercase tracking-wide">Active Territory</p>
                    <p className="text-lg font-bold text-foreground mt-0.5 leading-tight">
                      #{t.number} {t.name}
                    </p>
                    {t.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{t.notes}</p>}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <MapPin size={18} className="text-primary" />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1 bg-background/80">
                    <Link href={`/congregation/${congregationId}/territories/${t.id}`}>
                      View Map
                      <ArrowRight size={12} />
                    </Link>
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
            {requests.map(r => (
              <div
                key={r.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{getRequestLabel(r.territoryId)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.requestedAt).toLocaleDateString()}</p>
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
              onClick={() => setShowPast(p => !p)}
              className="flex items-center justify-between w-full px-1 py-1 text-xs text-muted-foreground uppercase tracking-wide font-medium"
            >
              Past Assignments ({myPast.length})
              {showPast ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showPast && (
              <div className="space-y-2">
                {myPast.map(t => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">#{t.number} {t.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <Badge variant="outline" className="text-xs capitalize">{t.status}</Badge>
                      <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                        <Link href={`/congregation/${congregationId}/territories/${t.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </ProtectedPage>
  );
}
