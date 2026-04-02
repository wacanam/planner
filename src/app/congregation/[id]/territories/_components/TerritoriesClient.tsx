'use client';

import { CheckCircle, Clock, MapPin, Plus, Search, UserPlus, RotateCcw } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
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
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { CongregationRole, UserRole } from '@/db';
import type { Territory, TerritoryRequest } from '@/types/api';
import {
  useCongregationTerritories,
  useCongregationTerritoryRequests,
  useCongregationMembers,
  useCongregationGroups,
  useCreateTerritory,
  useCreateTerritoryRequest,
  useReviewTerritoryRequest,
} from '@/hooks';
import {
  createTerritorySchema,
  type CreateTerritoryFormData,
  assignTerritorySchema,
  type AssignTerritoryFormData,
  returnTerritorySchema,
  type ReturnTerritoryFormData,
  requestTerritorySchema,
  type RequestTerritoryFormData,
  reviewTerritoryRequestSchema,
  type ReviewTerritoryRequestFormData,
} from '@/schemas';

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

  const {
    data: territoriesData,
    isLoading: territoriesLoading,
    mutate: mutateTerritories,
  } = useCongregationTerritories(congregationId);
  const territories = territoriesData;

  const {
    data: requestsData,
    isLoading: requestsLoading,
    mutate: mutateRequests,
  } = useCongregationTerritoryRequests(congregationId, 'pending');
  const requests = requestsData;

  const { data: membersRaw } = useCongregationMembers(congregationId);
  const members = membersRaw;

  const { groups: groupsRaw } = useCongregationGroups(congregationId);
  const groups = groupsRaw;

  const loading = territoriesLoading || requestsLoading;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tab, setTab] = useState<'territories' | 'requests'>('territories');

  const { create: createTerritory } = useCreateTerritory(congregationId);
  const { request: createTerritoryRequest } = useCreateTerritoryRequest(congregationId);
  const { reviewRequest } = useReviewTerritoryRequest(congregationId);

  const myRole = (() => {
    if (!sessionUser?.id) return '';
    const me = members.find((m) => m.userId === sessionUser.id || m.user?.id === sessionUser.id);
    return me?.congregationRole ?? '';
  })();

  const isOverseer =
    myRole === CongregationRole.SERVICE_OVERSEER ||
    sessionUser?.role === UserRole.SUPER_ADMIN ||
    sessionUser?.role === UserRole.ADMIN;

  // Create territory dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const createForm = useForm<CreateTerritoryFormData>({
    resolver: zodResolver(createTerritorySchema),
    defaultValues: { name: '', number: '', notes: '' },
  });

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTerritory, setAssignTerritory] = useState<Territory | null>(null);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState('');
  const comboboxRef = useRef<HTMLDivElement>(null);
  const [assignType, setAssignType] = useState<'publisher' | 'group'>('publisher');
  const [assignGroupId, setAssignGroupId] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [debouncedGroupSearch, setDebouncedGroupSearch] = useState('');
  const [groupComboboxOpen, setGroupComboboxOpen] = useState(false);
  const groupComboboxRef = useRef<HTMLDivElement>(null);
  const assignForm = useForm<AssignTerritoryFormData>({
    resolver: zodResolver(assignTerritorySchema),
    defaultValues: { userId: '', dueAt: '', notes: '' },
  });

  // Return dialog
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnTerritory, setReturnTerritory] = useState<Territory | null>(null);
  const [returnError, setReturnError] = useState('');
  const returnForm = useForm<ReturnTerritoryFormData>({
    resolver: zodResolver(returnTerritorySchema),
    defaultValues: { notes: '' },
  });

  // Request dialog
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestTargetTerritory, setRequestTargetTerritory] = useState<Territory | null>(null);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const requestForm = useForm<RequestTerritoryFormData>({
    resolver: zodResolver(requestTerritorySchema),
    defaultValues: { message: '' },
  });

  // Approve/Reject confirmation dialog
  const [confirmRequest, setConfirmRequest] = useState<TerritoryRequest | null>(null);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const [confirmError, setConfirmError] = useState('');
  const [confirmTerritoryId, setConfirmTerritoryId] = useState('');
  const reviewRequestForm = useForm<ReviewTerritoryRequestFormData>({
    resolver: zodResolver(reviewTerritoryRequestSchema),
    defaultValues: { responseMessage: '' },
  });

  const filtered = useMemo(() => {
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
          t.publisherName?.toLowerCase().includes(s) ||
          t.groupName?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [search, statusFilter, territories]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMemberSearch(memberSearch), 400);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedGroupSearch(groupSearch), 400);
    return () => clearTimeout(timer);
  }, [groupSearch]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setComboboxOpen(false);
      }
      if (groupComboboxRef.current && !groupComboboxRef.current.contains(e.target as Node)) {
        setGroupComboboxOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  async function handleCreate(data: CreateTerritoryFormData) {
    setCreateError('');
    try {
      await createTerritory({
        name: data.name,
        number: data.number || data.name,
        notes: data.notes || undefined,
      });
      setCreateOpen(false);
      createForm.reset();
      await mutateTerritories();
    } catch {
      setCreateError('Network error');
    }
  }

  function openConfirmDialog(request: TerritoryRequest, action: 'approve' | 'reject') {
    setConfirmRequest(request);
    setConfirmAction(action);
    setConfirmError('');
    setConfirmTerritoryId('');
    reviewRequestForm.reset({ responseMessage: '' });
  }

  function closeConfirmDialog() {
    setConfirmRequest(null);
    setConfirmAction(null);
    setConfirmError('');
    setConfirmTerritoryId('');
    reviewRequestForm.reset();
  }

  async function handleConfirmAction(data: ReviewTerritoryRequestFormData) {
    if (!confirmRequest || !confirmAction) return;
    if (confirmAction === 'reject' && !data.responseMessage?.trim()) {
      setConfirmError('A reason is required when rejecting a request.');
      return;
    }
    if (confirmAction === 'approve' && !confirmRequest.territoryId && !confirmTerritoryId) {
      setConfirmError('Please select a territory to assign to the publisher.');
      return;
    }
    setConfirmError('');
    try {
      await reviewRequest({
        requestId: confirmRequest.id,
        status: confirmAction === 'approve' ? 'approved' : 'rejected',
        responseMessage: data.responseMessage?.trim() || null,
        ...(confirmAction === 'approve' && !confirmRequest.territoryId && confirmTerritoryId
          ? { territoryId: confirmTerritoryId }
          : {}),
      });
      closeConfirmDialog();
      await Promise.all([mutateTerritories(), mutateRequests()]);
    } catch {
      setConfirmError('Failed to process request. Please try again.');
    }
  }

  function openAssignDialog(territory: Territory) {
    setAssignTerritory(territory);
    setAssignType('publisher');
    setAssignGroupId('');
    setAssignError('');
    setAssignSuccess('');
    setMemberSearch('');
    setDebouncedMemberSearch('');
    setGroupSearch('');
    setDebouncedGroupSearch('');
    setComboboxOpen(false);
    setGroupComboboxOpen(false);
    assignForm.reset({ userId: '', dueAt: '', notes: '' });
    setAssignOpen(true);
  }

  async function handleAssign(data: AssignTerritoryFormData) {
    if (!assignTerritory) return;
    if (assignType === 'publisher' && !data.userId) {
      setAssignError('Please select a publisher');
      return;
    }
    if (assignType === 'group' && !assignGroupId) {
      setAssignError('Please select a group');
      return;
    }
    setAssignError('');
    try {
      await apiClient.post('/api/assignments', {
        territoryId: assignTerritory.id,
        ...(assignType === 'publisher' ? { userId: data.userId } : { serviceGroupId: assignGroupId }),
        dueAt: data.dueAt || undefined,
        notes: data.notes || undefined,
      });
      setAssignSuccess('Territory assigned successfully!');
      setTimeout(() => {
        setAssignOpen(false);
        setAssignSuccess('');
        assignForm.reset();
      }, 1200);
      await mutateTerritories();
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Failed to assign territory');
    }
  }

  function openReturnDialog(territory: Territory) {
    setReturnTerritory(territory);
    setReturnError('');
    returnForm.reset({ notes: '' });
    setReturnOpen(true);
  }

  async function handleReturn(data: ReturnTerritoryFormData) {
    if (!returnTerritory) return;
    setReturnError('');
    try {
      const assignments = await apiClient.get<{ id: string; status: string }[]>(
        `/api/territories/${returnTerritory.id}/assignments`
      );
      const activeAssignment = assignments?.find((a) => a.status === 'active');
      if (!activeAssignment) {
        setReturnError('No active assignment found');
        return;
      }
      await apiClient.put(`/api/assignments/${activeAssignment.id}`, { status: 'returned', notes: data.notes || undefined });
      setReturnOpen(false);
      returnForm.reset();
      await mutateTerritories();
    } catch {
      setReturnError('Failed to return territory');
    }
  }

  function openRequestDialog(territory: Territory) {
    setRequestTargetTerritory(territory);
    setRequestError('');
    requestForm.reset({ message: '' });
    setRequestDialogOpen(true);
  }

  async function handleRequest(data: RequestTerritoryFormData) {
    if (!requestTargetTerritory) return;
    if (!data.message?.trim()) {
      setRequestError('A message to the overseer is required.');
      return;
    }
    setRequestError('');
    try {
      await createTerritoryRequest({
        territoryId: requestTargetTerritory.id,
        message: data.message.trim(),
      });
      setRequestDialogOpen(false);
      setRequestSuccess(requestTargetTerritory.id);
      setRequestTargetTerritory(null);
      requestForm.reset();
      await mutateRequests();
      setTimeout(() => setRequestSuccess(null), 4000);
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Failed to send request. Please try again.');
    }
  }

  const availableCount = territories.filter((t) => t.status === 'available').length;
  const assignedCount = territories.filter((t) => t.status === 'assigned').length;
  const completedCount = territories.filter((t) => t.status === 'completed').length;

  const activeMembers = members.filter((m) => m.status === 'active');
  const filteredMembers = debouncedMemberSearch
    ? activeMembers.filter(
        (m) =>
          m.user?.name?.toLowerCase().includes(debouncedMemberSearch.toLowerCase()) ||
          m.user?.email?.toLowerCase().includes(debouncedMemberSearch.toLowerCase())
      )
    : activeMembers;

  const filteredGroups = debouncedGroupSearch
    ? groups.filter((g) => g.name.toLowerCase().includes(debouncedGroupSearch.toLowerCase()))
    : groups;

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
          {loading ? (
            <Skeleton className="h-9 w-32 rounded-md" />
          ) : isOverseer ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              Add Territory
            </Button>
          ) : null}
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
          {loading
            ? <Skeleton className="h-9 w-24 rounded-t-md mx-2" />
            : isOverseer ? (
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
          ) : null}
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
                              <Link
                                href={`/congregation/${congregationId}/territories/${t.id}`}
                                className="font-medium text-foreground hover:text-primary hover:underline"
                              >
                                #{t.number} {t.name}
                              </Link>
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
                          {t.publisherName ?? t.groupName ?? '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
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
                        <p className="text-sm text-muted-foreground">
                          {r.territoryId
                            ? (() => {
                                const t = territories.find((t) => t.id === r.territoryId);
                                return t ? `requested #${t.number} ${t.name}` : 'requested a specific territory';
                              })()
                            : 'requested any available territory'}
                        </p>
                        {r.message && (
                          <p className="text-xs text-foreground mt-1 italic">&quot;{r.message}&quot;</p>
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
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) createForm.reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Territory</DialogTitle>
            <DialogDescription>Create a new territory for this congregation.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4 mt-2">
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
                  {...createForm.register('number')}
                  placeholder="e.g. T-01"
                  disabled={createForm.formState.isSubmitting}
                  aria-invalid={!!createForm.formState.errors.number}
                  className={createForm.formState.errors.number ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {createForm.formState.errors.number && (
                  <p className="text-xs text-destructive mt-1">{createForm.formState.errors.number.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-name">Name *</Label>
                <Input
                  id="t-name"
                  {...createForm.register('name')}
                  placeholder="e.g. North District"
                  disabled={createForm.formState.isSubmitting}
                  aria-invalid={!!createForm.formState.errors.name}
                  className={createForm.formState.errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {createForm.formState.errors.name && (
                  <p className="text-xs text-destructive mt-1">{createForm.formState.errors.name.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-notes">Notes</Label>
              <Input
                id="t-notes"
                {...createForm.register('notes')}
                placeholder="Optional notes…"
                disabled={createForm.formState.isSubmitting}
              />
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createForm.formState.isSubmitting}>
                {createForm.formState.isSubmitting ? 'Creating…' : 'Add Territory'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Territory dialog */}
      <Dialog open={assignOpen} onOpenChange={(open) => { setAssignOpen(open); if (!open) { assignForm.reset(); setAssignSuccess(''); setAssignError(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Territory</DialogTitle>
            <DialogDescription>
              Assign <strong>#{assignTerritory?.number} {assignTerritory?.name}</strong> to a publisher or group.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={assignForm.handleSubmit(handleAssign)} className="space-y-4 mt-2">
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
            {/* Assign type toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => { setAssignType('publisher'); setAssignGroupId(''); setGroupSearch(''); setGroupComboboxOpen(false); assignForm.setValue('userId', ''); }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${assignType === 'publisher' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted/50'}`}
              >
                Publisher
              </button>
              <button
                type="button"
                onClick={() => { setAssignType('group'); setMemberSearch(''); setComboboxOpen(false); assignForm.setValue('userId', ''); }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${assignType === 'group' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted/50'}`}
              >
                Group
              </button>
            </div>
            {assignType === 'publisher' ? (
              <div className="space-y-1.5">
                <Label>Publisher *</Label>
                <div ref={comboboxRef} className="relative">
                  <Input
                    placeholder="Search publishers…"
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      assignForm.setValue('userId', '');
                      setComboboxOpen(e.target.value.length > 0);
                    }}
                    autoComplete="off"
                  />
                  {comboboxOpen && memberSearch.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                      <div className="max-h-48 overflow-y-auto divide-y divide-border">
                        {filteredMembers.length === 0 ? (
                          <p className="text-xs text-muted-foreground p-3 text-center">
                            {debouncedMemberSearch ? 'No publishers match your search' : 'No active publishers'}
                          </p>
                        ) : (
                          filteredMembers.map((m) => (
                            <button
                              type="button"
                              key={m.id}
                              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors flex items-center justify-between gap-3 ${
                                assignForm.watch('userId') === m.userId ? 'bg-primary/10 text-primary' : ''
                              }`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                assignForm.setValue('userId', m.userId);
                                setMemberSearch(m.user?.name ?? '');
                                setComboboxOpen(false);
                              }}
                            >
                              <span className="font-medium truncate">{m.user?.name}</span>
                              <span className="text-xs text-muted-foreground shrink-0">{m.user?.email}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {assignForm.formState.errors.userId && (
                  <p className="text-xs text-destructive mt-1">{assignForm.formState.errors.userId.message}</p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Group *</Label>
                <div ref={groupComboboxRef} className="relative">
                  <Input
                    placeholder="Search groups…"
                    value={groupSearch}
                    onChange={(e) => {
                      setGroupSearch(e.target.value);
                      setAssignGroupId('');
                      setGroupComboboxOpen(e.target.value.length > 0);
                    }}
                    autoComplete="off"
                  />
                  {groupComboboxOpen && groupSearch.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                      <div className="max-h-48 overflow-y-auto divide-y divide-border">
                        {filteredGroups.length === 0 ? (
                          <p className="text-xs text-muted-foreground p-3 text-center">
                            {debouncedGroupSearch ? 'No groups match your search' : 'No groups found'}
                          </p>
                        ) : (
                          filteredGroups.map((g) => (
                            <button
                              type="button"
                              key={g.id}
                              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors ${
                                assignGroupId === g.id ? 'bg-primary/10 text-primary' : ''
                              }`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setAssignGroupId(g.id);
                                setGroupSearch(g.name);
                                setGroupComboboxOpen(false);
                              }}
                            >
                              <span className="font-medium">{g.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="assign-due">Due Date (optional)</Label>
              <Input
                id="assign-due"
                type="date"
                {...assignForm.register('dueAt')}
                disabled={assignForm.formState.isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assign-notes">Notes (optional)</Label>
              <textarea
                id="assign-notes"
                rows={3}
                {...assignForm.register('notes')}
                placeholder="Optional notes…"
                disabled={assignForm.formState.isSubmitting}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setAssignOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={assignForm.formState.isSubmitting || (assignType === 'publisher' ? !assignForm.watch('userId') : !assignGroupId)}>
                {assignForm.formState.isSubmitting ? 'Assigning…' : 'Assign Territory'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Return Territory dialog */}
      <Dialog open={returnOpen} onOpenChange={(open) => { setReturnOpen(open); if (!open) { returnForm.reset(); setReturnError(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Territory</DialogTitle>
            <DialogDescription>
              Mark <strong>#{returnTerritory?.number} {returnTerritory?.name}</strong> as returned?
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={returnForm.handleSubmit(handleReturn)} className="space-y-4 mt-2">
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
                {...returnForm.register('notes')}
                placeholder="Optional notes on return…"
                disabled={returnForm.formState.isSubmitting}
                aria-invalid={!!returnForm.formState.errors.notes}
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none${returnForm.formState.errors.notes ? ' border-destructive focus-visible:ring-destructive' : ' border-input focus-visible:ring-ring'}`}
              />
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setReturnOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={returnForm.formState.isSubmitting} variant="outline" className="text-orange-600 border-orange-300">
                {returnForm.formState.isSubmitting ? 'Processing…' : 'Mark as Returned'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Request Territory Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={(open) => { setRequestDialogOpen(open); if (!open) { requestForm.reset(); setRequestError(''); } }}>
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

          <form onSubmit={requestForm.handleSubmit(handleRequest)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="request-message" className="text-sm font-medium text-foreground">
                Message to overseer <span className="text-destructive">*</span>
              </label>
              <textarea
                id="request-message"
                {...requestForm.register('message')}
                placeholder="e.g. I&apos;d like to work this territory this week…"
                rows={3}
                disabled={requestForm.formState.isSubmitting}
                aria-invalid={!!requestForm.formState.errors.message}
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 resize-none disabled:opacity-50${requestForm.formState.errors.message ? ' border-destructive focus:ring-destructive' : ' border-input focus:ring-ring'}`}
              />
              {requestForm.formState.errors.message && (
                <p className="text-xs text-destructive mt-1">{requestForm.formState.errors.message.message}</p>
              )}
            </div>
            {requestError && (
              <p className="text-sm text-destructive">{requestError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRequestDialogOpen(false)} disabled={requestForm.formState.isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={requestForm.formState.isSubmitting}>
                {requestForm.formState.isSubmitting ? 'Sending…' : 'Send Request'}
              </Button>
            </DialogFooter>
          </form>
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
                ? confirmRequest?.territoryId
                  ? 'Approve this territory request and assign the territory to the publisher?'
                  : 'Select a territory to assign to the publisher and approve the request.'
                : 'Reject this territory request?'}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-1">
            <p className="text-sm font-semibold">{confirmRequest?.publisher?.name ?? 'Unknown Publisher'}</p>
            {confirmRequest?.message && (
              <p className="text-xs text-foreground italic">&quot;{confirmRequest.message}&quot;</p>
            )}
            <p className="text-xs text-muted-foreground">
              Requested on {confirmRequest ? new Date(confirmRequest.requestedAt).toLocaleString() : ''}
            </p>
          </div>

          {confirmAction === 'approve' && !confirmRequest?.territoryId && (
            <div className="space-y-1.5">
              <label htmlFor="confirm-territory-select" className="text-sm font-medium text-foreground">
                Assign territory <span className="text-destructive">*</span>
              </label>
              <select
                id="confirm-territory-select"
                value={confirmTerritoryId}
                onChange={(e) => setConfirmTerritoryId(e.target.value)}
                disabled={reviewRequestForm.formState.isSubmitting}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                <option value="">Select an available territory…</option>
                {territories
                  .filter((t) => t.status === 'available')
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.number} {t.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

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
              {...reviewRequestForm.register('responseMessage')}
              aria-invalid={!!reviewRequestForm.formState.errors.responseMessage}
              placeholder={
                confirmAction === 'reject'
                  ? 'Reason for rejection…'
                  : 'Optional note to the publisher…'
              }
              disabled={reviewRequestForm.formState.isSubmitting}
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 resize-none disabled:opacity-50${reviewRequestForm.formState.errors.responseMessage ? ' border-destructive focus:ring-destructive' : ' border-input focus:ring-ring'}`}
            />
            {reviewRequestForm.formState.errors.responseMessage && (
              <p className="text-xs text-destructive mt-1">{reviewRequestForm.formState.errors.responseMessage.message}</p>
            )}
          </div>

          {confirmError && (
            <p className="text-sm text-destructive">{confirmError}</p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeConfirmDialog}
              disabled={reviewRequestForm.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction === 'reject' ? 'destructive' : 'default'}
              onClick={reviewRequestForm.handleSubmit(handleConfirmAction)}
              disabled={reviewRequestForm.formState.isSubmitting}
            >
              {reviewRequestForm.formState.isSubmitting
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
