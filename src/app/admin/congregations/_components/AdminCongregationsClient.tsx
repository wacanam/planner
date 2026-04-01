'use client';

import { AlertCircle, Building2, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
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
import { fetchWithAuth } from '@/lib/api-client';

interface Congregation {
  id: string;
  name: string;
  city?: string;
  country?: string;
  status: string;
  createdAt: string;
}

export default function AdminCongregationsPage() {
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [filtered, setFiltered] = useState<Congregation[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createCity, setCreateCity] = useState('');
  const [createCountry, setCreateCountry] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Congregation | null>(null);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Congregation | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCongregations = useCallback(async () => {
    try {
      const json = await fetchWithAuth<{ data: Congregation[] }>('/api/congregations');
      if (json.data) {
        setCongregations(json.data);
        setFiltered(json.data);
      }
    } catch {
      setError('Failed to load congregations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCongregations();
  }, [fetchCongregations]);

  useEffect(() => {
    if (!search) {
      setFiltered(congregations);
    } else {
      const s = search.toLowerCase();
      setFiltered(
        congregations.filter(
          (c) =>
            c.name.toLowerCase().includes(s) ||
            c.city?.toLowerCase().includes(s) ||
            c.country?.toLowerCase().includes(s)
        )
      );
    }
  }, [search, congregations]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    try {
      await fetchWithAuth('/api/congregations', {
        method: 'POST',
        body: JSON.stringify({ name: createName, city: createCity, country: createCountry }),
      });
      setCreateOpen(false);
      setCreateName('');
      setCreateCity('');
      setCreateCountry('');
      await fetchCongregations();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create congregation');
    } finally {
      setCreateLoading(false);
    }
  }

  function openEdit(c: Congregation) {
    setEditTarget(c);
    setEditName(c.name);
    setEditCity(c.city ?? '');
    setEditCountry(c.country ?? '');
    setEditOpen(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditLoading(true);
    try {
      await fetchWithAuth(`/api/congregations/${editTarget.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName, city: editCity, country: editCountry }),
      });
      setEditOpen(false);
      await fetchCongregations();
    } catch {
      // ignore
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await fetchWithAuth(`/api/congregations/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteOpen(false);
      await fetchCongregations();
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
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{error}</div>
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

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Congregation</DialogTitle>
            <DialogDescription>Create a new congregation in the system.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
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
                required
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Central Congregation"
                disabled={createLoading}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-city">City</Label>
                <Input
                  id="c-city"
                  value={createCity}
                  onChange={(e) => setCreateCity(e.target.value)}
                  placeholder="Lagos"
                  disabled={createLoading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-country">Country</Label>
                <Input
                  id="c-country"
                  value={createCountry}
                  onChange={(e) => setCreateCountry(e.target.value)}
                  placeholder="Nigeria"
                  disabled={createLoading}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLoading}>
                {createLoading ? 'Creating…' : 'Create Congregation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Congregation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="e-name">Name *</Label>
              <Input
                id="e-name"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={editLoading}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="e-city">City</Label>
                <Input
                  id="e-city"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  disabled={editLoading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-country">Country</Label>
                <Input
                  id="e-country"
                  value={editCountry}
                  onChange={(e) => setEditCountry(e.target.value)}
                  disabled={editLoading}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? 'Saving…' : 'Save Changes'}
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
