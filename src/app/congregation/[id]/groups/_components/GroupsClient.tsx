'use client';

import { FolderOpen, Plus, Search, Trash2, Users } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

interface Group {
  id: string;
  name: string;
  members: { id: string; user?: { name: string } }[];
  createdAt: string;
}

export default function CongregationGroupsPage() {
  const params = useParams();
  const congregationId = params?.id as string;

  const [groups, setGroups] = useState<Group[]>([]);
  const [filtered, setFiltered] = useState<Group[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      const json = await fetchWithAuth<{ data: Group[] }>(`/api/congregations/${congregationId}/groups`);
      if (json.data) {
        setGroups(json.data);
        setFiltered(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [congregationId]);

  useEffect(() => {
    if (congregationId) fetchGroups();
  }, [congregationId, fetchGroups]);

  useEffect(() => {
    if (!search) {
      setFiltered(groups);
    } else {
      const s = search.toLowerCase();
      setFiltered(groups.filter((g) => g.name.toLowerCase().includes(s)));
    }
  }, [search, groups]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    try {
      await fetchWithAuth(`/api/congregations/${congregationId}/groups`, {
        method: 'POST',
        body: JSON.stringify({ name: createName }),
      });
      setCreateOpen(false);
      setCreateName('');
      await fetchGroups();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await fetchWithAuth(
        `/api/congregations/${congregationId}/groups/${deleteTarget.id}/members`,
        { method: 'DELETE' }
      );
      // Note: No direct group delete endpoint in current API — just close for now
      setDeleteOpen(false);
      await fetchGroups();
    } catch {
      // ignore
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <ProtectedPage congregationId={congregationId}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Groups</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage service groups in this congregation
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={14} />
            New Group
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search groups…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen size={44} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? 'No groups match your search' : 'No groups yet'}
            </p>
            {!search && (
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus size={14} />
                Create First Group
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((g) => (
              <Card key={g.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <FolderOpen size={18} className="text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{g.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Created {new Date(g.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 -mt-1 -mr-1"
                      onClick={() => {
                        setDeleteTarget(g);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>

                  <div className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users size={13} />
                    <span>{g.members?.length ?? 0} members</span>
                  </div>

                  {g.members && g.members.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {g.members.slice(0, 3).map((m) => (
                        <span
                          key={m.id}
                          className="text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
                        >
                          {m.user?.name ?? 'Member'}
                        </span>
                      ))}
                      {g.members.length > 3 && (
                        <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                          +{g.members.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Group</DialogTitle>
            <DialogDescription>Create a new service group.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            {createError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                {createError}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="g-name">Group Name *</Label>
              <Input
                id="g-name"
                required
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Monday Group"
                disabled={createLoading}
              />
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLoading}>
                {createLoading ? 'Creating…' : 'Create Group'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
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
