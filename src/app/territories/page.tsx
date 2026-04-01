'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TerritoryCard, type TerritoryCardData } from '@/components/territory-card';
import Link from 'next/link';
import { Plus, RefreshCw } from 'lucide-react';
import { ApiErrorResponse } from '@/lib/api-response';

type PaginatedResponse<T> = {
  success: boolean;
  data: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
};

export default function TerritoriesPage() {
  const [territories, setTerritories] = useState<TerritoryCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  async function load(p = 1) {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const congregationId = localStorage.getItem('congregationId') ?? '';
      const res = await fetch(
        `/api/territories?congregationId=${congregationId}&page=${p}&limit=20`,
        { headers: { Authorization: `Bearer ${token ?? ''}` } }
      );
      const json = (await res.json()) as PaginatedResponse<TerritoryCardData> | ApiErrorResponse;
      if (json.success) {
        setTerritories(json.data);
        setTotalPages(json.pagination.totalPages || 1);
        setPage(p);
      } else {
        if ("error" in json) setError(json.error.message || 'Failed to load territories');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }
  async function handleDelete(id: string) {
    if (!confirm('Delete this territory? This cannot be undone.')) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/territories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token ?? ''}` },
    });
    load(page);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    load(1);
  }, []);

  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Territories</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load(page)} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button asChild size="sm">
            <Link href="/territories/new">
              <Plus className="h-4 w-4 mr-1" />
              New Territory
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : territories.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">No territories yet.</p>
          <Button asChild className="mt-4">
            <Link href="/territories/new">Create your first territory</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {territories.map((t) => (
            <TerritoryCard key={t.id} territory={t} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(page - 1)}
            disabled={page <= 1 || loading}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600 self-center">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(page + 1)}
            disabled={page >= totalPages || loading}
          >
            Next
          </Button>
        </div>
      )}
    </main>
  );
}
