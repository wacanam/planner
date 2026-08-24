'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  Clock,
  History,
  Map as MapIcon,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { DashboardHeader } from '@/components/dashboard-header';
import { ProtectedPage } from '@/components/protected-page';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCongregation,
  useCongregationGroups,
  useCongregationMembers,
  useCongregationTerritories,
  useCreateAssignment,
  useCreateTerritory,
  useCurrentUser,
  useDeleteTerritory,
  useHouseholds,
  useRevokeTerritory,
  useTerritoryAssignments,
  useUpdateAssignment,
  useUpdateCongregation,
  useUpdateTerritory,
} from '@/hooks';
import {
  canAdjustAssignmentDates,
  canCreateTerritory,
  canDeleteTerritory,
  canEditTerritory,
} from '@/lib/permissions';
import { calculateTerritoryCoverage } from '@/lib/territory-coverage';
import {
  type CreateTerritoryFormData,
  createTerritorySchema,
  type UpdateTerritoryFormData,
  updateTerritorySchema,
} from '@/schemas';
import type { Assignment, Household, Territory } from '@/types/api';

const statusColors: Record<string, string> = {
  available:
    'text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400',
  assigned: 'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400',
  pending: 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400',
  overdue: 'text-rose-700 border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400',
};

export default function TerritoriesClient() {
  const params = useParams();
  const _router = useRouter();
  const congregationId = (params?.id as string) || '';
  const { user } = useCurrentUser();
  const canCreate = canCreateTerritory(user?.role, user?.congregationRole);
  const canEdit = canEditTerritory(user?.role, user?.congregationRole);
  const canDelete = canDeleteTerritory(user?.role, user?.congregationRole);

  const { congregation } = useCongregation(congregationId);
  const { update: updateCongregation, isUpdating: updatingCenter } =
    useUpdateCongregation(congregationId);

  const { data: territories = [], isLoading } = useCongregationTerritories(congregationId);
  const { data: members = [] } = useCongregationMembers(congregationId);
  const { groups = [] } = useCongregationGroups(congregationId);
  const { households = [] } = useHouseholds({ congregationId });
  const { create: createTerritory, isPending: creatingTerritory } =
    useCreateTerritory(congregationId);
  const { create: createAssignment, isPending: assigningTerritory } = useCreateAssignment();
  const { revoke: revokeTerritory, isPending: revokingTerritory } = useRevokeTerritory();
  const { remove: deleteTerritory, isDeleting: deletingTerritory } = useDeleteTerritory();

  const coverageByTerritoryId = useMemo(() => {
    const map = new Map<
      string,
      { totalDoors: number; workedDoors: number; coveragePercent: number }
    >();
    const byTerritory = new Map<string, Household[]>();
    for (const h of households) {
      if (h.territoryId) {
        if (!byTerritory.has(h.territoryId)) byTerritory.set(h.territoryId, []);
        byTerritory.get(h.territoryId)?.push(h);
      }
    }
    for (const [tId, hList] of byTerritory.entries()) {
      map.set(tId, calculateTerritoryCoverage(hList));
    }
    return map;
  }, [households]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTerritory, setEditTerritory] = useState<Territory | null>(null);
  const [assignTerritory, setAssignTerritory] = useState<Territory | null>(null);
  const [assignDate, setAssignDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [revokeConfirmTerritory, setRevokeConfirmTerritory] = useState<Territory | null>(null);
  const [revokeDate, setRevokeDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [historyTerritory, setHistoryTerritory] = useState<Territory | null>(null);
  const [deleteConfirmTerritory, setDeleteConfirmTerritory] = useState<Territory | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [assignType, setAssignType] = useState<'publisher' | 'group'>('publisher');
  const [assignUserId, setAssignUserId] = useState('');
  const [assignGroupId, setAssignGroupId] = useState('');

  const [mapCenterOpen, setMapCenterOpen] = useState(false);
  const [centerLat, setCenterLat] = useState('');
  const [centerLng, setCenterLng] = useState('');

  const { update: updateTerritory, isPending: updatingTerritory } = useUpdateTerritory();

  const createForm = useForm<CreateTerritoryFormData>({
    resolver: zodResolver(createTerritorySchema) as any,
    defaultValues: {
      number: '',
      name: '',
      type: 'regular',
      city: '',
    },
  });

  const editForm = useForm<UpdateTerritoryFormData>({
    resolver: zodResolver(updateTerritorySchema) as any,
    defaultValues: {
      number: '',
      name: '',
      type: 'regular',
      city: '',
      notes: '',
    },
  });

  const filtered = useMemo(() => {
    let list = territories;
    if (statusFilter !== 'all') {
      list = list.filter((t) => t.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.number.toLowerCase().includes(q) ||
          t.city?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [territories, statusFilter, search]);

  const handleCreateSubmit = async (data: CreateTerritoryFormData) => {
    await createTerritory({
      ...data,
      congregationId,
    });
    setCreateDialogOpen(false);
    createForm.reset();
  };

  const handleOpenEdit = (t: Territory) => {
    setEditTerritory(t);
    editForm.reset({
      number: t.number || '',
      name: t.name || '',
      type: t.type || 'regular',
      city: t.city || '',
      notes: t.notes || '',
    });
  };

  const handleEditSubmit = async (data: UpdateTerritoryFormData) => {
    if (!editTerritory) return;
    try {
      await updateTerritory(editTerritory.id, {
        number: data.number.trim(),
        name: data.name.trim(),
        city: data.city?.trim() || null,
        type: data.type || 'regular',
        notes: data.notes?.trim() || null,
      });
      toast.success(`Territory #${data.number} updated successfully`);
      setEditTerritory(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update territory');
    }
  };

  const handleAssignSubmit = async () => {
    if (!assignTerritory) return;
    const endorserName = user.name || user.email || 'Territory Servant';
    const effectiveAssignedAt = assignDate || new Date().toISOString();
    if (assignType === 'publisher') {
      if (!assignUserId) {
        toast.error('Please select a publisher');
        return;
      }
      const selectedMember = members.find((m) => m.userId === assignUserId);
      const targetName = selectedMember?.user?.name || selectedMember?.user?.email || 'publisher';
      await createAssignment({
        territoryId: assignTerritory.id,
        congregationId,
        territoryNumber: assignTerritory.number,
        territoryName: assignTerritory.name,
        userId: assignUserId,
        assigneeName: selectedMember?.user?.name || selectedMember?.user?.email || null,
        assigneeEmail: selectedMember?.user?.email || null,
        assignedAt: effectiveAssignedAt,
        endorsedByUserId: user.id || null,
        endorsedByUserName: endorserName,
      });
      toast.success(
        `Territory #${assignTerritory.number} assigned to ${targetName} and submitted for endorsement`
      );
    } else {
      if (!assignGroupId) {
        toast.error('Please select a service group');
        return;
      }
      const selectedGroup = groups.find((g) => g.id === assignGroupId);
      const groupName = selectedGroup?.name || 'group';
      await createAssignment({
        territoryId: assignTerritory.id,
        congregationId,
        territoryNumber: assignTerritory.number,
        territoryName: assignTerritory.name,
        serviceGroupId: assignGroupId,
        groupName: selectedGroup?.name || null,
        assignedAt: effectiveAssignedAt,
        endorsedByUserId: user.id || null,
        endorsedByUserName: endorserName,
      });
      toast.success(
        `Territory #${assignTerritory.number} assigned to ${groupName} and submitted for endorsement`
      );
    }

    setAssignTerritory(null);
    setAssignUserId('');
    setAssignGroupId('');
    setAssignDate(new Date().toISOString().slice(0, 10));
  };

  const handleSaveMapCenter = async () => {
    const lat = parseFloat(centerLat);
    const lng = parseFloat(centerLng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error('Please enter valid numeric latitude and longitude coordinates.');
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('Latitude must be between -90 and 90, and longitude between -180 and 180.');
      return;
    }
    try {
      await updateCongregation({
        defaultLatitude: lat,
        defaultLongitude: lng,
      });
      toast.success('Congregation default map center updated!');
      setMapCenterOpen(false);
    } catch {
      toast.error('Failed to update map center.');
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenterLat(pos.coords.latitude.toFixed(6));
        setCenterLng(pos.coords.longitude.toFixed(6));
        toast.success('Detected current GPS location');
      },
      () => {
        toast.error('Unable to retrieve your current location.');
      }
    );
  };

  return (
    <ProtectedPage congregationId={congregationId}>
      <DashboardHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-24 lg:pb-8 w-full min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Territory Directory</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Congregation territory cards, boundaries, and publisher assignments
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              asChild
              variant="outline"
              className="rounded-2xl text-xs font-semibold gap-1.5 h-10 px-3.5 bg-background shadow-xs hover:border-primary/50 hover:bg-primary/5"
            >
              <Link href={`/congregation/${congregationId}/territories/overview`}>
                <MapIcon size={15} className="text-primary" />
                <span>Congregation Map</span>
              </Link>
            </Button>
            {canCreate && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCenterLat(
                      typeof congregation?.defaultLatitude === 'number'
                        ? String(congregation.defaultLatitude)
                        : '8.3683'
                    );
                    setCenterLng(
                      typeof congregation?.defaultLongitude === 'number'
                        ? String(congregation.defaultLongitude)
                        : '124.8644'
                    );
                    setMapCenterOpen(true);
                  }}
                  className="rounded-2xl text-xs font-semibold gap-1.5 h-10 px-3.5"
                >
                  <MapPin size={14} />
                  <span>Map Center</span>
                </Button>
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="rounded-2xl text-xs font-semibold gap-2 shadow-sm h-10 px-4"
                >
                  <Plus size={15} />
                  <span>Create Territory</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search by territory # or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-10 rounded-xl text-xs"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-10 rounded-xl text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Territory Cards Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-44 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-border">
            <MapPin size={40} className="text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No territories found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your search or create a new territory card.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => (
              <Card
                key={t.id}
                className="bg-card border-border shadow-xs hover:border-primary/50 transition-all group flex flex-col justify-between min-w-0"
              >
                <CardContent className="p-4 sm:p-5 space-y-4 min-w-0">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="font-extrabold text-sm text-primary shrink-0">
                          #{t.number}
                        </span>
                        <h2
                          className="font-bold text-sm text-foreground line-clamp-2 min-w-0 leading-snug break-words"
                          title={t.name}
                        >
                          {t.name}
                        </h2>
                      </div>
                      <p
                        className="text-xs text-muted-foreground mt-1 truncate"
                        title={t.city || 'Congregation Area'}
                      >
                        {t.city || 'Congregation Area'}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase font-bold py-0.5 px-2 shrink-0 ${statusColors[t.status] ?? ''}`}
                    >
                      {t.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">Doors</p>
                      <p className="font-bold text-foreground">
                        {coverageByTerritoryId.get(t.id)?.totalDoors ?? t.householdsCount ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">
                        Coverage
                      </p>
                      <p className="font-bold text-foreground">
                        {coverageByTerritoryId.get(t.id)?.coveragePercent ??
                          Math.round(parseFloat(t.coveragePercent || '0'))}
                        %
                      </p>
                    </div>
                  </div>

                  {/* Assigned Info if assigned or pending */}
                  {(t.groupName || t.publisherName) && (
                    <div className="pt-1 text-xs text-muted-foreground min-w-0">
                      {t.groupName ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Users size={12} className="text-primary shrink-0" />
                          <span className="truncate min-w-0" title={t.groupName}>
                            Group:{' '}
                            <strong className="text-foreground font-semibold">{t.groupName}</strong>
                          </span>
                        </div>
                      ) : t.publisherName ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <User size={12} className="text-primary shrink-0" />
                          <span className="truncate min-w-0" title={t.publisherName}>
                            Publisher:{' '}
                            <strong className="text-foreground font-semibold">
                              {t.publisherName}
                            </strong>
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div className="pt-2 border-t border-border/60 space-y-2 min-w-0">
                    <Button
                      asChild
                      size="sm"
                      className="w-full rounded-xl text-xs font-semibold gap-1.5 shadow-sm h-9"
                    >
                      <Link href={`/congregation/${congregationId}/territories/${t.id}`}>
                        <MapPin size={13} className="shrink-0" />
                        <span>Map Studio</span>
                      </Link>
                    </Button>

                    {canEdit && (
                      <div className="flex items-center gap-1.5 min-w-0">
                        {t.status === 'available' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 rounded-xl text-xs gap-1 h-8 font-semibold bg-background hover:bg-muted min-w-0"
                            onClick={() => {
                              setAssignTerritory(t);
                              setAssignType('publisher');
                              setAssignUserId('');
                              setAssignGroupId('');
                            }}
                          >
                            <UserCheck size={13} className="shrink-0 text-primary" />
                            <span className="truncate">Assign</span>
                          </Button>
                        ) : t.status === 'assigned' || t.status === 'pending' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 rounded-xl text-xs gap-1 h-8 text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 min-w-0"
                            onClick={() => setRevokeConfirmTerritory(t)}
                            title="Revoke assignment and make territory available"
                          >
                            <RotateCcw size={12} className="shrink-0" />
                            <span className="truncate">Revoke</span>
                          </Button>
                        ) : null}

                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-xs gap-1 h-8 px-2.5 hover:border-primary/50 hover:bg-primary/5 shrink-0"
                          onClick={() => setHistoryTerritory(t)}
                          title="View assignment history and adjust dates"
                        >
                          <History size={12} className="shrink-0" />
                          <span>History</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-xs gap-1 h-8 px-3 hover:border-primary/50 hover:bg-primary/5 shrink-0"
                          onClick={() => handleOpenEdit(t)}
                          title="Edit territory details"
                        >
                          <Pencil size={12} className="shrink-0" />
                          <span>Edit</span>
                        </Button>

                        {canDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-xl text-xs h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                            onClick={() => {
                              setDeleteConfirmTerritory(t);
                              setDeleteConfirmInput('');
                            }}
                            title="Permanently delete territory"
                          >
                            <Trash2 size={13} className="shrink-0" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Territory Dialog */}
        <ResponsiveDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          title="Create Territory Card"
          description="Define territory number, name, and area"
        >
          <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1 col-span-1">
                <Label htmlFor="number" className="text-xs font-semibold">
                  Number *
                </Label>
                <Input
                  id="number"
                  placeholder="e.g. 101"
                  className="h-9 rounded-xl text-xs"
                  {...createForm.register('number')}
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label htmlFor="name" className="text-xs font-semibold">
                  Territory Name *
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Downtown West"
                  className="h-9 rounded-xl text-xs"
                  {...createForm.register('name')}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="city" className="text-xs font-semibold">
                City / District
              </Label>
              <Input
                id="city"
                placeholder="e.g. Manila"
                className="h-9 rounded-xl text-xs"
                {...createForm.register('city')}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl text-xs"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl text-xs font-semibold"
                disabled={creatingTerritory}
              >
                {creatingTerritory ? 'Creating…' : 'Create Territory'}
              </Button>
            </div>
          </form>
        </ResponsiveDialog>

        {/* Edit Territory Dialog */}
        <ResponsiveDialog
          open={!!editTerritory}
          onOpenChange={(op) => {
            if (!op) setEditTerritory(null);
          }}
          title={editTerritory ? `Edit Territory #${editTerritory.number}` : 'Edit Territory'}
          description="Update territory number, name, district, or notes"
        >
          <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1 col-span-1">
                <Label htmlFor="edit-number" className="text-xs font-semibold">
                  Number *
                </Label>
                <Input
                  id="edit-number"
                  placeholder="e.g. 101"
                  className="h-9 rounded-xl text-xs"
                  {...editForm.register('number')}
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label htmlFor="edit-name" className="text-xs font-semibold">
                  Territory Name *
                </Label>
                <Input
                  id="edit-name"
                  placeholder="e.g. Downtown West"
                  className="h-9 rounded-xl text-xs"
                  {...editForm.register('name')}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-city" className="text-xs font-semibold">
                City / District
              </Label>
              <Input
                id="edit-city"
                placeholder="e.g. Manila"
                className="h-9 rounded-xl text-xs"
                {...editForm.register('city')}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-notes" className="text-xs font-semibold">
                Notes / Instructions
              </Label>
              <Input
                id="edit-notes"
                placeholder="Optional territory notes..."
                className="h-9 rounded-xl text-xs"
                {...editForm.register('notes')}
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/70 mt-2">
              {canDelete && editTerritory ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 px-2.5"
                  onClick={() => {
                    const target = editTerritory;
                    setEditTerritory(null);
                    setDeleteConfirmTerritory(target);
                    setDeleteConfirmInput('');
                  }}
                >
                  <Trash2 size={13} />
                  <span>Delete Territory</span>
                </Button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl text-xs"
                  onClick={() => setEditTerritory(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl text-xs font-semibold"
                  disabled={updatingTerritory}
                >
                  {updatingTerritory ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </form>
        </ResponsiveDialog>

        {/* Assign Territory Dialog */}
        <ResponsiveDialog
          open={!!assignTerritory}
          onOpenChange={(op) => {
            if (!op) {
              setAssignTerritory(null);
              setAssignUserId('');
              setAssignGroupId('');
              setAssignDate(new Date().toISOString().slice(0, 10));
            }
          }}
          title="Assign Territory Card"
          description={
            assignTerritory ? `Assign #${assignTerritory.number} — ${assignTerritory.name}` : ''
          }
        >
          <div className="space-y-4">
            {/* Toggle: Publisher vs Service Group */}
            <div className="flex gap-2 p-1 bg-muted/40 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setAssignType('publisher')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  assignType === 'publisher'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <User size={13} />
                <span>Publisher</span>
              </button>
              <button
                type="button"
                onClick={() => setAssignType('group')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  assignType === 'group'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users size={13} />
                <span>Service Group</span>
              </button>
            </div>

            {/* Assignment Date Selector */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Assignment Date *</Label>
              <Input
                type="date"
                value={assignDate}
                onChange={(e) => setAssignDate(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>

            {assignType === 'publisher' ? (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Select Publisher *</Label>
                <Select value={assignUserId} onValueChange={setAssignUserId}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue placeholder="Choose a publisher…" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-56">
                    {members
                      .filter((m) => m.status === 'active')
                      .map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.user?.name || m.user?.email || m.userId}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Select Service Group *</Label>
                {groups.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 rounded-xl bg-muted/30 border border-border">
                    No service groups created yet. Create a group in the Service Groups tab first.
                  </p>
                ) : (
                  <Select value={assignGroupId} onValueChange={setAssignGroupId}>
                    <SelectTrigger className="h-9 rounded-xl text-xs">
                      <SelectValue placeholder="Choose a service group…" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border max-h-56">
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name} ({g.members?.length ?? 0} publishers)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl text-xs"
                onClick={() => {
                  setAssignTerritory(null);
                  setAssignUserId('');
                  setAssignGroupId('');
                  setAssignDate(new Date().toISOString().slice(0, 10));
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl text-xs font-semibold"
                onClick={handleAssignSubmit}
                disabled={
                  (assignType === 'publisher' && !assignUserId) ||
                  (assignType === 'group' && !assignGroupId) ||
                  assigningTerritory ||
                  !assignDate
                }
              >
                {assigningTerritory ? 'Assigning…' : 'Confirm Assignment'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>

        {/* Congregation Default Map Center Dialog */}
        <ResponsiveDialog
          open={mapCenterOpen}
          onOpenChange={setMapCenterOpen}
          title="Congregation Map Center"
          description={`Set the default map coordinates for ${congregation?.name ?? 'your congregation'}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              These coordinates will be used as the default starting center in Territory Studio for
              territories without drawn boundary coordinates.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="centerLat" className="text-xs font-semibold">
                  Default Latitude
                </Label>
                <Input
                  id="centerLat"
                  value={centerLat}
                  onChange={(e) => setCenterLat(e.target.value)}
                  placeholder="e.g. 8.3683"
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="centerLng" className="text-xs font-semibold">
                  Default Longitude
                </Label>
                <Input
                  id="centerLng"
                  value={centerLng}
                  onChange={(e) => setCenterLng(e.target.value)}
                  placeholder="e.g. 124.8644"
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseCurrentLocation}
              className="w-full rounded-xl text-xs gap-1.5"
            >
              <MapPin size={13} />
              <span>Detect My Current GPS Location</span>
            </Button>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl text-xs"
                onClick={() => setMapCenterOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl text-xs font-semibold"
                onClick={handleSaveMapCenter}
                disabled={updatingCenter || !centerLat || !centerLng}
              >
                {updatingCenter ? 'Saving…' : 'Save Default Coordinates'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>

        {/* Revoke / Return Territory Confirmation Dialog with Date Adjustment */}
        <ResponsiveDialog
          open={!!revokeConfirmTerritory}
          onOpenChange={(op) => {
            if (!op) {
              setRevokeConfirmTerritory(null);
              setRevokeDate(new Date().toISOString().slice(0, 10));
            }
          }}
          title="Revoke / Return Territory"
          description={
            revokeConfirmTerritory
              ? `Revoke assignment for Territory #${revokeConfirmTerritory.number} — ${revokeConfirmTerritory.name}`
              : 'Revoke Territory'
          }
        >
          {revokeConfirmTerritory && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                This will mark the current assignment as completed and return{' '}
                <strong className="text-foreground">
                  Territory #{revokeConfirmTerritory.number}
                </strong>{' '}
                to Available status.
              </p>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Effective Revocation / Return Date *
                </Label>
                <Input
                  type="date"
                  value={revokeDate}
                  onChange={(e) => setRevokeDate(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl text-xs"
                  onClick={() => {
                    setRevokeConfirmTerritory(null);
                    setRevokeDate(new Date().toISOString().slice(0, 10));
                  }}
                  disabled={revokingTerritory}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="rounded-xl text-xs font-semibold"
                  disabled={revokingTerritory || !revokeDate}
                  onClick={async () => {
                    if (revokeConfirmTerritory) {
                      await revokeTerritory(revokeConfirmTerritory.id, revokeDate);
                      toast.success(
                        `Territory #${revokeConfirmTerritory.number} assignment revoked and marked available`
                      );
                      setRevokeConfirmTerritory(null);
                      setRevokeDate(new Date().toISOString().slice(0, 10));
                    }
                  }}
                >
                  {revokingTerritory ? 'Revoking…' : 'Confirm Revocation'}
                </Button>
              </div>
            </div>
          )}
        </ResponsiveDialog>

        {/* Territory Assignment History & Dates Dialog */}
        <TerritoryHistoryDialog
          territory={historyTerritory}
          onClose={() => setHistoryTerritory(null)}
          canAdjustDates={canAdjustAssignmentDates(user.role)}
        />

        {/* Delete Territory Strong Warning Dialog */}
        <ResponsiveDialog
          open={Boolean(deleteConfirmTerritory)}
          onOpenChange={(open) => {
            if (!open && !deletingTerritory) {
              setDeleteConfirmTerritory(null);
              setDeleteConfirmInput('');
            }
          }}
          title={
            deleteConfirmTerritory
              ? `Delete Territory #${deleteConfirmTerritory.number}`
              : 'Delete Territory'
          }
          description="Permanently delete this territory and related assignment records"
        >
          {deleteConfirmTerritory && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertTriangle size={18} className="shrink-0 text-destructive" />
                  <span>Irreversible Action — Strong Warning!</span>
                </div>
                <p className="leading-relaxed font-medium">
                  You are about to permanently delete{' '}
                  <strong className="underline font-bold">
                    Territory #{deleteConfirmTerritory.number} — {deleteConfirmTerritory.name}
                  </strong>
                  .
                </p>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground dark:text-rose-300/80">
                  <li>
                    The territory boundary coordinates, drawn road overlays, and landmark pins will
                    be permanently deleted.
                  </li>
                  <li>
                    All active and past assignments, plus pending requests for this territory, will
                    be permanently purged.
                  </li>
                  <li>
                    Any household records in this territory will remain{' '}
                    <strong>safely preserved</strong> in your congregation directory and simply
                    unlinked from this territory.
                  </li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="delete-confirm-input"
                  className="text-xs font-semibold text-foreground"
                >
                  To confirm deletion, please type the territory number{' '}
                  <span className="font-mono font-bold text-destructive underline">
                    {deleteConfirmTerritory.number}
                  </span>{' '}
                  below:
                </Label>
                <Input
                  id="delete-confirm-input"
                  placeholder={`Type "${deleteConfirmTerritory.number}" to confirm`}
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  disabled={deletingTerritory}
                  className="h-9 rounded-xl text-xs border-destructive/40 focus-visible:ring-destructive"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs"
                  onClick={() => {
                    setDeleteConfirmTerritory(null);
                    setDeleteConfirmInput('');
                  }}
                  disabled={deletingTerritory}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
                  disabled={
                    deleteConfirmInput.trim().toLowerCase() !==
                      deleteConfirmTerritory.number.trim().toLowerCase() || deletingTerritory
                  }
                  onClick={async () => {
                    if (
                      deleteConfirmInput.trim().toLowerCase() !==
                      deleteConfirmTerritory.number.trim().toLowerCase()
                    ) {
                      return;
                    }
                    try {
                      const targetNumber = deleteConfirmTerritory.number;
                      await deleteTerritory(deleteConfirmTerritory.id);
                      toast.success(`Territory #${targetNumber} has been permanently deleted.`);
                      setDeleteConfirmTerritory(null);
                      setDeleteConfirmInput('');
                    } catch (err: any) {
                      toast.error(err?.message || 'Failed to delete territory');
                    }
                  }}
                >
                  <Trash2 size={13} />
                  <span>
                    {deletingTerritory ? 'Deleting Territory…' : 'Permanently Delete Territory'}
                  </span>
                </Button>
              </div>
            </div>
          )}
        </ResponsiveDialog>
      </main>
      <BottomTabBar />
    </ProtectedPage>
  );
}

function TerritoryHistoryDialog({
  territory,
  onClose,
  canAdjustDates,
}: {
  territory: Territory | null;
  onClose: () => void;
  canAdjustDates: boolean;
}) {
  const { assignments = [], isLoading } = useTerritoryAssignments(territory?.id);
  const { update: updateAssignment, isPending: isUpdating } = useUpdateAssignment();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assignedAt, setAssignedAt] = useState('');
  const [returnedAt, setReturnedAt] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');

  const startEdit = (a: Assignment) => {
    setEditingId(a.id);
    setAssignedAt(a.assignedAt ? a.assignedAt.slice(0, 10) : '');
    setReturnedAt(a.returnedAt ? a.returnedAt.slice(0, 10) : '');
    setDueAt(a.dueAt ? a.dueAt.slice(0, 10) : '');
    setNotes(a.notes || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAssignedAt('');
    setReturnedAt('');
    setDueAt('');
    setNotes('');
  };

  const handleSave = async (a: Assignment) => {
    try {
      await updateAssignment({
        id: a.id,
        assignedAt: assignedAt || null,
        returnedAt: returnedAt || null,
        dueAt: dueAt || null,
        notes: notes.trim() || null,
      });
      toast.success('Assignment dates and details updated');
      cancelEdit();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update assignment dates');
    }
  };

  return (
    <ResponsiveDialog
      open={Boolean(territory)}
      onOpenChange={(op) => !op && onClose()}
      title={territory ? `Territory #${territory.number} Assignment History` : 'Assignment History'}
      description={territory ? `${territory.name} — Adjust assignment and return dates` : ''}
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Loading assignment history…
          </div>
        ) : assignments.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Clock size={32} className="text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-semibold text-foreground">No assignment history</p>
            <p className="text-xs text-muted-foreground">
              This territory has not been assigned yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => {
              const isEditing = editingId === a.id;
              const isReturned = Boolean(a.returnedAt);
              const isActive = a.status === 'assigned' || a.status === 'active';

              return (
                <div
                  key={a.id}
                  className={`p-3.5 rounded-2xl border transition-all text-xs space-y-2.5 ${
                    isActive ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        {a.serviceGroupId ? (
                          <Users size={13} className="text-blue-500 shrink-0" />
                        ) : (
                          <User size={13} className="text-primary shrink-0" />
                        )}
                        <span>{a.groupName || a.assigneeName || 'Publisher / Group'}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {a.serviceGroupId ? 'Service Group Assignment' : 'Personal Assignment'}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[9px] uppercase font-bold ${
                        isActive
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : isReturned
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {a.status}
                    </Badge>
                  </div>

                  {!isEditing ? (
                    <div className="space-y-2 pt-1 border-t border-border/50">
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <div>
                          <span className="font-semibold text-foreground">Assigned:</span>{' '}
                          {a.assignedAt ? new Date(a.assignedAt).toLocaleDateString() : '—'}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">Returned / Revoked:</span>{' '}
                          {a.returnedAt ? (
                            <span className="text-foreground font-medium">
                              {new Date(a.returnedAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              Active in Field
                            </span>
                          )}
                        </div>
                        {a.dueAt && (
                          <div>
                            <span className="font-semibold text-foreground">Due:</span>{' '}
                            {new Date(a.dueAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      {a.notes && (
                        <p className="text-muted-foreground italic text-[11px]">
                          Note: &ldquo;{a.notes}&rdquo;
                        </p>
                      )}

                      {canAdjustDates && (
                        <div className="flex justify-end pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-xl text-xs gap-1 font-semibold hover:border-primary/50 hover:bg-primary/5"
                            onClick={() => startEdit(a)}
                          >
                            <Pencil size={11} />
                            <span>Adjust Dates</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2 border-t border-border/80 bg-muted/20 p-2.5 rounded-xl">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Date Assigned *</Label>
                          <Input
                            type="date"
                            value={assignedAt}
                            onChange={(e) => setAssignedAt(e.target.value)}
                            className="h-8 rounded-xl text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">
                            Date Returned / Revoked
                          </Label>
                          <Input
                            type="date"
                            value={returnedAt}
                            onChange={(e) => setReturnedAt(e.target.value)}
                            className="h-8 rounded-xl text-xs"
                            placeholder="Leave empty if active"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Due Date (Optional)</Label>
                          <Input
                            type="date"
                            value={dueAt}
                            onChange={(e) => setDueAt(e.target.value)}
                            className="h-8 rounded-xl text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Notes (Optional)</Label>
                          <Input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Reason for adjustment / notes"
                            className="h-8 rounded-xl text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 rounded-xl text-xs"
                          onClick={cancelEdit}
                          disabled={isUpdating}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 rounded-xl text-xs font-semibold"
                          onClick={() => handleSave(a)}
                          disabled={isUpdating || !assignedAt}
                        >
                          {isUpdating ? 'Saving…' : 'Save Dates'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl text-xs"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
