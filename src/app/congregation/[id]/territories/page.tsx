'use client';

import { CheckCircle, Clock, MapPin, Plus, Search } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import { StatCard } from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchWithAuth } from '@/lib/api-client';

interface Territory {
  id: string;
  number: string;
  name: string;
  status: string;
  notes?: string;
  publisher?: { name: string };
  group?: { name: string };
}

interface TerritoryRequest {
  id: string;
  status: string;
  publisher?: { name: string };
  approver?: { name: string };
  requestedAt: string;
}

const statusColors: Record<string, string> = {
  available: 'text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  assigned: 'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
  completed:
    'text-purple-700 border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400',
  archived: 'text-muted-foreground border-border bg-muted/30',
};

export default function CongregationTerritoriesPage() {
  const params = useParams();
  const congregationId = params?.id as string;

  const [territories, setTerritories] = useState<Territory[]>([]);
  const [requests, setRequests] = useState<TerritoryRequest[]>([]);
  const [filtered, setFiltered] = useState<Territory[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'territories' | 'requests'>('territories');

  // Create territory dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createNumber, setCreateNumber] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchData = useCallback(async () => {
    const [tJson, rJson] = await Promise.all([
      fetchWithAuth(`/api/congregations/${congregationId}/territories`),
      fetchWithAuth(`/api/congregations/${congregationId}/territory-requests?status=pending`),
    ]);
    if (tJson.data) setTerritories(tJson.data);
    if (rJson.data) setRequests(rJson.data);
    setLoading(false);
  }, [congregationId]);

  useEffect(() => {
    if (congregationId) fetchData().catch(() => setLoading(false));
  }, [congregationId, fetchData]);

  useEffect(() => {
    let list = territories;
    if (statusFilter !== 'all') {
      list = list.filter((t) => t.status === statusFilter);
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(s) ||
          t.number.toLowerCase().includes(s) ||
          t.publisher?.name?.toLowerCase().includes(s)
      );
    }
    setFiltered(list);
  }, [search, statusFilter, territories]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    try {
      await fetchWithAuth(`/api/congregations/${congregationId}/territories`, {
        method: 'POST',
        body: JSON.stringify({
          name: createName,
          number: createNumber || createName,
          notes: createNotes || undefined,
        }),
      });
      setCreateOpen(false);
      setCreateName('');
      setCreateNumber('');
      setCreateNotes('');
      await fetchData();
    } catch {
      setCreateError('Network error');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleApproveRequest(requestId: string) {
    await fetchWithAuth(`/api/congregations/${congregationId}/territory-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'approved' }),
    });
    await fetchData();
  }

  async function handleRejectRequest(requestId: string) {
    await fetchWithAuth(`/api/congregations/${congregationId}/territory-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'rejected' }),
    });
    await fetchData();
  }

  const availableCount = territories.filter((t) => t.status === 'available').length;
  const assignedCount = territories.filter((t) => t.status === 'assigned').length;
  const completedCount = territories.filter((t) => t.status === 'completed').length;

  return (
    <ProtectedPage congregationId={congregationId}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Territories</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage territories and assignment requests
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={14} />
            Add Territory
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Total" value={territories.length} color="blue" loading={loading} />
          <StatCard title="Available" value={availableCount} color="green" loading={loading} />
          <StatCard title="Assigned" value={assignedCount} color="purple" loading={loading} />
          <StatCard
            title="Pending Requests"
            value={requests.length}
            color={requests.length > 0 ? 'orange' : 'default'}
            loading={loading}
          />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'territories'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setTab('territories')}
          >
            Territories ({territories.length})
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === 'requests'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setTab('requests')}
          >
            Requests
            {requests.length > 0 && (
              <span className="bg-orange-500 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center">
                {requests.length}
              </span>
            )}
          </button>
        </div>

        {tab === 'territories' && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="Search territories…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-1">
                {['all', 'available', 'assigned', 'completed'].map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 text-xs rounded-xl border transition-colors capitalize ${
                      statusFilter === s
                        ? 'bg-primary text-white border-primary'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-16">
                    <MapPin size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {search || statusFilter !== 'all'
                        ? 'No territories match your filter'
                        : 'No territories yet'}
                    </p>
                    {!search && statusFilter === 'all' && (
                      <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                        <Plus size={14} />
                        Add Territory
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Territory
                          </th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Status
                          </th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Assigned To
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filtered.map((t) => (
                          <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                                  <MapPin
                                    size={14}
                                    className="text-green-600 dark:text-green-400"
                                  />
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">
                                    #{t.number} {t.name}
                                  </p>
                                  {t.notes && (
                                    <p className="text-xs text-muted-foreground">{t.notes}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className={statusColors[t.status] ?? ''}>
                                {t.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground text-xs">
                              {t.publisher?.name ?? t.group?.name ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {tab === 'requests' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock size={16} className="text-orange-500" />
                Pending Territory Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle size={36} className="mx-auto text-green-400 mb-3" />
                  <p className="text-sm text-muted-foreground">No pending requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-orange-100 dark:border-orange-900/20 bg-orange-50/50 dark:bg-orange-900/10"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {r.publisher?.name ?? 'Unknown'} requested a territory
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.requestedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => handleRejectRequest(r.id)}
                        >
                          Reject
                        </Button>
                        <Button size="sm" onClick={() => handleApproveRequest(r.id)}>
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create territory dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Territory</DialogTitle>
            <DialogDescription>Create a new territory for this congregation.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            {createError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                {createError}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="t-number">Number</Label>
                <Input
                  id="t-number"
                  value={createNumber}
                  onChange={(e) => setCreateNumber(e.target.value)}
                  placeholder="e.g. T-01"
                  disabled={createLoading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-name">Name *</Label>
                <Input
                  id="t-name"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. North District"
                  disabled={createLoading}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-notes">Notes</Label>
              <Input
                id="t-notes"
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                placeholder="Optional notes…"
                disabled={createLoading}
              />
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLoading}>
                {createLoading ? 'Creating…' : 'Add Territory'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ProtectedPage>
  );
}
