'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BarChart2, Users, Activity, UserPlus, RotateCcw, MapPin } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface CoverageData {
  totalTerritories: number;
  avgCoveragePercent: number;
  byStatus: { available: number; assigned: number; completed: number; archived: number };
  territories: Array<{
    id: string;
    number: string;
    name: string;
    status: string;
    coveragePercent: number;
    publisherName?: string;
  }>;
}

interface PublishersData {
  publishers: Array<{
    userId: string;
    name: string;
    email: string;
    activeAssignments: number;
    totalCompleted: number;
    territories: string[];
  }>;
}

interface ActivityData {
  assignments: Array<{
    id: string;
    territoryName: string;
    territoryNumber: string;
    publisherName: string;
    assignedAt: string;
  }>;
  returns: Array<{
    id: string;
    territoryName: string;
    territoryNumber: string;
    publisherName: string;
    returnedAt: string;
    coverageAtAssignment: number;
  }>;
}

type Tab = 'coverage' | 'publishers' | 'activity';

function coverageColor(pct: number) {
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ReportsClient({ congregationId }: { congregationId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') as Tab) ?? 'coverage';

  const setTab = useCallback((newTab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [publishers, setPublishers] = useState<PublishersData | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setLoading(true);

    const base = `/api/congregations/${congregationId}/reports`;

    if (tab === 'coverage' && !coverage) {
      fetchWithAuth<{ data: CoverageData }>(`${base}/coverage`)
        .then((json) => setCoverage(json.data))
        .catch(() => setError('Failed to load coverage data'))
        .finally(() => setLoading(false));
    } else if (tab === 'publishers' && !publishers) {
      fetchWithAuth<{ data: PublishersData }>(`${base}/publishers`)
        .then((json) => setPublishers(json.data))
        .catch(() => setError('Failed to load publishers data'))
        .finally(() => setLoading(false));
    } else if (tab === 'activity' && !activity) {
      fetchWithAuth<{ data: ActivityData }>(`${base}/activity`)
        .then((json) => setActivity(json.data))
        .catch(() => setError('Failed to load activity data'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [tab, congregationId, coverage, publishers, activity]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'coverage', label: 'Coverage', icon: <BarChart2 size={15} /> },
    { id: 'publishers', label: 'Publishers', icon: <Users size={15} /> },
    { id: 'activity', label: 'Activity', icon: <Activity size={15} /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Territory coverage, publisher stats, and recent activity
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg font-medium transition-all',
              tab === t.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-accent/40'
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Coverage Tab */}
      {!loading && !error && tab === 'coverage' && coverage && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Territories', value: coverage.totalTerritories },
              { label: 'Avg Coverage', value: `${coverage.avgCoveragePercent}%` },
              { label: 'Assigned', value: coverage.byStatus.assigned },
              { label: 'Available', value: coverage.byStatus.available },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1"
              >
                <span className="text-xs text-muted-foreground">{card.label}</span>
                <span className="text-2xl font-bold text-foreground">{card.value}</span>
              </div>
            ))}
          </div>

          {/* Territory coverage bars */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">
                Territory Coverage (sorted lowest first)
              </h2>
            </div>
            <div className="divide-y divide-border">
              {[...coverage.territories]
                .sort((a, b) => a.coveragePercent - b.coveragePercent)
                .map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-32 shrink-0">
                      <span className="text-xs font-medium text-foreground">
                        {t.number} — {t.name}
                      </span>
                    </div>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', coverageColor(t.coveragePercent))}
                        style={{ width: `${Math.min(100, t.coveragePercent)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-medium text-foreground shrink-0">
                      {t.coveragePercent}%
                    </span>
                  </div>
                ))}
              {coverage.territories.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No territories found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Publishers Tab */}
      {!loading && !error && tab === 'publishers' && publishers && (
        <div className="rounded-xl border border-border bg-card w-full max-w-full overflow-x-auto">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Publisher Assignments</h2>
          </div>
          <div>
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="text-center px-4 py-2 text-xs font-medium text-muted-foreground">
                    Active
                  </th>
                  <th className="text-center px-4 py-2 text-xs font-medium text-muted-foreground">
                    Completed
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">
                    Current Territories
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {publishers.publishers.map((p) => (
                  <tr
                    key={p.userId}
                    className={cn(
                      'transition-colors hover:bg-muted/30',
                      p.activeAssignments === 0 && 'opacity-50'
                    )}
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">{p.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.email}</td>
                    <td className="px-4 py-2.5 text-center">{p.activeAssignments}</td>
                    <td className="px-4 py-2.5 text-center">{p.totalCompleted}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {p.territories.length > 0 ? p.territories.join(', ') : '—'}
                    </td>
                  </tr>
                ))}
                {publishers.publishers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No active members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {!loading && !error && tab === 'activity' && activity && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Recent Activity (Last 30 Days)</h2>
          </div>
          {activity.assignments.length === 0 && activity.returns.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <MapPin size={32} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No activity in the last 30 days.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {[
                ...activity.assignments.map((a) => ({
                  id: `assign-${a.id}`,
                  type: 'assign' as const,
                  territoryNumber: a.territoryNumber,
                  territoryName: a.territoryName,
                  publisherName: a.publisherName,
                  date: a.assignedAt,
                })),
                ...activity.returns.map((r) => ({
                  id: `return-${r.id}`,
                  type: 'return' as const,
                  territoryNumber: r.territoryNumber,
                  territoryName: r.territoryName,
                  publisherName: r.publisherName,
                  date: r.returnedAt ?? '',
                })),
              ]
                .filter((item) => item.date)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((item) => (
                  <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                    <div
                      className={cn(
                        'mt-0.5 p-1.5 rounded-full',
                        item.type === 'assign'
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      )}
                    >
                      {item.type === 'assign' ? (
                        <UserPlus size={13} />
                      ) : (
                        <RotateCcw size={13} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">
                          {item.territoryNumber} — {item.territoryName}
                        </span>{' '}
                        <span className="text-muted-foreground">
                          {item.type === 'assign' ? 'assigned to' : 'returned by'}{' '}
                          {item.publisherName}
                        </span>
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(item.date)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
