'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CoverageChart } from '@/components/coverage-chart';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { MapPin, Users, Activity, RotateCcw } from 'lucide-react';

type CoverageData = {
  total: number;
  avgCoverage: number;
  byStatus: Record<string, number>;
  coverageByTerritory: {
    id: string;
    number: string;
    name: string;
    coveragePercent: number;
    status: string;
  }[];
};

type ActivityItem = {
  id: string;
  type: string;
  status: string;
  territoryName?: string;
  territoryNumber?: string;
  userName?: string;
  visitsMade: number;
  coverageAchieved: number;
  updatedAt: string;
};

type Assignment = {
  id: string;
  status: string;
  territory?: { number: string; name: string };
  user?: { name: string };
  serviceGroup?: { name: string };
  assignedAt: string;
};

const statusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-800 border-green-200',
  assigned: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-purple-100 text-purple-800 border-purple-200',
  archived: 'bg-gray-100 text-gray-600 border-gray-200',
};

async function apiFetch<T>(url: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = (await res.json()) as { success: boolean; data: T };
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem('token') ?? '';
      const congregationId = localStorage.getItem('congregationId') ?? '';
      const qs = `?congregationId=${congregationId}`;

      const [coverageData, activityData, assignmentData] = await Promise.all([
        apiFetch<CoverageData>(`/api/dashboard/coverage${qs}`, token),
        apiFetch<{ activity: ActivityItem[] }>(`/api/dashboard/activity${qs}&limit=10`, token),
        apiFetch<Assignment[]>(`/api/dashboard/assignments${qs}&limit=10`, token),
      ]);

      if (coverageData) setCoverage(coverageData);
      if (activityData) setActivity(activityData.activity);
      if (assignmentData) setAssignments(assignmentData);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Service Overseer Dashboard</h1>
        <Button asChild size="sm" variant="outline">
          <Link href="/territories">
            <MapPin className="h-4 w-4 mr-1" />
            All Territories
          </Link>
        </Button>
      </div>

      {/* Stats row */}
      {!loading && coverage && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border border-gray-100">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-800">{coverage.total}</p>
              <p className="text-xs text-gray-400">territories</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-100">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">Avg Coverage</p>
              <p className="text-2xl font-bold text-blue-600">{coverage.avgCoverage}%</p>
            </CardContent>
          </Card>
          <Card className="border border-green-100 bg-green-50">
            <CardContent className="p-4">
              <p className="text-xs text-green-600">Available</p>
              <p className="text-2xl font-bold text-green-700">
                {coverage.byStatus.available ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-blue-100 bg-blue-50">
            <CardContent className="p-4">
              <p className="text-xs text-blue-600">Assigned</p>
              <p className="text-2xl font-bold text-blue-700">{coverage.byStatus.assigned ?? 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coverage by territory */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              Coverage by Territory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-72 overflow-y-auto">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (coverage?.coverageByTerritory ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">No territories found</p>
            ) : (
              (coverage?.coverageByTerritory ?? []).map((t) => (
                <div key={t.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <Link href={`/territories/${t.id}`} className="font-medium hover:underline">
                      #{t.number} {t.name}
                    </Link>
                    <Badge className={`border ${statusColors[t.status] ?? ''}`} variant="outline">
                      {t.status}
                    </Badge>
                  </div>
                  <CoverageChart percent={t.coveragePercent} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Active assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              Active Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : assignments.length === 0 ? (
              <p className="text-sm text-gray-400">No active assignments</p>
            ) : (
              assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between text-sm border border-gray-100 rounded-lg p-2"
                >
                  <div>
                    <p className="font-medium">
                      #{a.territory?.number} {a.territory?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {a.user?.name ?? a.serviceGroup?.name ?? '—'} ·{' '}
                      {new Date(a.assignedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-500" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="text-sm text-gray-400">No recent activity</p>
          ) : (
            activity.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-3.5 w-3.5 text-gray-400" />
                  <span>
                    <span className="font-medium">
                      #{item.territoryNumber} {item.territoryName}
                    </span>{' '}
                    — {item.userName ?? 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{item.visitsMade} visits</span>
                  <Badge
                    className={`border text-xs ${statusColors[item.status] ?? ''}`}
                    variant="outline"
                  >
                    {item.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}
