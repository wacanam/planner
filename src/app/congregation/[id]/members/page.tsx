'use client';

import { Plus, Search, Trash2, Users } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import { Badge } from '@/components/ui/badge';
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

interface Member {
  id: string;
  userId: string;
  user: { name: string; email: string };
  congregationRole?: string | null;
  joinedAt: string;
}

export default function CongregationMembersPage() {
  const params = useParams();
  const congregationId = params?.id as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [filtered, setFiltered] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Add member dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Remove confirm
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const json = await fetchWithAuth(`/api/congregations/${congregationId}/members`);
      if (json.data) {
        setMembers(json.data);
        setFiltered(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [congregationId]);

  useEffect(() => {
    if (congregationId) fetchMembers();
  }, [congregationId, fetchMembers]);

  useEffect(() => {
    if (!search) {
      setFiltered(members);
    } else {
      const s = search.toLowerCase();
      setFiltered(
        members.filter(
          (m) =>
            m.user?.name?.toLowerCase().includes(s) ||
            m.user?.email?.toLowerCase().includes(s) ||
            m.congregationRole?.toLowerCase().includes(s)
        )
      );
    }
  }, [search, members]);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      await fetchWithAuth(`/api/congregations/${congregationId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId: addUserId }),
      });
      setAddOpen(false);
      setAddUserId('');
      await fetchMembers();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setAddLoading(false);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoveLoading(true);
    try {
      await fetchWithAuth(`/api/congregations/${congregationId}/members/${removeTarget.userId}`, {
        method: 'DELETE',
      });
      setRemoveOpen(false);
      await fetchMembers();
    } catch {
      // ignore
    } finally {
      setRemoveLoading(false);
    }
  }

  return (
    <ProtectedPage congregationId={congregationId}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Members</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage congregation members and roles
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={14} />
            Add Member
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search members…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-x-auto w-full">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Users size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {search ? 'No members match your search' : 'No members yet'}
                </p>
              </div>
            ) : (
              <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Member
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Role
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Joined
                      </th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                              {m.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{m.user?.name}</p>
                              <p className="text-xs text-muted-foreground">{m.user?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {m.congregationRole ? (
                            <Badge variant="outline" className="capitalize text-xs">
                              {m.congregationRole.replace('_', ' ')}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">member</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">
                          {new Date(m.joinedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => {
                              setRemoveTarget(m);
                              setRemoveOpen(true);
                            }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            )}
        </div>
      </div>

      {/* Add member dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Enter the user ID to add them to this congregation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4 mt-2">
            {addError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                {addError}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="add-user-id">User ID *</Label>
              <Input
                id="add-user-id"
                required
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                placeholder="UUID of the user"
                disabled={addLoading}
              />
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addLoading}>
                {addLoading ? 'Adding…' : 'Add Member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove confirm */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member?</DialogTitle>
            <DialogDescription>
              Remove <strong>{removeTarget?.user?.name}</strong> from this congregation?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="ghost" onClick={() => setRemoveOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={removeLoading}>
              {removeLoading ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedPage>
  );
}
