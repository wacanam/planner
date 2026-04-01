'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AssignmentForm } from '@/components/assignment-form';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type Assignment = {
  id: string;
  status: string;
  assignedAt: string;
  dueAt?: string;
  notes?: string;
  user?: { name: string; email: string };
  serviceGroup?: { name: string };
};

const statusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-purple-100 text-purple-800 border-purple-200',
  returned: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function AssignmentsPage() {
  const { id } = useParams<{ id: string }>();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId') ?? 'me';
      const res = await fetch(`/api/assignments/by-user/${userId}`, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      const data = (await res.json()) as { success: boolean; data: Assignment[] };
      if (data.success) {
        const filtered = data.data.filter(
          (a: Assignment & { territoryId?: string }) => a.territoryId === id
        );
        setAssignments(filtered);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    load();
  }, [id]);

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/territories/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-gray-800">Assignments</h1>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'New Assignment'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assign Territory</CardTitle>
          </CardHeader>
          <CardContent>
            <AssignmentForm
              territoryId={id}
              onSuccess={() => {
                setShowForm(false);
                load();
              }}
            />
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">No assignments yet.</p>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <Card key={a.id} className="border border-gray-100">
              <CardContent className="py-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium text-sm">
                    {a.user?.name ?? a.serviceGroup?.name ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Assigned {new Date(a.assignedAt).toLocaleDateString()}
                    {a.dueAt && ` · Due ${new Date(a.dueAt).toLocaleDateString()}`}
                  </p>
                  {a.notes && <p className="text-xs text-gray-400">{a.notes}</p>}
                </div>
                <Badge
                  className={`border text-xs ${statusColors[a.status] ?? ''}`}
                  variant="outline"
                >
                  {a.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
