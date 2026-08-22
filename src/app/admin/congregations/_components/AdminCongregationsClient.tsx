'use client';

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Edit2,
  ExternalLink,
  MapPin,
  MoreVertical,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminNav } from '@/components/admin-nav';
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
  useCongregations,
  useCreateCongregation,
  useCurrentUser,
  useDeleteCongregation,
  useUpdateCongregation,
} from '@/hooks';
import { findDuplicateCongregation, normalizeCongregationName } from '@/lib/congregations';
import { UserRole } from '@/lib/roles';
import type { Congregation } from '@/types/api';

export default function AdminCongregationsPage() {
  const { congregations = [], isLoading: loading } = useCongregations();
  const { user } = useCurrentUser();
  const { create: createCong, isCreating } = useCreateCongregation();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Create Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newCountry, setNewCountry] = useState('');

  // Edit Modal State
  const [editCong, setEditCong] = useState<Congregation | null>(null);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const { update: updateCong, isUpdating } = useUpdateCongregation(editCong?.id || '');

  // Delete Modal State
  const [deleteCong, setDeleteCong] = useState<Congregation | null>(null);
  const { remove: removeCong, isDeleting } = useDeleteCongregation(deleteCong?.id || '');

  const totalActive = congregations.filter((c) => c.status === 'active').length;
  const totalInactive = congregations.length - totalActive;

  const filtered = useMemo(() => {
    let list = congregations;
    if (statusFilter !== 'all') {
      list = list.filter((c) => c.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q) ||
          c.country?.toLowerCase().includes(q) ||
          c.slug?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [congregations, search, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = normalizeCongregationName(newName);
    if (!cleanName) {
      toast.error('Please enter a congregation name.');
      return;
    }
    const duplicate = findDuplicateCongregation(cleanName, congregations);
    if (duplicate) {
      toast.error(`A congregation named "${duplicate.name}" already exists.`);
      return;
    }
    try {
      await createCong({
        name: cleanName,
        city: newCity.trim() ? normalizeCongregationName(newCity) : null,
        country: newCountry.trim() ? normalizeCongregationName(newCountry) : null,
        status: 'active',
        createdById: user.id || null,
      });
      toast.success(`Congregation "${cleanName}" created successfully!`);
      setCreateOpen(false);
      setNewName('');
      setNewCity('');
      setNewCountry('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create congregation.');
    }
  };

  const handleOpenEdit = (cong: Congregation) => {
    setEditCong(cong);
    setEditName(cong.name);
    setEditCity(cong.city || '');
    setEditCountry(cong.country || '');
    setEditStatus((cong.status as 'active' | 'inactive') || 'active');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCong) return;
    const cleanName = normalizeCongregationName(editName);
    if (!cleanName) {
      toast.error('Congregation name cannot be empty.');
      return;
    }
    const duplicate = findDuplicateCongregation(cleanName, congregations, editCong.id);
    if (duplicate) {
      toast.error(`A congregation named "${duplicate.name}" already exists.`);
      return;
    }
    try {
      await updateCong({
        name: cleanName,
        city: editCity.trim() ? normalizeCongregationName(editCity) : null,
        country: editCountry.trim() ? normalizeCongregationName(editCountry) : null,
        status: editStatus,
      });
      toast.success(`Congregation "${cleanName}" updated successfully!`);
      setEditCong(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update congregation.');
    }
  };

  const handleDelete = async () => {
    if (!deleteCong) return;
    try {
      await removeCong();
      toast.success(`Congregation "${deleteCong.name}" and associated records deleted.`);
      setDeleteCong(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete congregation.');
    }
  };

  return (
    <ProtectedPage requiredRole={UserRole.ADMIN}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 min-w-0 w-full">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
              <Link href="/admin/dashboard">
                <ArrowLeft size={16} />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
                Congregations Manager
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Register, configure, and manage all congregation workspaces
              </p>
            </div>
          </div>

          <Button
            size="sm"
            className="rounded-xl text-xs gap-1.5 h-9 font-semibold shadow-xs"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={14} />
            <span>Create Congregation</span>
          </Button>
        </div>

        {/* Admin Navigation */}
        <AdminNav />

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search by name, city, country, or slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-10 rounded-xl text-xs"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'all'
                  ? 'bg-card text-foreground shadow-xs border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({congregations.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'active'
                  ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-xs border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active ({totalActive})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'inactive'
                  ? 'bg-card text-orange-600 dark:text-orange-400 shadow-xs border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Inactive ({totalInactive})
            </button>
          </div>
        </div>

        {/* Congregations List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-border p-6">
            <Building2 size={40} className="text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No congregations found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search
                ? 'Try adjusting your search filter'
                : 'Click "Create Congregation" to add one'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((cong) => {
              const isActive = cong.status === 'active';
              return (
                <Card
                  key={cong.id}
                  className="bg-card border-border shadow-xs hover:border-primary/30 transition-all"
                >
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground truncate">
                          {cong.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={`capitalize text-[10px] font-bold px-2 py-0.5 ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
                          }`}
                        >
                          {cong.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-muted-foreground flex-wrap text-[11px]">
                        {(cong.city || cong.country) && (
                          <span className="flex items-center gap-1">
                            <MapPin size={11} className="shrink-0" />
                            <span>
                              {cong.city ? `${cong.city}, ` : ''}
                              {cong.country || ''}
                            </span>
                          </span>
                        )}
                        <span>
                          Slug:{' '}
                          <strong className="text-foreground/80 font-mono text-[10px]">
                            {cong.slug}
                          </strong>
                        </span>
                        <span>Created: {new Date(cong.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs h-8 gap-1 font-semibold"
                      >
                        <Link href={`/congregation/${cong.id}/dashboard`}>
                          <span>Workspace</span>
                          <ExternalLink size={11} />
                        </Link>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                          >
                            <MoreVertical size={15} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl text-xs">
                          <DropdownMenuItem
                            onClick={() => handleOpenEdit(cong)}
                            className="cursor-pointer gap-2"
                          >
                            <Edit2 size={13} />
                            <span>Edit Details</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteCong(cong)}
                            className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 size={13} />
                            <span>Delete Congregation</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Congregation Dialog */}
        <ResponsiveDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Create New Congregation"
          description="Register a new congregation workspace on Kanataran."
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="createName" className="text-xs font-semibold">
                Congregation Name *
              </Label>
              <Input
                id="createName"
                placeholder="e.g. Metro Central"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-10 rounded-xl text-xs"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="createCity" className="text-xs font-semibold">
                  City / Locality (Optional)
                </Label>
                <Input
                  id="createCity"
                  placeholder="e.g. San Francisco"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="createCountry" className="text-xs font-semibold">
                  Country (Optional)
                </Label>
                <Input
                  id="createCountry"
                  placeholder="e.g. United States"
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => setCreateOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="rounded-xl text-xs font-semibold"
                disabled={isCreating || !newName.trim()}
              >
                {isCreating ? 'Creating…' : 'Create Workspace'}
              </Button>
            </div>
          </form>
        </ResponsiveDialog>

        {/* Edit Congregation Dialog */}
        <ResponsiveDialog
          open={Boolean(editCong)}
          onOpenChange={(open) => {
            if (!open) setEditCong(null);
          }}
          title="Edit Congregation"
          description={`Update details for ${editCong?.name}.`}
        >
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="editName" className="text-xs font-semibold">
                Congregation Name *
              </Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-10 rounded-xl text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="editCity" className="text-xs font-semibold">
                  City
                </Label>
                <Input
                  id="editCity"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editCountry" className="text-xs font-semibold">
                  Country
                </Label>
                <Input
                  id="editCountry"
                  value={editCountry}
                  onChange={(e) => setEditCountry(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editStatus" className="text-xs font-semibold">
                Workspace Status
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditStatus('active')}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    editStatus === 'active'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setEditStatus('inactive')}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    editStatus === 'inactive'
                      ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Inactive
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => setEditCong(null)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="rounded-xl text-xs font-semibold"
                disabled={isUpdating || !editName.trim()}
              >
                {isUpdating ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </ResponsiveDialog>

        {/* Delete Congregation Dialog */}
        <ResponsiveDialog
          open={Boolean(deleteCong)}
          onOpenChange={(open) => {
            if (!open) setDeleteCong(null);
          }}
          title="Delete Congregation"
          description={`Permanently remove "${deleteCong?.name}" and all associated data.`}
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle size={14} className="shrink-0" />
                <span>Irreversible Action</span>
              </p>
              <p>
                Deleting this congregation will permanently purge its territories, assignments,
                publisher membership records, service groups, and map records.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => setDeleteCong(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="rounded-xl text-xs font-semibold"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>
      </div>
    </ProtectedPage>
  );
}
