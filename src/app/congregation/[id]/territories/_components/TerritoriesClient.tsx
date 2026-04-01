'use client';

import { CheckCircle, Clock, MapPin, Plus, Search, UserPlus, RotateCcw } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
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
import { CongregationRole, UserRole } from '@/db';

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
  territoryId?: string | null;
  status: string;
  message?: string | null;
  publisher?: { name: string } | null;
  approver?: { name: string };
  requestedAt: string;
}

interface Member {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
  congregationRole?: string | null;
  status: string;
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
  const { data: session } = useSession();

  const sessionUser = session?.user as
    | { id?: string; role?: string; congregationId?: string }
    | undefined;

  const [myRole, setMyRole] = useState<string | null>(null);
  const isOverseer =
    myRole === CongregationRole.SERVICE_OVERSEER ||
    sessionUser?.role === UserRole.SUPER_ADMIN ||
    sessionUser?.role === UserRole.ADMIN;

  const [territories, setTerritories] = useState<Territory[]>([]);
  const [requests, setRequests] = useState<TerritoryRequest[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
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

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTerritory, setAssignTerritory] = useState<Territory | null>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignDueAt, setAssignDueAt] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  // Return dialog
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnTerritory, setReturnTerritory] = useState<Territory | null>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnError, setReturnError] = useState('');

  // Request dialog
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestTargetTerritory, setRequestTargetTerritory] = useState<Territory | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  // Approve/Reject confirmation dialog
  const [confirmRequest, setConfirmRequest] = useState<TerritoryRequest | null>(null);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [confirmResponseMessage, setConfirmResponseMessage] = useState('');

  const fetchData = useCallback(async () => {
    const [tJson, rJson, mJson] = await Promise.all([
      fetchWithAuth<{ data: Territory[] }>(`/api/congregations/${congregationId}/territories`),
      fetchWithAuth<{ data: TerritoryRequest[] }>(`/api/congregations/${congregationId}/territory-requests?status=pending`),
      fetchWithAuth<{ data: Member[] }>(`/api/congregations/${congregationId}/members`),
    ]);
    if (tJson.data) setTerritories(tJson.data);
    if (rJson.data) setRequests(rJson.data);
    if (mJson.data) {
      setMembers(mJson.data);
      // Detect own congregation role
      if (sessionUser?.id) {
        const me = mJson.data.find((m) => m.userId === sessionUser.id || m.user?.id === sessionUser.id);
        if (me?.congregationRole) setMyRole(me.congregationRole);
      }
    }
    setLoading(false);
  }, [congregationId, sessionUser?.id]);

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

  function openConfirmDialog(request: TerritoryRequest, action: 'approve' | 'reject') {
    setConfirmRequest(request);
    setConfirmAction(action);
    setConfirmError('');
    setConfirmResponseMessage('');
  }

  function closeConfirmDialog() {
    setConfirmRequest(null);
    setConfirmAction(null);
    setConfirmError('');
    setConfirmResponseMessage('');
  }

  async function handleConfirmAction() {
    if (!confirmRequest || !confirmAction) return;
    if (confirmAction === 'reject' && !confirmResponseMessage.trim()) {
      setConfirmError('A reason is required when rejecting a request.');
      return;
    }
    setConfirmLoading(true);
    setConfirmError('');
    try {
      await fetchWithAuth(
        `/api/congregations/${congregationId}/territory-requests/${confirmRequest.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: confirmAction === 'approve' ? 'approved' : 'rejected',
            responseMessage: confirmResponseMessage.trim() || null,
          }),
        }
      );
      closeConfirmDialog();
      await fetchData();
    } catch {
      setConfirmError('Failed to process request. Please try again.');
    } finally {
      setConfirmLoading(false);
    }
  }

  function openAssignDialog(territory: Territory) {
    setAssignTerritory(territory);
    setAssignUserId('');
    setAssignDueAt('');
    setAssignNotes('');
    setAssignError('');
    setAssignSuccess('');
    setMemberSearch('');
    setAssignOpen(true);
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignTerritory || !assignUserId) {
      setAssignError('Please select a publisher');
      return;
    }
    setAssignLoading(true);
    setAssignError('');
    try {
      await fetchWithAuth('/api/assignments', {
        method: 'POST',
        body: JSON.stringify({
          territoryId: assignTerritory.id,
          userId: assignUserId,
          dueAt: assignDueAt || undefined,
          notes: assignNotes || undefined,
        }),
      });
      setAssignSuccess(`Territory assigned successfully!`);
      setTimeout(() => {
        setAssignOpen(false);
        setAssignSuccess('');
      }, 1200);
      await fetchData();
    } catch {
      setAssignError('Failed to assign territory');
    } finally {
      setAssignLoading(false);
    }
  }

  function openReturnDialog(territory: Territory) {
    setReturnTerritory(territory);
    setReturnNotes('');
    setReturnError('');
    setReturnOpen(true);
  }

  async function handleReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!returnTerritory) return;
    setReturnLoading(true);
    setReturnError('');
    try {
      // Find the active assignment for this territory
      const aJson = await fetchWithAuth<{ data: { id: string; status: string }[] }>(
        `/api/territories/${returnTerritory.id}/assignments`
      );
      const activeAssignment = aJson.data?.find((a) => a.status === 'active');
      if (!activeAssignment) {
        setReturnError('No active assignment found');
        setReturnLoading(false);
        return;
      }
      await fetchWithAuth(`/api/assignments/${activeAssignment.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'returned', notes: returnNotes || undefined }),
      });
      setReturnOpen(false);
      await fetchData();
    } catch {
      setReturnError('Failed to return territory');
    } finally {
      setReturnLoading(false);
    }
  }

  function openRequestDialog(territory: Territory) {
    setRequestTargetTerritory(territory);
    setRequestMessage('');
    setRequestError('');
    setRequestDialogOpen(true);
  }

  async function handleRequest() {
    if (!requestTargetTerritory) return;
    if (!requestMessage.trim()) {
      setRequestError('A message to the overseer is required.');
      return;
    }
    setRequestLoading(true);
    setRequestError('');
    try {
      await fetchWithAuth(`/api/congregations/${congregationId}/territory-requests`, {
        method: 'POST',
        body: JSON.stringify({
          territoryId: requestTargetTerritory.id,
          message: requestMessage.trim(),
        }),
      });
      setRequestDialogOpen(false);
      setRequestSuccess(requestTargetTerritory.id);
      setRequestTargetTerritory(null);
      setRequestMessage('');
      // Refresh requests list
      const rJson = await fetchWithAuth<{ data: TerritoryRequest[] }>(
        `/api/congregations/${congregationId}/territory-requests?status=pending`
      );
      if (rJson.data) setRequests(rJson.data);
      setTimeout(() => setRequestSuccess(null), 4000);
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Failed to send request. Please try again.');
    } finally {
      setRequestLoading(false);
    }
  }

  const availableCount = territories.filter((t) => t.status === 'available').length;
  const assignedCount = territories.filter((t) => t.status === 'assigned').length;
  const completedCount = territories.filter((t) => t.status === 'completed').length;

  const activeMembers = members.filter((m) => m.status === 'active');
  const filteredMembers = memberSearch
    ? activeMembers.filter(
        (m) =>
          m.user?.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
          m.user?.email?.toLowerCase().includes(memberSearch.toLowerCase())
      )
    : activeMembers;

  return (
    <ProtectedPage congregationId={congregationId}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 min-w-0 w-full">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Territories</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage territories and assignment requests
            </p>
          </div>
          {isOverseer && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              Add Territory
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Total" value={territories.length} color="blue" loading={loading} />
          <StatCard title="Available" value={availableCount} color="green" loading={loading} />
          <StatCard title="Assigned" value={assignedCount} color="purple" loading={loading} />
          <StatCard title="Completed" value={completedCount} color="default" loading={loading} />
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
          {isOverseer && (
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
          )}
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

            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-x-auto w-full max-w-full">
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
                  {!search && statusFilter === 'all' && isOverseer && (
                    <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                      <Plus size={14} />
                      Add Territory
                    </Button>
                  )}
                </div>
              ) : (
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
                      <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((t) => (
                      <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                              <MapPin size={14} className="text-green-600 dark:text-green-400" />
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
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Overseer: Assign button for available territories */}
                            {isOverseer && t.status === 'available' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                onClick={() => openAssignDialog(t)}
                              >
                                <UserPlus size={12} className="mr-1" />
                                Assign
                              </Button>
                            )}
                            {/* Overseer: Return button for assigned territories */}
                            {isOverseer && t.status === 'assigned' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                onClick={() => openReturnDialog(t)}
                              >
                                <RotateCcw size={12} className="mr-1" />
                                Return
                              </Button>
                            )}
                            {/* Publisher: Request button for available territories */}
                            {!isOverseer && t.status === 'available' && (() => {
                              const alreadyRequested = requests.some((r) => r.territoryId === t.id);
                              if (requestSuccess === t.id) {
                                return <span className="text-xs text-green-600 font-medium flex items-center gap-1">✓ Request sent!</span>;
                              }
                              if (alreadyRequested) {
                                return <span className="text-xs text-amber-600 font-medium">Pending</span>;
                              }
                              return (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openRequestDialog(t)}
                                >
                                  Request
                                </Button>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {tab === 'requests' && isOverseer && (
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
                      className="flex items-start justify-between p-4 rounded-xl border border-orange-100 dark:border-orange-900/20 bg-orange-50/50 dark:bg-orange-900/10 gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {r.publisher?.name ?? 'Unknown Publisher'}
                        </p>
                        <p className="text-sm text-muted-foreground">requested a territory</p>
                        {r.message && (
                          <p className="text-xs text-foreground mt-1 italic">"{r.message}"</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(r.requestedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => openConfirmDialog(r, 'reject')}
                        >
                          Reject
                        </Button>
                        <Button size="sm" onClick={() => openConfirmDialog(r, 'approve')}>
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

      {/* Assign Territory dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Territory</DialogTitle>
            <DialogDescription>
              Assign <strong>#{assignTerritory?.number} {assignTerritory?.name}</strong> to a publisher.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssign} className="space-y-4 mt-2">
            {assignError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                {assignError}
              </p>
            )}
            {assignSuccess && (
              <p className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-xl">
                {assignSuccess}
              </p>
            )}
            <div className="space-y-1.5">
              <Label>Publisher *</Label>
              <Input
                placeholder="Search publishers…"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
              <div className="max-h-40 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                {filteredMembers.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center">No members found</p>
                ) : (
                  filteredMembers.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center justify-between ${
                        assignUserId === m.userId ? 'bg-primary/10 text-primary' : ''
                      }`}
                      onClick={() => setAssignUserId(m.userId)}
                    >
                      <span className="font-medium">{m.user?.name}</span>
                      <span className="text-xs text-muted-foreground">{m.user?.email}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assign-due">Due Date (optional)</Label>
              <Input
                id="assign-due"
                type="date"
                value={assignDueAt}
                onChange={(e) => setAssignDueAt(e.target.value)}
                disabled={assignLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assign-notes">Notes (optional)</Label>
              <textarea
                id="assign-notes"
                rows={3}
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder="Optional notes…"
                disabled={assignLoading}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setAssignOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={assignLoading || !assignUserId}>
                {assignLoading ? 'Assigning…' : 'Assign Territory'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Return Territory dialog */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Territory</DialogTitle>
            <DialogDescription>
              Mark <strong>#{returnTerritory?.number} {returnTerritory?.name}</strong> as returned?
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReturn} className="space-y-4 mt-2">
            {returnError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                {returnError}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="return-notes">Notes (optional)</Label>
              <textarea
                id="return-notes"
                rows={3}
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Optional notes on return…"
                disabled={returnLoading}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setReturnOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={returnLoading} variant="outline" className="text-orange-600 border-orange-300">
                {returnLoading ? 'Processing…' : 'Mark as Returned'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Request Territory Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={(o) => { setRequestDialogOpen(o); setRequestError(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Territory</DialogTitle>
            <DialogDescription>
              Request{' '}
              <span className="font-semibold">
                {requestTargetTerritory?.number} — {requestTargetTerritory?.name}
              </span>
              . The service overseer will review your request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="request-message" className="text-sm font-medium text-foreground">
                Message to overseer <span className="text-destructive">*</span>
              </label>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                id="request-message"
                placeholder="e.g. I'd like to work this territory this week…"
                rows={3}
                required
                disabled={requestLoading}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-50"
              />
            </div>
            {requestError && (
              <p className="text-sm text-destructive">{requestError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)} disabled={requestLoading}>
              Cancel
            </Button>
            <Button onClick={handleRequest} disabled={requestLoading}>
              {requestLoading ? 'Sending…' : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve / Reject Confirmation Dialog */}
      <Dialog
        open={!!confirmRequest}
        onOpenChange={(o) => { if (!o) closeConfirmDialog(); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === 'approve' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === 'approve'
                ? 'Approve this territory request and assign the territory to the publisher?'
                : 'Reject this territory request?'}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-1">
            <p className="text-sm font-semibold">{confirmRequest?.publisher?.name ?? 'Unknown Publisher'}</p>
            {confirmRequest?.message && (
              <p className="text-xs text-foreground italic">"{confirmRequest.message}"</p>
            )}
            <p className="text-xs text-muted-foreground">
              Requested on {confirmRequest ? new Date(confirmRequest.requestedAt).toLocaleString() : ''}
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm-response-message" className="text-sm font-medium text-foreground">
              {confirmAction === 'reject' ? (
                <>Response message <span className="text-destructive">*</span></>
              ) : (
                <>Response message <span className="text-muted-foreground text-xs">(optional)</span></>
              )}
            </label>
            <textarea
              id="confirm-response-message"
              rows={3}
              value={confirmResponseMessage}
              onChange={(e) => setConfirmResponseMessage(e.target.value)}
              placeholder={
                confirmAction === 'reject'
                  ? 'Reason for rejection…'
                  : 'Optional note to the publisher…'
              }
              disabled={confirmLoading}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-50"
            />
          </div>

          {confirmError && (
            <p className="text-sm text-destructive">{confirmError}</p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeConfirmDialog}
              disabled={confirmLoading}
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction === 'reject' ? 'destructive' : 'default'}
              onClick={handleConfirmAction}
              disabled={confirmLoading}
            >
              {confirmLoading
                ? 'Processing…'
                : confirmAction === 'approve'
                  ? 'Approve'
                  : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedPage>
  );
}
