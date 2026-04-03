'use client';

import { AlertCircle, Building2, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProtectedPage } from '@/components/protected-page';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { UserRole } from '@/db';
import { apiClient } from '@/lib/api-client';
import { useCongregations } from '@/hooks';
import type { Congregation } from '@/types/api';
import {
  createCongregationSchema,
  type CreateCongregationFormData,
  updateCongregationSchema,
  type UpdateCongregationFormData,
} from '@/schemas';

export default function AdminCongregationsPage() {
  const { congregations, isLoading: loading, mutate: mutateCongregations } = useCongregations();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return congregations;
    const s = search.toLowerCase();
    return congregations.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.city?.toLowerCase().includes(s) ||
        c.country?.toLowerCase().includes(s) ||
        c.status.toLowerCase().includes(s)
    );
  }, [search, congregations]);
  const [error] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const createForm = useForm<CreateCongregationFormData>({
    resolver: zodResolver(createCongregationSchema),
    defaultValues: { name: '', city: '', country: '' },
  });

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Congregation | null>(null);
  const editForm = useForm<UpdateCongregationFormData>({
    resolver: zodResolver(updateCongregationSchema),
    defaultValues: { name: '', city: '', country: '' },
  });

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Congregation | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleCreate(data: CreateCongregationFormData) {
    setCreateError('');
    try {
      await apiClient.post('/api/congregations', {
        name: data.name,
        city: data.city,
        country: data.country,
      });
      setCreateOpen(false);
      createForm.reset();
      await mutateCongregations();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create congregation');
    }
  }

  function openEdit(c: Congregation) {
    setEditTarget(c);
    editForm.reset({ name: c.name, city: c.city ?? '', country: c.country ?? '' });
    setEditOpen(true);
  }

  async function handleEdit(data: UpdateCongregationFormData) {
    if (!editTarget) return;
    try {
      await apiClient.patch(`/api/congregations/${editTarget.id}`, {
        name: data.name,
        city: data.city,
        country: data.country,
      });
      setEditOpen(false);
      await mutateCongregations();
    } catch {
      // ignore
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiClient.delete(`/api/congregations/${deleteTarget.id}`);
      setDeleteOpen(false);
      await mutateCongregations();
    } catch {
      // ignore
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <ProtectedPage requiredRole={UserRole.ADMIN}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 min-w-0 w-full">
        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Congregations</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage all congregations in the system
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={14} />
            New Congregation
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search congregations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table / list */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-x-auto w-full max-w-full">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Building2 size={40} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? 'No congregations match your search' : 'No congregations yet'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Location
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Created
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 size={14} className="text-primary" />
                        </div>
                        <span className="font-medium text-foreground">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {[c.city, c.country].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        variant="outline"
                        className={
                          c.status === 'active'
                            ? 'text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20 dark:text-green-400'
                            : 'text-muted-foreground'
                        }
                      >
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/congregation/${c.id}/dashboard`}>
                            <Eye size={14} />
                          </Link>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                          <Pencil size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => {
                            setDeleteTarget(c);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) createForm.reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Congregation</DialogTitle>
            <DialogDescription>Create a new congregation in the system.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4 mt-2">
            {createError && (
              <Alert variant="destructive">
                <AlertCircle size={16} className="absolute left-4 top-3.5" />
                <AlertDescription className="pl-6">{createError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Name *</Label>
              <Input
                id="c-name"
                {...createForm.register('name')}
                placeholder="e.g. Central Congregation"
                disabled={createForm.formState.isSubmitting}
                aria-invalid={!!createForm.formState.errors.name}
                className={
                  createForm.formState.errors.name
                    ? 'border-destructive focus-visible:ring-destructive'
                    : ''
                }
              />
              {createForm.formState.errors.name && (
                <p className="text-xs text-destructive mt-1">
                  {createForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-city">City</Label>
                <Input
                  id="c-city"
                  {...createForm.register('city')}
                  placeholder="Lagos"
                  disabled={createForm.formState.isSubmitting}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-country">Country</Label>
                <Input
                  id="c-country"
                  {...createForm.register('country')}
                  placeholder="Nigeria"
                  disabled={createForm.formState.isSubmitting}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createForm.formState.isSubmitting}>
                {createForm.formState.isSubmitting ? 'Creating…' : 'Create Congregation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) editForm.reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Congregation</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="e-name">Name *</Label>
              <Input
                id="e-name"
                {...editForm.register('name')}
                disabled={editForm.formState.isSubmitting}
                aria-invalid={!!editForm.formState.errors.name}
                className={
                  editForm.formState.errors.name
                    ? 'border-destructive focus-visible:ring-destructive'
                    : ''
                }
              />
              {editForm.formState.errors.name && (
                <p className="text-xs text-destructive mt-1">
                  {editForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="e-city">City</Label>
                <Input
                  id="e-city"
                  {...editForm.register('city')}
                  disabled={editForm.formState.isSubmitting}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-country">Country</Label>
                <Input
                  id="e-country"
                  {...editForm.register('country')}
                  disabled={editForm.formState.isSubmitting}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editForm.formState.isSubmitting}>
                {editForm.formState.isSubmitting ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Congregation?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and all its data.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedPage>
  );
}
