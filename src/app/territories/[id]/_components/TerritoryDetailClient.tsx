'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CoverageChart } from '@/components/coverage-chart';
import { ArrowLeft, Pencil, Save, X } from 'lucide-react';
import Link from 'next/link';

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

const statusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-800 border-green-200',
  assigned: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-purple-100 text-purple-800 border-purple-200',
  archived: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function TerritoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const _router = useRouter();
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(searchParams.get('edit') === 'true');
  const [form, setForm] = useState({ name: '', number: '', notes: '', householdsCount: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/territories/${id}`, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      const data = (await res.json()) as { success: boolean; data: Territory };
      if (data.success) {
        setTerritory(data.data);
        setForm({
          name: data.data.name,
          number: data.data.number,
          notes: data.data.notes ?? '',
          householdsCount: String(data.data.householdsCount),
        });
      } else {
        setError('Territory not found');
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
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/territories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token ?? ''}`,
        },
        body: JSON.stringify({
          name: form.name,
          number: form.number,
          notes: form.notes || undefined,
          householdsCount: Number(form.householdsCount),
        }),
      });
      const data = (await res.json()) as {
        success: boolean;
        data: Territory;
        error?: { message: string };
      };
      if (data.success) {
        setTerritory(data.data);
        setEditing(false);
      } else {
        setError(data.error?.message ?? 'Failed to save');
      }
    } catch {
      setError('Network error');
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <CoverageChart percent={territory.coveragePercent} label="Overall Coverage" />
        </CardContent>
      </Card>

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
