'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Compass,
  History,
  LayoutGrid,
  LayoutList,
  Map as MapIcon,
  MapPin,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  useCongregationAssignments,
  useCongregationGroups,
  useCongregationMembers,
  useCongregationTerritories,
  useCreateAssignment,
  useCreateTerritory,
  useCurrentUser,
  useDeleteAssignment,
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
  canApproveAssignments,
  canCreateTerritory,
  canDeleteAssignment,
  canDeleteTerritory,
  canEditTerritory,
} from '@/lib/permissions';
import { formatDate, formatDaysAgo } from '@/lib/date-utils';
import { calculateTerritoryCoverage } from '@/lib/territory-coverage';
import { findDuplicateTerritory, getNextCongregationTerritoryNumber } from '@/lib/territories';
import {
  type CreateTerritoryFormData,
  createTerritorySchema,
  type UpdateTerritoryFormData,
  updateTerritorySchema,
} from '@/schemas';
import type { Assignment, Household, Territory } from '@/types/api';

const statusConfig: Record<
  string,
  { label: string; dot: string; badge: string }
> = {
  available: {
    label: 'Available',
    dot: 'bg-emerald-500',
    badge:
      'text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40',
  },
  assigned: {
    label: 'Assigned',
    dot: 'bg-blue-500',
    badge:
      'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40',
  },
  pending: {
    label: 'Pending',
    dot: 'bg-amber-500',
    badge:
      'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40',
  },
  completed: {
    label: 'Completed',
    dot: 'bg-slate-500',
    badge:
      'text-slate-700 border-slate-200 bg-slate-50 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800/40',
  },
  overdue: {
    label: 'Overdue',
    dot: 'bg-rose-500',
    badge:
      'text-rose-700 border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40',
  },
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
  const { assignments = [] } = useCongregationAssignments(congregationId);
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

  // Map territoryId -> Array<Assignment>
  const assignmentsByTerritoryId = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of assignments) {
      if (a.territoryId) {
        if (!map.has(a.territoryId)) map.set(a.territoryId, []);
        map.get(a.territoryId)?.push(a);
      }
    }
    return map;
  }, [assignments]);

  // Map territoryId -> latest visit date string across its households
  const lastActivityByTerritoryId = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of households) {
      if (h.territoryId && h.lastVisitDate) {
        const current = map.get(h.territoryId) || '';
        if (h.lastVisitDate > current) {
          map.set(h.territoryId, h.lastVisitDate);
        }
      }
    }
    return map;
  }, [households]);

  const searchParams = useSearchParams();
  const initialStatus = searchParams?.get('status');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(
    initialStatus && ['available', 'assigned', 'pending', 'completed', 'overdue'].includes(initialStatus)
      ? initialStatus
      : 'all'
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTerritory, setEditTerritory] = useState<Territory | null>(null);
  const [assignTerritory, setAssignTerritory] = useState<Territory | null>(null);
  const [assignDate, setAssignDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [revokeConfirmTerritory, setRevokeConfirmTerritory] = useState<Territory | null>(null);
  const [revokeDate, setRevokeDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [revokeTerritoryStatus, setRevokeTerritoryStatus] = useState<string>('available');
  const [revokeAssignmentStatus, setRevokeAssignmentStatus] = useState<string>('completed');
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

  const stats = useMemo(() => {
    let availableCount = 0;
    let assignedCount = 0;
    let completedCount = 0;
    let totalDoors = 0;
    let workedDoors = 0;

    for (const t of territories) {
      if (t.status === 'available') availableCount++;
      else if (t.status === 'assigned' || t.status === 'pending') assignedCount++;
      else if (t.status === 'completed') completedCount++;

      const cov = coverageByTerritoryId.get(t.id);
      const d = cov?.totalDoors ?? t.householdsCount ?? 0;
      const w =
        cov?.workedDoors ??
        (d > 0 && t.coveragePercent
          ? Math.round((parseFloat(t.coveragePercent) / 100) * d)
          : 0);
      totalDoors += d;
      workedDoors += w;
    }

    const overallCoverage = totalDoors > 0 ? Math.round((workedDoors / totalDoors) * 100) : 0;

    return {
      total: territories.length,
      available: availableCount,
      assigned: assignedCount,
      completed: completedCount,
      totalDoors,
      workedDoors,
      overallCoverage,
    };
  }, [territories, coverageByTerritoryId]);

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
      const q = search.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.number.toLowerCase().includes(q) ||
          t.city?.toLowerCase().includes(q) ||
          t.publisherName?.toLowerCase().includes(q) ||
          t.groupName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [territories, statusFilter, search]);

  const handleOpenCreate = () => {
    const nextNumber = getNextCongregationTerritoryNumber(territories);
    createForm.reset({
      number: nextNumber,
      name: '',
      type: 'regular',
      city: congregation?.city || '',
    });
    setCreateDialogOpen(true);
  };

  const handleCreateSubmit = async (data: CreateTerritoryFormData) => {
    const duplicate = findDuplicateTerritory(data.number, territories);
    if (duplicate) {
      toast.error(`Territory #${duplicate.number} already exists in this congregation.`);
      return;
    }
    try {
      await createTerritory({
        ...data,
        congregationId,
      });
      toast.success(`Territory #${data.number.trim()} created successfully`);
      setCreateDialogOpen(false);
      createForm.reset();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create territory');
    }
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
    const duplicate = findDuplicateTerritory(data.number, territories, editTerritory.id);
    if (duplicate) {
      toast.error(`Territory #${duplicate.number} already exists in this congregation.`);
      return;
    }
    try {
      await updateTerritory(editTerritory.id, {
        number: data.number.trim(),
        name: data.name.trim(),
        city: data.city?.trim() || null,
        type: data.type || 'regular',
        notes: data.notes?.trim() || null,
      });
      toast.success(`Territory #${data.number.trim()} updated successfully`);
      setEditTerritory(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update territory');
    }
  };

  const handleAssignSubmit = async () => {
    if (!assignTerritory) return;
    const endorserName = user.name || user.email || 'Territory Servant';
    const effectiveAssignedAt = assignDate || new Date().toISOString();
    const isDirect = canApproveAssignments(user.role, user.congregationRole);

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
        creatorRole: user.role,
        creatorCongregationRole: user.congregationRole,
      });
      toast.success(
        isDirect
          ? `Territory #${assignTerritory.number} assigned to ${targetName}`
          : `Territory #${assignTerritory.number} assigned to ${targetName} and submitted for endorsement`
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
        creatorRole: user.role,
        creatorCongregationRole: user.congregationRole,
      });
      toast.success(
        isDirect
          ? `Territory #${assignTerritory.number} assigned to ${groupName}`
          : `Territory #${assignTerritory.number} assigned to ${groupName} and submitted for endorsement`
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
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-4 sm:space-y-6 pb-24 lg:pb-8 w-full min-w-0">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Territory Directory
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Congregation territory cards, boundaries, and publisher assignments
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none rounded-xl text-xs font-semibold gap-1.5 h-8.5 px-2 sm:px-3 bg-background shadow-xs hover:border-primary/50 hover:bg-primary/5 min-w-0"
            >
              <Link href={`/congregation/${congregationId}/territories/overview`}>
                <MapIcon size={13} className="text-primary shrink-0" />
                <span className="truncate">
                  <span className="hidden sm:inline">Congregation </span>Map
                </span>
              </Link>
            </Button>
            {canCreate && (
              <>
                <Button
                  variant="outline"
                  size="sm"
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
                  className="flex-1 sm:flex-none rounded-xl text-xs font-semibold gap-1.5 h-8.5 px-2 sm:px-3 min-w-0"
                  title="Configure congregation default map center"
                >
                  <MapPin size={13} className="shrink-0" />
                  <span className="truncate">
                    <span className="hidden sm:inline">Map </span>Center
                  </span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleOpenCreate}
                  className="flex-1 sm:flex-none rounded-xl text-xs font-semibold gap-1.5 shadow-sm h-8.5 px-2 sm:px-3.5 min-w-0"
                >
                  <Plus size={14} className="shrink-0" />
                  <span className="truncate">
                    <span>Create</span>
                    <span className="hidden sm:inline"> Territory</span>
                  </span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Compact Interactive Stats Summary Banner */}
        <div className="p-3 sm:p-4 rounded-2xl border bg-card border-border shadow-2xs space-y-2.5">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {/* Total */}
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/30'
                  : 'bg-muted/30 border-border/60 hover:bg-muted/50'
              }`}
            >
              <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground">Total</p>
              <p className="text-base sm:text-lg font-bold text-foreground leading-tight mt-0.5">
                {stats.total}
              </p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">
                {stats.totalDoors} doors
              </p>
            </button>

            {/* Available */}
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'available' ? 'all' : 'available')}
              className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                statusFilter === 'available'
                  ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30'
                  : 'bg-muted/30 border-border/60 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Available
                </p>
              </div>
              <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-tight mt-0.5">
                {stats.available}
              </p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">Ready</p>
            </button>

            {/* Assigned */}
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'assigned' ? 'all' : 'assigned')}
              className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                statusFilter === 'assigned'
                  ? 'bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/30'
                  : 'bg-muted/30 border-border/60 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Assigned
                </p>
              </div>
              <p className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400 leading-tight mt-0.5">
                {stats.assigned}
              </p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">In field</p>
            </button>

            {/* Desktop Coverage Column */}
            <div className="hidden sm:flex flex-col justify-between p-2.5 rounded-xl border border-border/60 bg-muted/30">
              <p className="text-[11px] font-semibold text-muted-foreground">Coverage</p>
              <div className="flex items-baseline justify-between">
                <p className="text-lg font-bold text-foreground">{stats.overallCoverage}%</p>
                <span className="text-[10px] text-muted-foreground">
                  {stats.workedDoors}/{stats.totalDoors}
                </span>
              </div>
            </div>
          </div>

          {/* Congregation Coverage Progress Bar (Unified) */}
          <div className="space-y-1 pt-1 border-t border-border/50">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-medium flex items-center gap-1">
                <span>Congregation Door Coverage:</span>
                <strong className="text-foreground font-semibold">
                  {stats.workedDoors}/{stats.totalDoors} worked
                </strong>
              </span>
              <span className="font-bold text-foreground">{stats.overallCoverage}%</span>
            </div>
            <div className="h-1.5 w-full bg-muted/80 dark:bg-muted/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(stats.overallCoverage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Search, Filter Pills & View Switcher */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Search by #, name, publisher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-8 h-9 rounded-xl text-xs bg-card"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X size={13} />
                </button>
              ) : null}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-muted/50 p-0.5 rounded-xl border border-border shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Grid Card View"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Compact List View"
              >
                <LayoutList size={14} />
              </button>
            </div>
          </div>

          {/* Swipeable Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { id: 'all', label: 'All', count: stats.total },
              {
                id: 'available',
                label: 'Available',
                count: stats.available,
                dot: 'bg-emerald-500',
              },
              { id: 'assigned', label: 'Assigned', count: stats.assigned, dot: 'bg-blue-500' },
              {
                id: 'completed',
                label: 'Completed',
                count: stats.completed,
                dot: 'bg-slate-400',
              },
            ].map((f) => {
              const isSelected = statusFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                      : 'bg-card text-muted-foreground hover:text-foreground border-border hover:border-border/80'
                  }`}
                >
                  {f.dot && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary-foreground' : f.dot}`}
                    />
                  )}
                  <span>{f.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                      isSelected
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Territory Content */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-52 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-3xl border border-border p-6 space-y-3">
            <MapPin size={40} className="text-muted-foreground/30 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-foreground">No territories found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search || statusFilter !== 'all'
                  ? 'Try adjusting your search query or filter chips.'
                  : 'Get started by creating your congregation’s first territory card.'}
              </p>
            </div>
            {(search || statusFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs h-8"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                }}
              >
                Reset Filters
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => {
              const cov = coverageByTerritoryId.get(t.id);
              const totalDoors = cov?.totalDoors ?? t.householdsCount ?? 0;
              const workedDoors =
                cov?.workedDoors ??
                (totalDoors > 0 && t.coveragePercent
                  ? Math.round((parseFloat(t.coveragePercent) / 100) * totalDoors)
                  : 0);
              const coveragePercent =
                cov?.coveragePercent ??
                Math.min(100, Math.round(parseFloat(t.coveragePercent || '0')));
              const isDone = coveragePercent >= 100;
              const statusInfo = statusConfig[t.status] || {
                label: t.status,
                dot: 'bg-muted-foreground',
                badge: 'text-muted-foreground border-border bg-muted/30',
              };

              // Compute Days Assigned / Days Available
              const nowMs = Date.now();
              const territoryAssignments = assignmentsByTerritoryId.get(t.id) || [];
              const activeAssignment = territoryAssignments.find(
                (a) =>
                  a.status === 'active' ||
                  a.status === 'assigned' ||
                  a.status === 'pending_approval' ||
                  (!a.returnedAt && a.assignedAt)
              );

              const assignedDate = activeAssignment?.assignedAt;
              const daysAssigned = assignedDate
                ? Math.max(0, Math.floor((nowMs - new Date(assignedDate).getTime()) / 86400000))
                : null;

              const lastCompletedAssignment = territoryAssignments.find(
                (a) => a.returnedAt || a.status === 'completed'
              );
              const availableSinceDate =
                lastCompletedAssignment?.returnedAt || t.updatedAt || t.createdAt;
              const daysAvailable = availableSinceDate
                ? Math.max(0, Math.floor((nowMs - new Date(availableSinceDate).getTime()) / 86400000))
                : null;

              const lastActivityDate = lastActivityByTerritoryId.get(t.id);

              return (
                <Card
                  key={t.id}
                  className="bg-card border-border shadow-xs hover:border-primary/50 transition-all group flex flex-col justify-between min-w-0 rounded-2xl overflow-hidden"
                >
                  <CardContent className="p-4 sm:p-5 space-y-3.5 min-w-0 flex flex-col justify-between h-full">
                    {/* Header: Number Badge, Title, City, Status */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <span className="font-extrabold text-xs text-primary bg-primary/10 border border-primary/20 rounded-lg px-2 py-1 shrink-0">
                            #{t.number}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h2
                              className="font-bold text-sm text-foreground line-clamp-1 leading-snug break-words group-hover:text-primary transition-colors"
                              title={t.name}
                            >
                              {t.name}
                            </h2>
                            <p
                              className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1"
                              title={t.city || 'Congregation Area'}
                            >
                              <MapPin size={11} className="shrink-0 text-muted-foreground/70" />
                              <span>{t.city || 'Congregation Area'}</span>
                            </p>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-bold py-0.5 px-2 shrink-0 flex items-center gap-1 rounded-lg ${statusInfo.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                          <span>{statusInfo.label}</span>
                        </Badge>
                      </div>

                      {/* Visual Door Coverage Progress Bar */}
                      <div className="pt-2 border-t border-border/60 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground text-[11px] font-medium">
                            Doors:{' '}
                            <strong className="text-foreground font-semibold">
                              {workedDoors}/{totalDoors} worked
                            </strong>
                          </span>
                          <span className="font-bold text-foreground text-[11px]">
                            {coveragePercent}%
                          </span>
                        </div>
                        <div className="h-2 w-full bg-muted/80 dark:bg-muted/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isDone
                                ? 'bg-emerald-500'
                                : coveragePercent > 0
                                  ? 'bg-primary'
                                  : 'bg-transparent'
                            }`}
                            style={{ width: `${Math.min(coveragePercent, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Timing & Last Activity Insight Strip */}
                      <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[11px]">
                        {/* Days Assigned or Days Available */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-muted/35 text-muted-foreground border border-border/40 min-w-0">
                          <Clock
                            size={12}
                            className={
                              t.status === 'available'
                                ? 'text-emerald-500 shrink-0'
                                : daysAssigned !== null && daysAssigned >= 120
                                  ? 'text-amber-500 shrink-0'
                                  : 'text-blue-500 shrink-0'
                            }
                          />
                          <span className="truncate">
                            {t.status === 'available' ? (
                              <span>
                                Avail:{' '}
                                <strong className="text-foreground font-semibold">
                                  {daysAvailable !== null ? `${daysAvailable}d` : '—'}
                                </strong>
                              </span>
                            ) : (
                              <span>
                                Assigned:{' '}
                                <strong
                                  className={
                                    daysAssigned !== null && daysAssigned >= 120
                                      ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                      : 'text-foreground font-semibold'
                                  }
                                >
                                  {daysAssigned !== null ? `${daysAssigned}d` : '—'}
                                </strong>
                                {daysAssigned !== null && daysAssigned >= 120 && (
                                  <span className="text-[9px] text-amber-500 font-bold ml-0.5" title="Overdue (> 4 months)">
                                    ⚠️
                                  </span>
                                )}
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Last Activity in Territory */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-muted/35 text-muted-foreground border border-border/40 min-w-0">
                          <Compass size={12} className="text-primary shrink-0" />
                          <span
                            className="truncate"
                            title={
                              lastActivityDate
                                ? `Last Activity: ${formatDate(lastActivityDate)} (${formatDaysAgo(lastActivityDate)})`
                                : 'No door activity recorded yet'
                            }
                          >
                            {lastActivityDate ? (
                              <span>
                                Activity:{' '}
                                <strong className="text-foreground font-semibold">
                                  {formatDaysAgo(lastActivityDate)}
                                </strong>
                              </span>
                            ) : (
                              <span className="text-muted-foreground/70">No activity yet</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Assignment Info Chip */}
                      <div>
                        {t.groupName ? (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 bg-muted/40 px-2.5 py-1.5 rounded-xl border border-border/40">
                            <Users size={13} className="text-primary shrink-0" />
                            <span className="truncate min-w-0" title={t.groupName}>
                              Group:{' '}
                              <strong className="text-foreground font-semibold">
                                {t.groupName}
                              </strong>
                            </span>
                          </div>
                        ) : t.publisherName ? (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 bg-muted/40 px-2.5 py-1.5 rounded-xl border border-border/40">
                            <User size={13} className="text-primary shrink-0" />
                            <span className="truncate min-w-0" title={t.publisherName}>
                              Publisher:{' '}
                              <strong className="text-foreground font-semibold">
                                {t.publisherName}
                              </strong>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 min-w-0 bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-500/20">
                            <CheckCircle2 size={13} className="shrink-0" />
                            <span className="font-medium truncate">Ready for assignment</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-2 border-t border-border/60 flex items-center gap-2 min-w-0">
                      {/* Primary Map Studio CTA */}
                      <Button
                        asChild
                        size="sm"
                        className="flex-1 rounded-xl text-xs font-semibold gap-1.5 shadow-xs h-8.5"
                      >
                        <Link href={`/congregation/${congregationId}/territories/${t.id}`}>
                          <MapPin size={13} className="shrink-0" />
                          <span>Map Studio</span>
                        </Link>
                      </Button>

                      {/* Contextual Action Button */}
                      {canEdit && (
                        <>
                          {t.status === 'available' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl text-xs gap-1 h-8.5 px-3 font-semibold text-primary border-primary/30 hover:bg-primary/5 shrink-0"
                              onClick={() => {
                                setAssignTerritory(t);
                                setAssignType('publisher');
                                setAssignUserId('');
                                setAssignGroupId('');
                              }}
                              title="Assign territory"
                            >
                              <UserCheck size={13} className="shrink-0" />
                              <span>Assign</span>
                            </Button>
                          ) : t.status === 'assigned' || t.status === 'pending' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl text-xs gap-1 h-8.5 px-2.5 text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 shrink-0"
                              onClick={() => setRevokeConfirmTerritory(t)}
                              title="Revoke assignment"
                            >
                              <RotateCcw size={12} className="shrink-0" />
                              <span>Revoke</span>
                            </Button>
                          ) : null}

                          {/* Dropdown Menu for History, Edit, Delete */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl text-xs h-8.5 w-8.5 p-0 text-muted-foreground hover:text-foreground shrink-0"
                                title="More options"
                              >
                                <MoreVertical size={14} />
                                <span className="sr-only">More options</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 rounded-xl shadow-md border-border bg-popover"
                            >
                              <DropdownMenuItem
                                onClick={() => setHistoryTerritory(t)}
                                className="text-xs gap-2 cursor-pointer"
                              >
                                <History size={13} className="text-muted-foreground" />
                                <span>Assignment History</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenEdit(t)}
                                className="text-xs gap-2 cursor-pointer"
                              >
                                <Pencil size={13} className="text-muted-foreground" />
                                <span>Edit Details</span>
                              </DropdownMenuItem>
                              {canDelete && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setDeleteConfirmTerritory(t);
                                      setDeleteConfirmInput('');
                                    }}
                                    className="text-xs gap-2 text-destructive focus:text-destructive cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                    <span>Delete Territory</span>
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Compact List View */
          <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border/60">
            {filtered.map((t) => {
              const cov = coverageByTerritoryId.get(t.id);
              const totalDoors = cov?.totalDoors ?? t.householdsCount ?? 0;
              const workedDoors =
                cov?.workedDoors ??
                (totalDoors > 0 && t.coveragePercent
                  ? Math.round((parseFloat(t.coveragePercent) / 100) * totalDoors)
                  : 0);
              const coveragePercent =
                cov?.coveragePercent ??
                Math.min(100, Math.round(parseFloat(t.coveragePercent || '0')));
              const isDone = coveragePercent >= 100;
              const statusInfo = statusConfig[t.status] || {
                label: t.status,
                dot: 'bg-muted-foreground',
                badge: 'text-muted-foreground border-border bg-muted/30',
              };

              // Compute Days Assigned / Days Available
              const nowMs = Date.now();
              const territoryAssignments = assignmentsByTerritoryId.get(t.id) || [];
              const activeAssignment = territoryAssignments.find(
                (a) =>
                  a.status === 'active' ||
                  a.status === 'assigned' ||
                  a.status === 'pending_approval' ||
                  (!a.returnedAt && a.assignedAt)
              );

              const assignedDate = activeAssignment?.assignedAt;
              const daysAssigned = assignedDate
                ? Math.max(0, Math.floor((nowMs - new Date(assignedDate).getTime()) / 86400000))
                : null;

              const lastCompletedAssignment = territoryAssignments.find(
                (a) => a.returnedAt || a.status === 'completed'
              );
              const availableSinceDate =
                lastCompletedAssignment?.returnedAt || t.updatedAt || t.createdAt;
              const daysAvailable = availableSinceDate
                ? Math.max(0, Math.floor((nowMs - new Date(availableSinceDate).getTime()) / 86400000))
                : null;

              const lastActivityDate = lastActivityByTerritoryId.get(t.id);

              return (
                <div
                  key={t.id}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="font-extrabold text-xs text-primary bg-primary/10 border border-primary/20 rounded-lg px-2 py-1 shrink-0">
                      #{t.number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/congregation/${congregationId}/territories/${t.id}`}
                          className="font-bold text-sm text-foreground hover:text-primary transition-colors truncate"
                        >
                          {t.name}
                        </Link>
                        <Badge
                          variant="outline"
                          className={`text-[9px] uppercase font-bold py-0.2 px-1.5 rounded-md flex items-center gap-1 ${statusInfo.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                          <span>{statusInfo.label}</span>
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-2 flex-wrap">
                        <span>{t.city || 'Congregation Area'}</span>
                        <span>•</span>
                        {t.groupName ? (
                          <span className="font-medium text-foreground">Group: {t.groupName}</span>
                        ) : t.publisherName ? (
                          <span className="font-medium text-foreground">{t.publisherName}</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            Ready
                          </span>
                        )}
                        <span>•</span>
                        {t.status === 'available' ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {daysAvailable !== null ? `Avail ${daysAvailable}d` : 'Available'}
                          </span>
                        ) : (
                          <span className={daysAssigned !== null && daysAssigned >= 120 ? 'text-amber-600 font-semibold' : ''}>
                            {daysAssigned !== null ? `Assigned ${daysAssigned}d` : 'Assigned'}
                            {daysAssigned !== null && daysAssigned >= 120 ? ' ⚠️' : ''}
                          </span>
                        )}
                        {lastActivityDate && (
                          <>
                            <span>•</span>
                            <span
                              className="text-muted-foreground"
                              title={`Last Activity: ${formatDate(lastActivityDate)}`}
                            >
                              Activity {formatDaysAgo(lastActivityDate)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Coverage Mini Bar */}
                  <div className="flex items-center gap-3 sm:w-44 shrink-0">
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                        <span>
                          {workedDoors}/{totalDoors}
                        </span>
                        <span className="font-bold text-foreground">{coveragePercent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted/80 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isDone
                              ? 'bg-emerald-500'
                              : coveragePercent > 0
                                ? 'bg-primary'
                                : 'bg-transparent'
                          }`}
                          style={{ width: `${Math.min(coveragePercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* List Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-xl text-xs font-semibold gap-1 px-3 shadow-2xs hover:border-primary/50 hover:bg-primary/5"
                    >
                      <Link href={`/congregation/${congregationId}/territories/${t.id}`}>
                        <MapPin size={12} className="text-primary" />
                        <span>Map Studio</span>
                      </Link>
                    </Button>

                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-xl text-xs h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <MoreVertical size={14} />
                            <span className="sr-only">More options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 rounded-xl shadow-md border-border bg-popover"
                        >
                          {t.status === 'available' ? (
                            <DropdownMenuItem
                              onClick={() => {
                                setAssignTerritory(t);
                                setAssignType('publisher');
                                setAssignUserId('');
                                setAssignGroupId('');
                              }}
                              className="text-xs gap-2 cursor-pointer"
                            >
                              <UserCheck size={13} className="text-primary" />
                              <span>Assign Territory</span>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => setRevokeConfirmTerritory(t)}
                              className="text-xs gap-2 cursor-pointer"
                            >
                              <RotateCcw size={13} className="text-muted-foreground" />
                              <span>Revoke Assignment</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setHistoryTerritory(t)}
                            className="text-xs gap-2 cursor-pointer"
                          >
                            <History size={13} className="text-muted-foreground" />
                            <span>Assignment History</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenEdit(t)}
                            className="text-xs gap-2 cursor-pointer"
                          >
                            <Pencil size={13} className="text-muted-foreground" />
                            <span>Edit Details</span>
                          </DropdownMenuItem>
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setDeleteConfirmTerritory(t);
                                  setDeleteConfirmInput('');
                                }}
                                className="text-xs gap-2 text-destructive focus:text-destructive cursor-pointer"
                              >
                                <Trash2 size={13} />
                                <span>Delete Territory</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
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
                  autoFocus
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

            <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl text-xs w-full sm:w-auto justify-center"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-9 rounded-xl text-xs font-semibold w-full sm:w-auto justify-center shadow-xs"
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

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t border-border mt-2">
              {canDelete && editTerritory ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-xl text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 w-full sm:w-auto justify-center"
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
              ) : null}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-xl text-xs w-full sm:w-auto justify-center"
                  onClick={() => setEditTerritory(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-9 rounded-xl text-xs font-semibold w-full sm:w-auto justify-center shadow-xs"
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
              <div className="relative">
                <div className="flex items-center justify-between w-full h-9 px-3 rounded-xl border border-input bg-card text-xs font-medium text-foreground cursor-pointer shadow-2xs hover:border-primary/50 transition-colors">
                  <span className="flex items-center gap-2">
                    <Calendar size={13} className="text-primary" />
                    <span>{formatDate(assignDate)}</span>
                  </span>
                  <ChevronDown size={13} className="text-muted-foreground" />
                </div>
                <input
                  type="date"
                  value={assignDate}
                  onChange={(e) => {
                    if (e.target.value) setAssignDate(e.target.value);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-transparent"
                  aria-label="Assignment Date"
                />
              </div>
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

            <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl text-xs w-full sm:w-auto justify-center"
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
                className="h-9 rounded-xl text-xs font-semibold w-full sm:w-auto justify-center shadow-xs"
                onClick={handleAssignSubmit}
                disabled={
                  (assignType === 'publisher' && !assignUserId) ||
                  (assignType === 'group' && !assignGroupId) ||
                  assigningTerritory ||
                  !assignDate
                }
              >
                {assigningTerritory ? 'Assigning…' : 'Confirm Assign'}
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

            <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl text-xs w-full sm:w-auto justify-center"
                onClick={() => setMapCenterOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-9 rounded-xl text-xs font-semibold w-full sm:w-auto justify-center shadow-xs"
                onClick={handleSaveMapCenter}
                disabled={updatingCenter || !centerLat || !centerLng}
              >
                {updatingCenter ? 'Saving…' : 'Save Coordinates'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>

        {/* Revoke / Return Territory Confirmation Dialog with Status & Formatted Date */}
        <ResponsiveDialog
          open={!!revokeConfirmTerritory}
          onOpenChange={(op) => {
            if (!op) {
              setRevokeConfirmTerritory(null);
              setRevokeDate(new Date().toISOString().slice(0, 10));
              setRevokeTerritoryStatus('available');
              setRevokeAssignmentStatus('completed');
            }
          }}
          title="Revoke / Return Territory"
          description={
            revokeConfirmTerritory
              ? `End assignment for Territory #${revokeConfirmTerritory.number} — ${revokeConfirmTerritory.name}`
              : 'Revoke Territory'
          }
        >
          {revokeConfirmTerritory && (
            <div className="space-y-4 pt-1 text-xs">
              {/* Current Assignment Summary Banner */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">
                    #{revokeConfirmTerritory.number} {revokeConfirmTerritory.name}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {revokeConfirmTerritory.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {revokeConfirmTerritory.groupName ? (
                    <span>
                      Assigned to Group:{' '}
                      <strong className="text-foreground">
                        {revokeConfirmTerritory.groupName}
                      </strong>
                    </span>
                  ) : revokeConfirmTerritory.publisherName ? (
                    <span>
                      Assigned to Publisher:{' '}
                      <strong className="text-foreground">
                        {revokeConfirmTerritory.publisherName}
                      </strong>
                    </span>
                  ) : (
                    <span>Currently Assigned</span>
                  )}
                </p>
              </div>

              {/* Status Selectors Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Territory Target Status */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Territory Status After Return *
                  </Label>
                  <Select
                    value={revokeTerritoryStatus}
                    onValueChange={setRevokeTerritoryStatus}
                  >
                    <SelectTrigger className="h-9 rounded-xl text-xs bg-card">
                      <SelectValue placeholder="Select territory status" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="available">
                        🟢 Available (Ready for checkout)
                      </SelectItem>
                      <SelectItem value="completed">
                        ⚪ Completed (Mark cycle finished)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Assignment History Outcome Status */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Assignment Record Outcome *
                  </Label>
                  <Select
                    value={revokeAssignmentStatus}
                    onValueChange={setRevokeAssignmentStatus}
                  >
                    <SelectTrigger className="h-9 rounded-xl text-xs bg-card">
                      <SelectValue placeholder="Select assignment outcome" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="completed">
                        ✅ Completed (Fully worked)
                      </SelectItem>
                      <SelectItem value="returned">
                        ↺ Returned (Early / Partial)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Formatted Effective Date Input & Quick Select */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Effective Return / Revocation Date *
                </Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <div className="flex items-center justify-between w-full h-9 px-3 rounded-xl border border-input bg-card text-xs font-medium text-foreground cursor-pointer shadow-2xs hover:border-primary/50 transition-colors">
                      <span className="flex items-center gap-2">
                        <Calendar size={13} className="text-primary" />
                        <span>{formatDate(revokeDate)}</span>
                      </span>
                      <ChevronDown size={13} className="text-muted-foreground" />
                    </div>
                    <input
                      type="date"
                      value={revokeDate}
                      onChange={(e) => {
                        if (e.target.value) setRevokeDate(e.target.value);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-transparent"
                      aria-label="Effective Return / Revocation Date"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-2.5 rounded-xl text-xs shrink-0 cursor-pointer"
                    onClick={() => setRevokeDate(new Date().toISOString().slice(0, 10))}
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-2.5 rounded-xl text-xs shrink-0 cursor-pointer"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 1);
                      setRevokeDate(d.toISOString().slice(0, 10));
                    }}
                  >
                    Yesterday
                  </Button>
                </div>
              </div>

              {/* Dynamic summary text */}
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                This will close the current assignment as{' '}
                <strong className="text-foreground">{revokeAssignmentStatus}</strong> effective{' '}
                <strong className="text-foreground">{formatDate(revokeDate)}</strong>, and set Territory #{revokeConfirmTerritory.number} status to{' '}
                <strong className="text-foreground">{revokeTerritoryStatus}</strong>.
              </p>

              <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-xl text-xs w-full sm:w-auto justify-center"
                  onClick={() => {
                    setRevokeConfirmTerritory(null);
                    setRevokeDate(new Date().toISOString().slice(0, 10));
                    setRevokeTerritoryStatus('available');
                    setRevokeAssignmentStatus('completed');
                  }}
                  disabled={revokingTerritory}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-9 rounded-xl text-xs font-semibold shadow-xs w-full sm:w-auto justify-center"
                  disabled={revokingTerritory || !revokeDate}
                  onClick={async () => {
                    if (revokeConfirmTerritory) {
                      const isDirect = canApproveAssignments(user.role, user.congregationRole);
                      await revokeTerritory(
                        revokeConfirmTerritory.id,
                        revokeDate,
                        user.role,
                        user.congregationRole,
                        user.id,
                        user.name || user.email,
                        revokeTerritoryStatus,
                        revokeAssignmentStatus
                      );
                      toast.success(
                        isDirect
                          ? `Territory #${revokeConfirmTerritory.number} marked as ${revokeTerritoryStatus}`
                          : `Territory #${revokeConfirmTerritory.number} revocation submitted for Service Overseer approval`
                      );
                      setRevokeConfirmTerritory(null);
                      setRevokeDate(new Date().toISOString().slice(0, 10));
                      setRevokeTerritoryStatus('available');
                      setRevokeAssignmentStatus('completed');
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
          canAdjustDates={canAdjustAssignmentDates(user.role, user.congregationRole)}
          canDelete={canDeleteAssignment(user.role, user.congregationRole)}
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

              <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-xl text-xs w-full sm:w-auto justify-center"
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
                  className="h-9 rounded-xl text-xs font-semibold gap-1.5 shadow-xs w-full sm:w-auto justify-center"
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
                  <span className="truncate">
                    {deletingTerritory ? 'Deleting…' : 'Delete Territory'}
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
  canDelete = false,
}: {
  territory: Territory | null;
  onClose: () => void;
  canAdjustDates: boolean;
  canDelete?: boolean;
}) {
  const { assignments = [], isLoading } = useTerritoryAssignments(territory?.id);
  const { update: updateAssignment, isPending: isUpdating } = useUpdateAssignment();
  const { remove: deleteAssignment, isPending: isDeleting } = useDeleteAssignment();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);
  const [status, setStatus] = useState('active');
  const [assignedAt, setAssignedAt] = useState('');
  const [returnedAt, setReturnedAt] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');

  const startEdit = (a: Assignment) => {
    setEditingId(a.id);
    setStatus(a.status || 'active');
    setAssignedAt(a.assignedAt ? a.assignedAt.slice(0, 10) : '');
    setReturnedAt(a.returnedAt ? a.returnedAt.slice(0, 10) : '');
    setDueAt(a.dueAt ? a.dueAt.slice(0, 10) : '');
    setNotes(a.notes || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setStatus('active');
    setAssignedAt('');
    setReturnedAt('');
    setDueAt('');
    setNotes('');
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    const today = new Date().toISOString().slice(0, 10);
    if ((newStatus === 'completed' || newStatus === 'returned') && !returnedAt) {
      setReturnedAt(today);
    } else if (newStatus === 'active' || newStatus === 'pending_approval') {
      setReturnedAt('');
    }
  };

  const handleSave = async (a: Assignment) => {
    try {
      await updateAssignment({
        id: a.id,
        status,
        assignedAt: assignedAt || null,
        returnedAt: returnedAt || null,
        dueAt: dueAt || null,
        notes: notes.trim() || null,
      });
      toast.success('Assignment status, dates, and details updated');
      cancelEdit();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update assignment');
    }
  };

  const handleDelete = async () => {
    if (!deletingAssignmentId) return;
    try {
      await deleteAssignment(deletingAssignmentId);
      toast.success('Assignment history record deleted');
      if (editingId === deletingAssignmentId) cancelEdit();
      setDeletingAssignmentId(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete assignment record');
    }
  };

  return (
    <>
      <ResponsiveDialog
        open={Boolean(territory)}
        onOpenChange={(op) => !op && onClose()}
        title={territory ? `Territory #${territory.number} Assignment History` : 'Assignment History'}
        description={
          territory
            ? `${territory.name} — ${assignments.length} assignment record${assignments.length === 1 ? '' : 's'}`
            : ''
        }
      >
        <div className="space-y-3.5 max-h-[75vh] overflow-y-auto pr-1.5">
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
                const isReturned =
                  Boolean(a.returnedAt) || a.status === 'completed' || a.status === 'returned';
                const isActive = a.status === 'assigned' || a.status === 'active';

                // Calculate duration in days if start date exists
                let durationDays: number | null = null;
                if (a.assignedAt) {
                  const start = new Date(a.assignedAt).getTime();
                  const end = a.returnedAt ? new Date(a.returnedAt).getTime() : Date.now();
                  if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
                    durationDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
                  }
                }

                return (
                  <div
                    key={a.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all space-y-3 ${
                      isActive
                        ? 'border-primary/40 bg-primary/[0.03] dark:bg-primary/[0.06] ring-1 ring-primary/20 shadow-xs'
                        : 'border-border/80 bg-card hover:border-border'
                    }`}
                  >
                    {/* Card Header: Assignee + Status */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`p-2 rounded-xl shrink-0 ${
                            a.serviceGroupId
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {a.serviceGroupId ? <Users size={16} /> : <User size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-foreground truncate">
                            {a.groupName || a.assigneeName || 'Publisher / Group'}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {a.serviceGroupId
                              ? 'Service Group Assignment'
                              : 'Personal Assignment'}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] uppercase font-bold tracking-wide shrink-0 px-2.5 py-0.5 rounded-lg ${
                          isActive
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : isReturned
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {a.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    {!isEditing ? (
                      <div className="space-y-3 pt-2.5 border-t border-border/60">
                        {/* Responsive Date & Duration Flow */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-2 text-xs">
                          {/* Assigned Date Chip */}
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 text-muted-foreground">
                            <Calendar size={13} className="text-primary shrink-0" />
                            <span>
                              <strong className="text-foreground font-semibold">Assigned:</strong>{' '}
                              {a.assignedAt ? formatDate(a.assignedAt) : '—'}
                            </span>
                          </div>

                          {/* Returned or Active Status Chip */}
                          <div
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
                              a.returnedAt
                                ? 'bg-muted/50 text-muted-foreground'
                                : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20'
                            }`}
                          >
                            {a.returnedAt ? (
                              <RotateCcw size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                            ) : (
                              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                            )}
                            <span>
                              <strong className="text-foreground font-semibold">
                                {a.returnedAt ? 'Returned:' : 'Status:'}
                              </strong>{' '}
                              {a.returnedAt ? formatDate(a.returnedAt) : 'Active in Field'}
                            </span>
                          </div>

                          {/* Due Date Chip (if set) */}
                          {a.dueAt && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 text-muted-foreground">
                              <Clock size={13} className="text-muted-foreground shrink-0" />
                              <span>
                                <strong className="text-foreground font-semibold">Due:</strong>{' '}
                                {formatDate(a.dueAt)}
                              </span>
                            </div>
                          )}

                          {/* Duration Chip */}
                          {durationDays !== null && (
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted/30 text-muted-foreground font-medium">
                              <span>⏳</span>
                              <span>
                                {durationDays} {durationDays === 1 ? 'day' : 'days'}
                                {!a.returnedAt ? ' in field' : ''}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {a.notes && (
                          <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50 text-xs text-muted-foreground italic">
                            &ldquo;{a.notes}&rdquo;
                          </div>
                        )}

                        {/* Action Buttons Row */}
                        {(canAdjustDates || canDelete) && (
                          <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 border-t border-border/40">
                            {canDelete && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 rounded-xl text-xs gap-1.5 font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer px-3"
                                onClick={() => setDeletingAssignmentId(a.id)}
                                title="Delete accidental/wrong assignment history entry"
                              >
                                <Trash2 size={12} />
                                <span>Delete</span>
                              </Button>
                            )}
                            {canAdjustDates && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-xl text-xs gap-1.5 font-semibold hover:border-primary/50 hover:bg-primary/5 cursor-pointer px-3.5 shadow-xs"
                                onClick={() => startEdit(a)}
                              >
                                <Pencil size={12} />
                                <span>Adjust Details</span>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2.5 border-t border-border/80 bg-muted/20 p-3 rounded-xl">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold">Assignment Status *</Label>
                            <Select value={status} onValueChange={handleStatusChange}>
                              <SelectTrigger className="h-9 rounded-xl text-xs">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active in Field</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="returned">Returned</SelectItem>
                                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold">Date Assigned *</Label>
                            <div className="relative">
                              <div className="flex items-center justify-between w-full h-9 px-3 rounded-xl border border-input bg-card text-xs font-medium text-foreground cursor-pointer shadow-2xs hover:border-primary/50 transition-colors">
                                <span className="flex items-center gap-2">
                                  <Calendar size={13} className="text-primary shrink-0" />
                                  <span>{assignedAt ? formatDate(assignedAt) : 'Select date'}</span>
                                </span>
                                <ChevronDown size={13} className="text-muted-foreground shrink-0" />
                              </div>
                              <input
                                type="date"
                                value={assignedAt}
                                onChange={(e) => {
                                  if (e.target.value) setAssignedAt(e.target.value);
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-transparent"
                                aria-label="Date Assigned"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold">
                              Date Returned / Revoked
                            </Label>
                            <div className="relative">
                              <div className="flex items-center justify-between w-full h-9 px-3 rounded-xl border border-input bg-card text-xs font-medium text-foreground cursor-pointer shadow-2xs hover:border-primary/50 transition-colors">
                                <span className="flex items-center gap-2">
                                  <Calendar size={13} className="text-primary shrink-0" />
                                  <span>{returnedAt ? formatDate(returnedAt) : 'None (Active in field)'}</span>
                                </span>
                                <ChevronDown size={13} className="text-muted-foreground shrink-0" />
                              </div>
                              <input
                                type="date"
                                value={returnedAt}
                                onChange={(e) => setReturnedAt(e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-transparent"
                                aria-label="Date Returned"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold">Due Date (Optional)</Label>
                            <div className="relative">
                              <div className="flex items-center justify-between w-full h-9 px-3 rounded-xl border border-input bg-card text-xs font-medium text-foreground cursor-pointer shadow-2xs hover:border-primary/50 transition-colors">
                                <span className="flex items-center gap-2">
                                  <Calendar size={13} className="text-muted-foreground shrink-0" />
                                  <span>{dueAt ? formatDate(dueAt) : 'No due date'}</span>
                                </span>
                                <ChevronDown size={13} className="text-muted-foreground shrink-0" />
                              </div>
                              <input
                                type="date"
                                value={dueAt}
                                onChange={(e) => setDueAt(e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-transparent"
                                aria-label="Due Date"
                              />
                            </div>
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-[11px] font-semibold">Notes (Optional)</Label>
                            <Input
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Reason for adjustment / notes"
                              className="h-9 rounded-xl text-xs bg-card"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-2.5 border-t border-border/50">
                          {canDelete ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8.5 rounded-xl text-xs gap-1.5 font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer w-full sm:w-auto justify-center"
                              onClick={() => setDeletingAssignmentId(a.id)}
                            >
                              <Trash2 size={12} />
                              <span>Delete Record</span>
                            </Button>
                          ) : null}
                          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8.5 rounded-xl text-xs px-3 cursor-pointer w-full sm:w-auto justify-center"
                              onClick={cancelEdit}
                              disabled={isUpdating}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="h-8.5 rounded-xl text-xs font-semibold px-4 cursor-pointer w-full sm:w-auto justify-center shadow-xs"
                              onClick={() => handleSave(a)}
                              disabled={isUpdating || !assignedAt}
                            >
                              {isUpdating ? 'Saving…' : 'Save Changes'}
                            </Button>
                          </div>
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
              className="rounded-xl text-xs h-8 px-4 cursor-pointer"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* Delete Assignment Confirmation Dialog */}
      <ResponsiveDialog
        open={Boolean(deletingAssignmentId)}
        onOpenChange={(op) => !op && setDeletingAssignmentId(null)}
        title="Delete Assignment Record"
        description="Permanently delete this accidental or wrong assignment record"
      >
        <div className="space-y-3 pt-1 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            Are you sure you want to permanently delete this assignment history entry? This action is intended for removing accidental or duplicate assignment records.
          </p>
          <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[11px]">
            ⚠️ If this is the currently active assignment, the territory will automatically be marked available for checkout.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl text-xs"
              onClick={() => setDeletingAssignmentId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="rounded-xl text-xs font-semibold"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete Record'}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
}
