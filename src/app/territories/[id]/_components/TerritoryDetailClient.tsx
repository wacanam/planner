'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CoverageChart } from '@/components/coverage-chart';
import { ArrowLeft, Pencil, Save, X, User, Users, History } from 'lucide-react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/api-client';

type Territory = {
  id: string;
  number: string;
  name: string;
  status: string;
  householdsCount: number;
  coveragePercent: number;
  notes?: string;
  createdAt: string;
};

type Assignment = {
  id: string;
  status: string;
  assignedAt: string | null;
  dueAt: string | null;
  returnedAt: string | null;
  notes: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  groupName: string | null;
};

const statusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-800 border-green-200',
  assigned: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-purple-100 text-purple-800 border-purple-200',
  archived: 'bg-gray-100 text-gray-600 border-gray-200',
};

const assignmentStatusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-purple-100 text-purple-800 border-purple-200',
  returned: 'bg-gray-100 text-gray-600 border-gray-200',
};

function getAssigneeDisplayName(a: Assignment): string {
  return a.assigneeName ?? a.groupName ?? 'Unknown';
}

export default function TerritoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(searchParams.get('edit') === 'true');
  const [form, setForm] = useState({ name: '', number: '', notes: '', householdsCount: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [territoryData, assignmentsData] = await Promise.all([
        fetchWithAuth<{ success: boolean; data: Territory; error?: { message: string } }>(
          `/api/territories/${id}`
        ),
        fetchWithAuth<{ success: boolean; data: Assignment[] }>(
          `/api/territories/${id}/assignments`
        ).catch(() => ({ success: false, data: [] as Assignment[] })),
      ]);

      if (territoryData.success && territoryData.data) {
        setTerritory(territoryData.data);
        setForm({
          name: territoryData.data.name,
          number: territoryData.data.number,
          notes: territoryData.data.notes ?? '',
          householdsCount: String(territoryData.data.householdsCount),
        });
      } else {
        setError('Territory not found');
      }

      if (assignmentsData.success && assignmentsData.data) {
        setAssignments(assignmentsData.data);
      }
    } catch {
      setError('Failed to load territory');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data = await fetchWithAuth<{
        success: boolean;
        data: Territory;
        error?: { message: string };
      }>(`/api/territories/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name,
          number: form.number,
          notes: form.notes || undefined,
          householdsCount: Number(form.householdsCount),
        }),
      });
      if (data.success) {
        setTerritory(data.data);
        setEditing(false);
      } else {
        setError(data.error?.message ?? 'Failed to save');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSaving(false);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    load();
  }, [id]);

  if (loading) return <div className="p-6 text-gray-500 animate-pulse">Loading...</div>;
  if (error || !territory)
    return (
      <div className="p-6 text-red-600">
        {error || 'Not found'}
        <Button asChild variant="link" className="ml-2">
          <Link href="/territories">Back to territories</Link>
        </Button>
      </div>
    );

  const activeAssignment = assignments.find((a) => a.status === 'active');
  const historyAssignments = assignments.filter((a) => a.status !== 'active');

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/territories">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-gray-800">
            #{territory.number} — {territory.name}
          </h1>
          <Badge
            className={`border text-xs ${statusColors[territory.status] ?? ''}`}
            variant="outline"
          >
            {territory.status}
          </Badge>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Number</Label>
                <Input
                  value={form.number}
                  onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Households</Label>
                <Input
                  type="number"
                  value={form.householdsCount}
                  onChange={(e) => setForm((f) => ({ ...f, householdsCount: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving} size="sm">
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500">Households</dt>
                <dd className="font-medium">{territory.householdsCount}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="font-medium">
                  {new Date(territory.createdAt).toLocaleDateString()}
                </dd>
              </div>
              {territory.notes && (
                <div className="col-span-2">
                  <dt className="text-gray-500">Notes</dt>
                  <dd>{territory.notes}</dd>
                </div>
              )}
            </dl>
          )}
        </CardContent>
      </Card>

      {/* Current Assignment */}
      {activeAssignment && (
        <Card className="border-blue-200 dark:border-blue-900/40">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {activeAssignment.groupName ? (
                <Users className="h-4 w-4 text-blue-500" />
              ) : (
                <User className="h-4 w-4 text-blue-500" />
              )}
              Current Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500">
                  {activeAssignment.groupName ? 'Assigned Group' : 'Assigned To'}
                </dt>
                <dd className="font-medium">{getAssigneeDisplayName(activeAssignment)}</dd>
              </div>
              {activeAssignment.assignedAt && (
                <div>
                  <dt className="text-gray-500">Assigned At</dt>
                  <dd className="font-medium">
                    {new Date(activeAssignment.assignedAt).toLocaleDateString()}
                  </dd>
                </div>
              )}
              {activeAssignment.dueAt && (
                <div>
                  <dt className="text-gray-500">Due Date</dt>
                  <dd className="font-medium">
                    {new Date(activeAssignment.dueAt).toLocaleDateString()}
                  </dd>
                </div>
              )}
              {activeAssignment.notes && (
                <div className="col-span-2">
                  <dt className="text-gray-500">Notes</dt>
                  <dd>{activeAssignment.notes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <CoverageChart percent={territory.coveragePercent} label="Overall Coverage" />
        </CardContent>
      </Card>

      {/* Assignment History */}
      {historyAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              Assignment History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {historyAssignments.map((a) => (
              <div
                key={a.id}
                className="flex items-start justify-between p-3 rounded-xl border border-border text-sm"
              >
                <div className="space-y-0.5">
                  <p className="font-medium">{getAssigneeDisplayName(a)}</p>
                  {a.assignedAt && (
                    <p className="text-xs text-muted-foreground">
                      Assigned: {new Date(a.assignedAt).toLocaleDateString()}
                      {a.returnedAt && (
                        <> · Returned: {new Date(a.returnedAt).toLocaleDateString()}</>
                      )}
                    </p>
                  )}
                  {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs capitalize ${assignmentStatusColors[a.status] ?? ''}`}
                >
                  {a.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={`/territories/${id}/assignments`}>Manage Assignments</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/territories/${id}/rotation`}>View Rotations</Link>
        </Button>
      </div>
    </main>
  );
}
