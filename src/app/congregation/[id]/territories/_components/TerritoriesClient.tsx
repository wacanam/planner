'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, Plus, Search, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
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
  useCongregationMembers,
  useCongregationTerritories,
  useCreateAssignment,
  useCreateTerritory,
  useCurrentUser,
  useHouseholds,
  useUpdateCongregation,
} from '@/hooks';
import { isTerritoryServant } from '@/lib/permissions';
import { calculateTerritoryCoverage } from '@/lib/territory-coverage';
import { type CreateTerritoryFormData, createTerritorySchema } from '@/schemas';
import type { Household, Territory } from '@/types/api';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  available: 'text-green-700 border-green-200 bg-green-50 dark:bg-green-950/40 dark:text-green-400',
  assigned: 'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400',
  completed:
    'text-purple-700 border-purple-200 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400',
  archived: 'text-muted-foreground border-border bg-muted/40',
};

export default function TerritoriesClient() {
  const params = useParams();
  const _router = useRouter();
  const congregationId = (params?.id as string) || '';
  const { user } = useCurrentUser();
  const isServant = isTerritoryServant(user.role);

  const { congregation } = useCongregation(congregationId);
  const { update: updateCongregation, isUpdating: updatingCenter } =
    useUpdateCongregation(congregationId);

  const { data: territories = [], isLoading } = useCongregationTerritories(congregationId);
  const { data: members = [] } = useCongregationMembers(congregationId);
  const { households = [] } = useHouseholds({ congregationId });
  const { create: createTerritory, isPending: creatingTerritory } =
    useCreateTerritory(congregationId);
  const { create: createAssignment, isPending: assigningTerritory } = useCreateAssignment();

  const coverageByTerritoryId = useMemo(() => {
    const map = new Map<string, { totalDoors: number; workedDoors: number; coveragePercent: number }>();
    const byTerritory = new Map<string, Household[]>();
    for (const h of households) {
      if (h.territoryId) {
        if (!byTerritory.has(h.territoryId)) byTerritory.set(h.territoryId, []);
        byTerritory.get(h.territoryId)!.push(h);
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
  const [assignTerritory, setAssignTerritory] = useState<Territory | null>(null);
  const [assignUserId, setAssignUserId] = useState('');

  const [mapCenterOpen, setMapCenterOpen] = useState(false);
  const [centerLat, setCenterLat] = useState('');
  const [centerLng, setCenterLng] = useState('');

  const createForm = useForm<CreateTerritoryFormData>({
    resolver: zodResolver(createTerritorySchema) as any,
    defaultValues: {
      number: '',
      name: '',
      type: 'regular',
      city: '',
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

  const handleAssignSubmit = async () => {
    if (!assignTerritory || !assignUserId) return;
    await createAssignment({
      territoryId: assignTerritory.id,
      userId: assignUserId,
      assignedAt: new Date().toISOString(),
    });
    setAssignTerritory(null);
    setAssignUserId('');
  };

  const handleSaveMapCenter = async () => {
    const lat = parseFloat(centerLat);
    const lng = parseFloat(centerLng);
    if (isNaN(lat) || isNaN(lng)) {
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
          {isServant && (
            <div className="flex items-center gap-2">
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
            </div>
          )}
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
                className="bg-card border-border shadow-xs hover:border-primary/50 transition-all group flex flex-col justify-between"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-primary">#{t.number}</span>
                        <h2 className="font-bold text-sm text-foreground truncate">{t.name}</h2>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t.city || 'Congregation Area'}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase font-bold py-0.5 px-2 ${statusColors[t.status] ?? ''}`}
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
                        {coverageByTerritoryId.get(t.id)?.coveragePercent ?? Math.round(parseFloat(t.coveragePercent || '0'))}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      asChild
                      size="sm"
                      className="flex-1 rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
                    >
                      <Link href={`/congregation/${congregationId}/territories/${t.id}`}>
                        <MapPin size={13} />
                        <span>Studio Map</span>
                      </Link>
                    </Button>

                    {isServant && t.status === 'available' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs gap-1"
                        onClick={() => setAssignTerritory(t)}
                      >
                        <UserCheck size={13} />
                        <span>Assign</span>
                      </Button>
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

        {/* Assign Territory Dialog */}
        <ResponsiveDialog
          open={!!assignTerritory}
          onOpenChange={(op) => !op && setAssignTerritory(null)}
          title="Assign Territory Card"
          description={
            assignTerritory ? `Assign #${assignTerritory.number} — ${assignTerritory.name}` : ''
          }
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Select Publisher *</Label>
              <Select value={assignUserId} onValueChange={setAssignUserId}>
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue placeholder="Choose a member…" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border max-h-48">
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

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl text-xs"
                onClick={() => setAssignTerritory(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl text-xs font-semibold"
                onClick={handleAssignSubmit}
                disabled={!assignUserId || assigningTerritory}
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
              These coordinates will be used as the default starting center in Territory Studio for territories without drawn boundary coordinates.
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
      </main>
      <BottomTabBar />
    </ProtectedPage>
  );
}
