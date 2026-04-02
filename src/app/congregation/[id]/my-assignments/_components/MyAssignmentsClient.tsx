'use client';

import { ArrowRight, ChevronDown, ChevronUp, ClipboardList, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ProtectedPage } from '@/components/protected-page';
import { TerritoryRequestDialog } from '@/components/territory-request-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useCongregationTerritories,
  useCongregationTerritoryRequests,
} from '@/hooks';

interface Territory {
  id: string;
  number: string;
  name: string;
  status: string;
  publisherId?: string | null;
  notes?: string | null;
  householdsCount?: number;
}

interface TerritoryRequest {
  id: string;
  status: string;
  territoryId?: string | null;
  requestedAt: string;
}

const statusColors: Record<string, string> = {
  available: 'text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  assigned: 'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
  completed:
    'text-purple-700 border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400',
  archived: 'text-muted-foreground border-border bg-muted/30',
  pending: 'text-orange-700 border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400',
  approved: 'text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  rejected: 'text-red-700 border-red-200 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
};

export default function MyAssignmentsClient() {
  const params = useParams();
  const congregationId = params?.id as string;
  const { data: session } = useSession();
  const sessionUser = session?.user as { id?: string } | undefined;
  const [showPast, setShowPast] = useState(false);

  const { data: territoriesData, isLoading: territoriesLoading, mutate: mutateTerritories } =
    useCongregationTerritories(congregationId);
  const territories = territoriesData as Territory[];

  const { data: requestsData, isLoading: requestsLoading, mutate: mutateRequests } =
    useCongregationTerritoryRequests(congregationId, 'pending');
  const requests = requestsData as TerritoryRequest[];

  const loading = territoriesLoading || requestsLoading;

  const reload = async () => {
    await Promise.all([mutateTerritories(), mutateRequests()]);
  };

  const myActive = territories.filter(
    (t) => t.status === 'assigned' && t.publisherId === sessionUser?.id
  );
  const myPast = territories.filter(
    (t) =>
      (t.status === 'completed' || t.status === 'archived') &&
      t.publisherId === sessionUser?.id
  );

  function getRequestLabel(territoryId?: string | null): string {
    if (!territoryId) return 'Any available territory';
    const t = territories.find((t) => t.id === territoryId);
    return t ? `#${t.number} ${t.name}` : 'Specific territory requested';
  }

  return (
    <ProtectedPage congregationId={congregationId}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Assignments</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your active and past territory assignments
            </p>
          </div>
          <TerritoryRequestDialog
            congregationId={congregationId}
            onSuccess={reload}
            trigger={
              <Button size="sm">
                <ClipboardList size={14} />
                Request a Territory
              </Button>
            }
          />
        </div>

        {/* Active Assignments */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin size={16} className="text-blue-500" />
              Active Assignments
              {!loading && (
                <Badge variant="outline" className="ml-1 text-xs">
                  {myActive.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : myActive.length === 0 ? (
              <div className="text-center py-8">
                <MapPin size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No territories currently assigned to you
                </p>
                <TerritoryRequestDialog
                  congregationId={congregationId}
                  onSuccess={reload}
                  trigger={
                    <Button size="sm" variant="outline" className="mt-3">
                      Request a Territory
                    </Button>
                  }
                />
              </div>
            ) : (
              myActive.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      #{t.number} {t.name}
                    </p>
                    {t.notes && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{t.notes}</p>
                    )}
                    {t.householdsCount !== undefined && t.householdsCount > 0 && (
                      <p className="text-xs text-muted-foreground">{t.householdsCount} households</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <Badge variant="outline" className={statusColors.assigned}>
                      assigned
                    </Badge>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/congregation/${congregationId}/territories/${t.id}`}>
                        View
                        <ArrowRight size={12} />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pending Requests */}
        {!loading && requests.length > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList size={16} className="text-orange-500" />
                Pending Requests
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 ml-1">
                  {requests.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-orange-100 dark:border-orange-900/20 bg-orange-50/50 dark:bg-orange-900/10"
                >
                  <div>
                    <p className="text-sm font-medium">{getRequestLabel(r.territoryId)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusColors.pending}>
                    pending
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Past Assignments */}
        {!loading && myPast.length > 0 && (
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin size={16} className="text-muted-foreground" />
                Past Assignments
                <Badge variant="outline" className="ml-1 text-xs">
                  {myPast.length}
                </Badge>
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPast((p) => !p)}
              >
                {showPast ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showPast ? 'Hide' : 'Show'}
              </Button>
            </CardHeader>
            {showPast && (
              <CardContent className="space-y-2">
                {myPast.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        #{t.number} {t.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={statusColors[t.status] ?? ''}>
                        {t.status}
                      </Badge>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/congregation/${congregationId}/territories/${t.id}`}>
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </ProtectedPage>
  );
}
