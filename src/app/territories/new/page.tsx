'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewTerritoryPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', number: '', notes: '', householdsCount: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.number.trim()) {
      setError('Name and number are required');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const congregationId = localStorage.getItem('congregationId') ?? '';
      const res = await fetch('/api/territories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token ?? ''}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          number: form.number.trim(),
          notes: form.notes || undefined,
          householdsCount: form.householdsCount ? Number(form.householdsCount) : 0,
          congregationId,
        }),
      });
      const data = (await res.json()) as { success: boolean; error?: { message: string } };
      if (data.success) {
        router.push('/territories');
      } else {
        setError(data.error?.message ?? 'Failed to create territory');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-lg mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/territories">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-gray-800">New Territory</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Territory Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="bg-red-50 border-red-200 text-red-700 text-sm p-3">{error}</Alert>
            )}

            <div className="space-y-1">
              <Label htmlFor="number">Territory Number *</Label>
              <Input
                id="number"
                placeholder="e.g. T-001"
                value={form.number}
                onChange={(e) => update('number', e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="name">Territory Name *</Label>
              <Input
                id="name"
                placeholder="e.g. North District"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="households">Households Count</Label>
              <Input
                id="households"
                type="number"
                min="0"
                placeholder="0"
                value={form.householdsCount}
                onChange={(e) => update('householdsCount', e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Any notes about this territory..."
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Create Territory'}
              </Button>
              <Button asChild variant="outline" type="button">
                <Link href="/territories">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
