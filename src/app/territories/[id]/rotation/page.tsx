'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CoverageChart } from '@/components/coverage-chart';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import Link from 'next/link';

type Rotation = {
  id: string;
  status: string;
  startDate: string;
  completedDate?: string;
  visitsMade: number;
  coverageAchieved: number;
  notes?: string;
  assignedUser?: { name: string };
};

const statusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function RotationPage() {
  const { id } = useParams<{ id: string }>();
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rotations?territoryId=${id}`, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      const data = (await res.json()) as { success: boolean; data: Rotation[] };
      if (data.success) setRotations(data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function startRotation() {
    setStarting(true);
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/rotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token ?? ''}`,
        },
        body: JSON.stringify({ territoryId: id }),
      });
      load();
    } catch {
      // ignore
    } finally {
      setStarting(false);
    }
  }

  async function completeRotation(rotationId: string) {
    const token = localStorage.getItem('token');
    await fetch(`/api/rotations/${rotationId}/complete`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? ''}`,
      },
      body: JSON.stringify({ coverageAchieved: 100 }),
    });
    load();
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    load();
  }, [id]);

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/territories/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-gray-800">Territory Rotations</h1>
        </div>
        <Button size="sm" onClick={startRotation} disabled={starting}>
          <RotateCcw className="h-4 w-4 mr-1" />
          {starting ? 'Starting...' : 'Start Rotation'}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : rotations.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">No rotations yet.</p>
      ) : (
        <div className="space-y-3">
          {rotations.map((r) => (
            <Card key={r.id} className="border border-gray-100">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">
                    {r.assignedUser?.name ?? 'Unassigned'} ·{' '}
                    {new Date(r.startDate).toLocaleDateString()}
                  </CardTitle>
                  <Badge
                    className={`border text-xs ${statusColors[r.status] ?? ''}`}
                    variant="outline"
                  >
                    {r.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <CoverageChart percent={Number(r.coverageAchieved)} />
                <p className="text-xs text-gray-500">Visits made: {r.visitsMade}</p>
                {r.notes && <p className="text-xs text-gray-400">{r.notes}</p>}
                {r.status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-700 border-green-200 hover:bg-green-50"
                    onClick={() => completeRotation(r.id)}
                  >
                    Mark Complete
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
