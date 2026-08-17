'use client';

import { FolderOpen, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { DashboardHeader } from '@/components/dashboard-header';
import { ProtectedPage } from '@/components/protected-page';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCongregationGroups,
  useCreateGroup,
  useDeleteGroup,
  useUpdateGroup,
} from '@/hooks';
import { UserRole } from '@/lib/roles';
import type { Group } from '@/types/api';

export default function GroupsClient() {
  const params = useParams();
  const congregationId = (params?.id as string) || '';

  const { groups = [], isLoading } = useCongregationGroups(congregationId);
  const { create: createGroup, isPending: creating } = useCreateGroup(congregationId);
  const { update: updateGroup, isPending: updating } = useUpdateGroup(congregationId);
  const { remove: deleteGroup, isPending: deleting } = useDeleteGroup(congregationId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    await createGroup({ name: groupName.trim() });
    setGroupName('');
    setCreateOpen(false);
  };

  const handleUpdate = async () => {
    if (!editGroup || !groupName.trim()) return;
    await updateGroup({ id: editGroup.id, name: groupName.trim() });
    setEditGroup(null);
    setGroupName('');
  };

  return (
    <ProtectedPage congregationId={congregationId} requiredRole={UserRole.SERVICE_OVERSEER}>
      <DashboardHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-24 lg:pb-8 w-full min-w-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Service Groups</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Field ministry service groups and overseer assignments
            </p>
          </div>
          <Button
            onClick={() => {
              setGroupName('');
              setCreateOpen(true);
            }}
            className="rounded-xl text-xs font-semibold gap-1.5 h-9 px-3.5 shadow-xs shrink-0"
          >
            <Plus size={14} />
            <span>Create Group</span>
          </Button>
        </div>

        {/* Groups Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-border p-6">
            <FolderOpen size={40} className="text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No service groups yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create groups to organize morning field service meetings.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <Card
                key={group.id}
                className="bg-card border-border shadow-xs hover:border-primary/40 transition-all"
              >
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Users size={16} />
                      </div>
                      <h2 className="font-bold text-sm text-foreground truncate">{group.name}</h2>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 rounded-lg p-0"
                        onClick={() => {
                          setEditGroup(group);
                          setGroupName(group.name);
                        }}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 rounded-lg p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteConfirmId(group.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {group.members?.length ?? 0} publishers assigned
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Group Dialog */}
        <ResponsiveDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Create Service Group"
          description="Add a new congregation ministry group"
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Group Name *</Label>
              <Input
                placeholder="e.g. Group 1 — North Area"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl text-xs"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl text-xs font-semibold"
                onClick={handleCreate}
                disabled={!groupName.trim() || creating}
              >
                {creating ? 'Creating…' : 'Create Group'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>

        {/* Edit Group Dialog */}
        <ResponsiveDialog
          open={!!editGroup}
          onOpenChange={(op) => !op && setEditGroup(null)}
          title="Edit Service Group"
          description="Update group name"
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Group Name *</Label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl text-xs"
                onClick={() => setEditGroup(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl text-xs font-semibold"
                onClick={handleUpdate}
                disabled={!groupName.trim() || updating}
              >
                {updating ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deleteConfirmId}
          onOpenChange={(op) => !op && setDeleteConfirmId(null)}
          title="Delete Service Group"
          description="Are you sure you want to delete this service group?"
          confirmLabel="Delete Group"
          variant="destructive"
          onConfirm={() => {
            if (deleteConfirmId) void deleteGroup(deleteConfirmId);
          }}
          loading={deleting}
        />
      </main>
      <BottomTabBar />
    </ProtectedPage>
  );
}
