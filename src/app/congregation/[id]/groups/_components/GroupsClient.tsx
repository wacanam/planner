'use client';

import { FolderOpen, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProtectedPage } from '@/components/protected-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthSession as useSession } from '@/lib/firebase/auth';
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
import type { Group } from '@/types/api';
import {
  useCongregationGroups,
  useCongregationMembers,
  useCreateGroup,
  useDeleteGroup,
  useUpdateGroup,
} from '@/hooks';
import { createGroupSchema, type CreateGroupFormData } from '@/schemas';

export default function CongregationGroupsPage() {
  const params = useParams();
  const congregationId = params?.id as string;
  const { data: session } = useSession();
  const sessionUser = session?.user as { id?: string; role?: string } | undefined;

  const { data: groupsData, isLoading: loading } = useCongregationGroups(congregationId);
  const groups = groupsData;
  const { data: members } = useCongregationMembers(congregationId);
  const { create: createGroupMutation } = useCreateGroup(congregationId);
  const { update: updateGroup } = useUpdateGroup(congregationId);
  const { remove: deleteGroup } = useDeleteGroup(congregationId);
  const [search, setSearch] = useState('');
  const myRole =
    members.find((member) => member.userId === sessionUser?.id)?.congregationRole ?? null;
  const canManageGroups =
    myRole === 'service_overseer' ||
    ['SUPER_ADMIN', 'ADMIN', 'SERVICE_OVERSEER'].includes(sessionUser?.role ?? '');

  const filtered = useMemo(() => {
    if (!search) return groups;
    const s = search.toLowerCase();
    return groups.filter((g) => g.name.toLowerCase().includes(s));
  }, [search, groups]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const createForm = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: '' },
  });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Group | null>(null);
  const [editError, setEditError] = useState('');
  const editForm = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: '' },
  });
  const [membersOpen, setMembersOpen] = useState(false);
  const [membersTarget, setMembersTarget] = useState<Group | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [membersError, setMembersError] = useState('');
  const [membersSaving, setMembersSaving] = useState(false);

  async function handleCreate(data: CreateGroupFormData) {
    setCreateError('');
    try {
      await createGroupMutation({ name: data.name });
      setCreateOpen(false);
      createForm.reset();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create group');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteGroup(deleteTarget.id);
      setDeleteOpen(false);
    } catch {
      // ignore
    } finally {
      setDeleteLoading(false);
    }
  }

  function openEdit(group: Group) {
    setEditTarget(group);
    setEditError('');
    editForm.reset({ name: group.name });
    setEditOpen(true);
  }

  async function handleEdit(data: CreateGroupFormData) {
    if (!editTarget) return;
    setEditError('');
    try {
      await updateGroup({ id: editTarget.id, name: data.name });
      setEditOpen(false);
      editForm.reset();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update group');
    }
  }

  function openMembers(group: Group) {
    setMembersTarget(group);
    setSelectedMemberIds(group.members.map((member) => member.userId));
    setMembersError('');
    setMembersOpen(true);
  }

  function toggleMember(userId: string) {
    setSelectedMemberIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  }

  async function handleSaveMembers() {
    if (!membersTarget) return;
    setMembersError('');
    setMembersSaving(true);
    try {
      await updateGroup({
        id: membersTarget.id,
        members: members
          .filter((member) => selectedMemberIds.includes(member.userId))
          .map((member) => ({
            id: member.id,
            userId: member.userId,
            user: {
              name: member.user?.name ?? null,
              email: member.user?.email ?? null,
            },
          })),
      });
      setMembersOpen(false);
      setMembersTarget(null);
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : 'Failed to update group members');
    } finally {
      setMembersSaving(false);
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
          {canManageGroups && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              New Group
            </Button>
          )}
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
            {!search && canManageGroups && (
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
                    {canManageGroups && (
                      <div className="flex items-center gap-1 -mt-1 -mr-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openMembers(g)}
                          aria-label="Manage members"
                        >
                          <Users size={13} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(g)}
                          aria-label="Edit group"
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => {
                            setDeleteTarget(g);
                            setDeleteOpen(true);
                          }}
                          aria-label="Delete group"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    )}
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

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) createForm.reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Group</DialogTitle>
            <DialogDescription>Create a new service group.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4 mt-2">
            {createError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                {createError}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="g-name">Group Name *</Label>
              <Input
                id="g-name"
                {...createForm.register('name')}
                placeholder="e.g. Monday Group"
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
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createForm.formState.isSubmitting}>
                {createForm.formState.isSubmitting ? 'Creating…' : 'Create Group'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) editForm.reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>Update this service group.</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4 mt-2">
            {editError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                {editError}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="edit-g-name">Group Name *</Label>
              <Input
                id="edit-g-name"
                {...editForm.register('name')}
                disabled={editForm.formState.isSubmitting}
                aria-invalid={!!editForm.formState.errors.name}
              />
              {editForm.formState.errors.name && (
                <p className="text-xs text-destructive mt-1">
                  {editForm.formState.errors.name.message}
                </p>
              )}
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

      <Dialog
        open={membersOpen}
        onOpenChange={(open) => {
          setMembersOpen(open);
          if (!open) {
            setMembersTarget(null);
            setMembersError('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Group Members</DialogTitle>
            <DialogDescription>
              Assign active congregation members to {membersTarget?.name ?? 'this group'}.
            </DialogDescription>
          </DialogHeader>

          {membersError && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
              {membersError}
            </p>
          )}

          <div className="mt-2 max-h-80 space-y-2 overflow-y-auto pr-1">
            {members.length === 0 ? (
              <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                No active members available.
              </p>
            ) : (
              members.map((member) => {
                const selected = selectedMemberIds.includes(member.userId);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleMember(member.userId)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                      selected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/60'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {member.user?.name ?? 'Unnamed member'}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {member.user?.email ?? member.congregationRole ?? 'Publisher'}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium">
                      {selected ? 'Assigned' : 'Add'}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button variant="ghost" onClick={() => setMembersOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMembers} disabled={membersSaving || !membersTarget}>
              {membersSaving ? 'Saving...' : 'Save Members'}
            </Button>
          </DialogFooter>
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
