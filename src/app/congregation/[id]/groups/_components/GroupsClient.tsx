'use client';

import {
  Check,
  Crown,
  FolderOpen,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { DashboardHeader } from '@/components/dashboard-header';
import { ProtectedPage } from '@/components/protected-page';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
  useCongregationGroups,
  useCongregationMembers,
  useCreateGroup,
  useDeleteGroup,
  useUpdateGroup,
} from '@/hooks';
import { UserRole } from '@/lib/roles';
import { toast } from 'sonner';
import type { Group, GroupMember } from '@/types/api';

export default function GroupsClient() {
  const params = useParams();
  const congregationId = (params?.id as string) || '';

  const { groups = [], isLoading } = useCongregationGroups(congregationId);
  const { data: members = [], isLoading: membersLoading } = useCongregationMembers(congregationId);
  const { create: createGroup, isPending: creating } = useCreateGroup(congregationId);
  const { update: updateGroup, isPending: updating } = useUpdateGroup(congregationId);
  const { remove: deleteGroup, isPending: deleting } = useDeleteGroup(congregationId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState('');
  const [overseerId, setOverseerId] = useState<string>('none');
  const [assistantOverseerId, setAssistantOverseerId] = useState<string>('none');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const activeMembers = useMemo(
    () => members.filter((m) => m.status === 'active'),
    [members]
  );

  const activeMemberMap = useMemo(() => {
    return new Map(activeMembers.map((m) => [m.userId || m.id, m]));
  }, [activeMembers]);

  // Map of userId -> current group info
  const memberGroupMap = useMemo(() => {
    const map = new Map<string, { groupId: string; groupName: string }>();
    for (const g of groups) {
      for (const gm of g.members || []) {
        if (gm.userId) {
          map.set(gm.userId, { groupId: g.id, groupName: g.name });
        }
      }
    }
    return map;
  }, [groups]);

  // Available members for the current active dialog:
  // - If creating a new group: only unassigned active members
  // - If editing an existing group: members in this group + unassigned active members
  const availableMembers = useMemo(() => {
    return activeMembers.filter((m) => {
      const uid = m.userId || m.id;
      const groupInfo = memberGroupMap.get(uid);
      if (!groupInfo) return true; // Unassigned member is available
      if (editGroup && groupInfo.groupId === editGroup.id) return true; // Already in this group is available
      return false; // Assigned to another group is excluded
    });
  }, [activeMembers, memberGroupMap, editGroup]);

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return availableMembers;
    const q = memberSearch.toLowerCase();
    return availableMembers.filter(
      (m) =>
        m.user?.name?.toLowerCase().includes(q) ||
        m.user?.email?.toLowerCase().includes(q)
    );
  }, [availableMembers, memberSearch]);

  const handleOpenCreate = () => {
    setGroupName('');
    setOverseerId('none');
    setAssistantOverseerId('none');
    setSelectedUserIds([]);
    setMemberSearch('');
    setCreateOpen(true);
  };

  const handleOpenEdit = (group: Group) => {
    setEditGroup(group);
    setGroupName(group.name);
    setOverseerId(group.overseerId || 'none');
    setAssistantOverseerId(group.assistantOverseerId || 'none');
    setSelectedUserIds((group.members || []).map((m) => m.userId).filter(Boolean));
    setMemberSearch('');
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId];
      if (!next.includes(overseerId) && overseerId === userId) {
        setOverseerId('none');
      }
      if (!next.includes(assistantOverseerId) && assistantOverseerId === userId) {
        setAssistantOverseerId('none');
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const visibleIds = filteredMembers.map((m) => m.userId || m.id);
    setSelectedUserIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const handleClearSelection = () => {
    setSelectedUserIds([]);
    setOverseerId('none');
    setAssistantOverseerId('none');
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    const finalOverseerId = overseerId !== 'none' ? overseerId : null;
    const finalAssistantId = assistantOverseerId !== 'none' ? assistantOverseerId : null;

    const overseerMember = finalOverseerId ? activeMemberMap.get(finalOverseerId) : null;
    const assistantMember = finalAssistantId ? activeMemberMap.get(finalAssistantId) : null;

    // Ensure overseer and assistant are included in selectedUserIds
    const allUserIds = Array.from(
      new Set([
        ...selectedUserIds,
        ...(finalOverseerId ? [finalOverseerId] : []),
        ...(finalAssistantId ? [finalAssistantId] : []),
      ])
    );

    const assigned: GroupMember[] = activeMembers
      .filter((m) => allUserIds.includes(m.userId || m.id))
      .map((m) => {
        const uid = m.userId || m.id;
        let role = 'member';
        if (uid === finalOverseerId) role = 'group_overseer';
        else if (uid === finalAssistantId) role = 'assistant_overseer';
        return {
          id: uid,
          userId: uid,
          role,
          user: {
            name: m.user?.name || null,
            email: m.user?.email || null,
          },
        };
      });

    await createGroup({
      name: groupName.trim(),
      overseerId: finalOverseerId,
      overseerName: overseerMember?.user?.name || overseerMember?.user?.email || null,
      assistantOverseerId: finalAssistantId,
      assistantOverseerName: assistantMember?.user?.name || assistantMember?.user?.email || null,
      members: assigned,
    });

    toast.success('Service group created');
    setGroupName('');
    setOverseerId('none');
    setAssistantOverseerId('none');
    setSelectedUserIds([]);
    setCreateOpen(false);
  };

  const handleUpdate = async () => {
    if (!editGroup || !groupName.trim()) return;
    const finalOverseerId = overseerId !== 'none' ? overseerId : null;
    const finalAssistantId = assistantOverseerId !== 'none' ? assistantOverseerId : null;

    const overseerMember = finalOverseerId ? activeMemberMap.get(finalOverseerId) : null;
    const assistantMember = finalAssistantId ? activeMemberMap.get(finalAssistantId) : null;

    // Ensure overseer and assistant are included in selectedUserIds
    const allUserIds = Array.from(
      new Set([
        ...selectedUserIds,
        ...(finalOverseerId ? [finalOverseerId] : []),
        ...(finalAssistantId ? [finalAssistantId] : []),
      ])
    );

    const assigned: GroupMember[] = activeMembers
      .filter((m) => allUserIds.includes(m.userId || m.id))
      .map((m) => {
        const uid = m.userId || m.id;
        let role = 'member';
        if (uid === finalOverseerId) role = 'group_overseer';
        else if (uid === finalAssistantId) role = 'assistant_overseer';
        return {
          id: uid,
          userId: uid,
          role,
          user: {
            name: m.user?.name || null,
            email: m.user?.email || null,
          },
        };
      });

    await updateGroup({
      id: editGroup.id,
      name: groupName.trim(),
      overseerId: finalOverseerId,
      overseerName: overseerMember?.user?.name || overseerMember?.user?.email || null,
      assistantOverseerId: finalAssistantId,
      assistantOverseerName: assistantMember?.user?.name || assistantMember?.user?.email || null,
      members: assigned,
    });

    toast.success('Service group updated');
    setEditGroup(null);
    setGroupName('');
    setOverseerId('none');
    setAssistantOverseerId('none');
    setSelectedUserIds([]);
  };

  return (
    <ProtectedPage congregationId={congregationId} requiredRole={UserRole.SERVICE_OVERSEER}>
      <DashboardHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-24 lg:pb-8 w-full min-w-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Service Groups</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Field ministry service groups, group overseers, and publisher assignments
            </p>
          </div>
          <Button
            onClick={handleOpenCreate}
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
              <div key={i} className="h-44 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-border p-6">
            <FolderOpen size={40} className="text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No service groups yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create groups to organize field ministry arrangements, assign overseers, and assign publishers.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => {
              const groupMembersList = group.members || [];
              const overseer = group.overseerName || groupMembersList.find((m) => m.userId === group.overseerId || m.role === 'group_overseer')?.user?.name;
              const assistant = group.assistantOverseerName || groupMembersList.find((m) => m.userId === group.assistantOverseerId || m.role === 'assistant_overseer')?.user?.name;

              return (
                <Card
                  key={group.id}
                  className="bg-card border-border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                          <Users size={16} />
                        </div>
                        <div className="min-w-0">
                          <h2 className="font-bold text-sm text-foreground truncate">{group.name}</h2>
                          <p className="text-[11px] text-muted-foreground font-medium">
                            {groupMembersList.length} publisher{groupMembersList.length === 1 ? '' : 's'} assigned
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 rounded-lg p-0"
                          onClick={() => handleOpenEdit(group)}
                          title="Edit group & manage members"
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 rounded-lg p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteConfirmId(group.id)}
                          title="Delete group"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>

                    {/* Roles Summary */}
                    <div className="space-y-1 py-1.5 px-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Crown size={12} className="text-amber-500" /> Overseer:
                        </span>
                        <span className="font-semibold text-foreground truncate text-[11px]">
                          {overseer || <span className="text-muted-foreground font-normal italic">Unassigned</span>}
                        </span>
                      </div>
                      {assistant && (
                        <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-border/40">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Shield size={12} className="text-blue-500" /> Assistant:
                          </span>
                          <span className="font-semibold text-foreground truncate text-[11px]">
                            {assistant}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Assigned Members Chips Preview */}
                    <div className="pt-1 border-t border-border/60">
                      {groupMembersList.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {groupMembersList.slice(0, 5).map((gm) => {
                            const isOverseer = gm.userId === group.overseerId || gm.role === 'group_overseer';
                            const isAssistant = gm.userId === group.assistantOverseerId || gm.role === 'assistant_overseer';
                            return (
                              <span
                                key={gm.userId}
                                className={`text-[10px] px-2 py-0.5 rounded-lg font-medium truncate max-w-[130px] flex items-center gap-1 ${
                                  isOverseer
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/30'
                                    : isAssistant
                                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 font-bold border border-blue-500/30'
                                    : 'bg-muted text-foreground'
                                }`}
                              >
                                {isOverseer && <Crown size={9} />}
                                {isAssistant && <Shield size={9} />}
                                <span>{gm.user?.name || gm.user?.email || 'Publisher'}</span>
                              </span>
                            );
                          })}
                          {groupMembersList.length > 5 && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-lg font-bold">
                              +{groupMembersList.length - 5} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                          <UserPlus size={12} className="opacity-60" />
                          <span>No publishers assigned yet</span>
                        </p>
                      )}
                    </div>

                    {/* Quick Manage Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(group)}
                      className="w-full h-8 text-xs font-semibold rounded-xl gap-1.5 mt-2 bg-muted/30 hover:bg-muted"
                    >
                      <UserCheck size={13} className="text-primary" />
                      <span>Manage Group & Roles ({groupMembersList.length})</span>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Group Dialog */}
        <ResponsiveDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Create Service Group"
          description="Add a new service group, designate overseers, and assign publishers"
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

            {/* Overseer & Assistant Roles Selection */}
            <div className="grid sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/30 border border-border">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Crown size={13} className="text-amber-500" />
                  <span>Group Overseer</span>
                </Label>
                <Select value={overseerId} onValueChange={setOverseerId}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue placeholder="Choose Overseer…" />
                  </SelectTrigger>
                  <SelectContent side="top" className="bg-popover border-border max-h-52">
                    <SelectItem value="none">None (Unassigned)</SelectItem>
                    {activeMembers.map((m) => {
                      const uid = m.userId || m.id;
                      return (
                        <SelectItem key={uid} value={uid}>
                          {m.user?.name || m.user?.email || uid}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Shield size={13} className="text-blue-500" />
                  <span>Assistant Overseer</span>
                </Label>
                <Select value={assistantOverseerId} onValueChange={setAssistantOverseerId}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue placeholder="Choose Assistant (Optional)…" />
                  </SelectTrigger>
                  <SelectContent side="top" className="bg-popover border-border max-h-52">
                    <SelectItem value="none">None (Optional)</SelectItem>
                    {activeMembers.map((m) => {
                      const uid = m.userId || m.id;
                      return (
                        <SelectItem key={uid} value={uid}>
                          {m.user?.name || m.user?.email || uid}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Member Assignment Section */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Assign Publishers ({selectedUserIds.length} selected)
                </Label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-primary font-semibold hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground">•</span>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search publishers…"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="h-8 pl-8 text-xs rounded-lg"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-border p-1.5 bg-muted/20">
                {membersLoading ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Loading publishers…</p>
                ) : filteredMembers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    No unassigned publishers available. All active members are already in service groups.
                  </p>
                ) : (
                  filteredMembers.map((m) => {
                    const uid = m.userId || m.id;
                    const isSelected = selectedUserIds.includes(uid);
                    const isOverseer = overseerId === uid;
                    const isAssistant = assistantOverseerId === uid;

                    return (
                      <div
                        key={uid}
                        onClick={() => toggleMemberSelection(uid)}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/10 text-foreground font-semibold'
                            : 'hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleMemberSelection(uid)}
                          />
                          <div className="min-w-0">
                            <span className="text-foreground truncate block font-medium">
                              {m.user?.name || m.user?.email || 'Publisher'}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate block">
                              {m.user?.email}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {isOverseer ? (
                            <Badge className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-bold gap-0.5">
                              <Crown size={9} /> Overseer
                            </Badge>
                          ) : isAssistant ? (
                            <Badge className="text-[9px] bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 font-bold gap-0.5">
                              <Shield size={9} /> Assistant
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] text-muted-foreground">
                              Publisher
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
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

        {/* Edit Group Dialog (with Member Assignment & Roles) */}
        <ResponsiveDialog
          open={!!editGroup}
          onOpenChange={(op) => !op && setEditGroup(null)}
          title="Manage Service Group"
          description={`Update group details, designate overseers, and manage publishers for ${editGroup?.name || 'group'}`}
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

            {/* Overseer & Assistant Roles Selection */}
            <div className="grid sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/30 border border-border">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Crown size={13} className="text-amber-500" />
                  <span>Group Overseer</span>
                </Label>
                <Select value={overseerId} onValueChange={setOverseerId}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue placeholder="Choose Overseer…" />
                  </SelectTrigger>
                  <SelectContent side="top" className="bg-popover border-border max-h-52">
                    <SelectItem value="none">None (Unassigned)</SelectItem>
                    {availableMembers.map((m) => {
                      const uid = m.userId || m.id;
                      return (
                        <SelectItem key={uid} value={uid}>
                          {m.user?.name || m.user?.email || uid}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Shield size={13} className="text-blue-500" />
                  <span>Assistant Overseer</span>
                </Label>
                <Select value={assistantOverseerId} onValueChange={setAssistantOverseerId}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue placeholder="Choose Assistant (Optional)…" />
                  </SelectTrigger>
                  <SelectContent side="top" className="bg-popover border-border max-h-52">
                    <SelectItem value="none">None (Optional)</SelectItem>
                    {availableMembers.map((m) => {
                      const uid = m.userId || m.id;
                      return (
                        <SelectItem key={uid} value={uid}>
                          {m.user?.name || m.user?.email || uid}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Member Assignment Section */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Publishers ({selectedUserIds.length} in group)
                </Label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-primary font-semibold hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground">•</span>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search publishers…"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="h-8 pl-8 text-xs rounded-lg"
                />
              </div>

              <div className="max-h-52 overflow-y-auto space-y-1 rounded-xl border border-border p-1.5 bg-muted/20">
                {membersLoading ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Loading publishers…</p>
                ) : filteredMembers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    No unassigned publishers available to add.
                  </p>
                ) : (
                  filteredMembers.map((m) => {
                    const uid = m.userId || m.id;
                    const isSelected = selectedUserIds.includes(uid);
                    const isOverseer = overseerId === uid;
                    const isAssistant = assistantOverseerId === uid;

                    return (
                      <div
                        key={uid}
                        onClick={() => toggleMemberSelection(uid)}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/10 text-foreground font-semibold'
                            : 'hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleMemberSelection(uid)}
                          />
                          <div className="min-w-0">
                            <span className="text-foreground truncate block font-medium">
                              {m.user?.name || m.user?.email || 'Publisher'}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate block">
                              {m.user?.email}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {isOverseer ? (
                            <Badge className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-bold gap-0.5">
                              <Crown size={9} /> Overseer
                            </Badge>
                          ) : isAssistant ? (
                            <Badge className="text-[9px] bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 font-bold gap-0.5">
                              <Shield size={9} /> Assistant
                            </Badge>
                          ) : isSelected ? (
                            <Badge variant="secondary" className="text-[9px] bg-primary/15 text-primary">
                              In Group
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] text-muted-foreground">
                              Unassigned
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
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
