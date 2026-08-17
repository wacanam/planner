'use client';

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  LogOut,
  MoreVertical,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCog,
  Users,
  UserX,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminNav } from '@/components/admin-nav';
import { ProtectedPage } from '@/components/protected-page';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminUsers, useCongregations, useCurrentUser } from '@/hooks';
import { isSystemAdmin } from '@/lib/permissions';
import { UserRole } from '@/lib/roles';
import type { User } from '@/types/api';

export default function AdminUsersClient() {
  const {
    users = [],
    isLoading: loading,
    isProcessing,
    updateUserRole,
    toggleUserStatus,
    unlinkUserCongregation,
    deleteUserRecord,
  } = useAdminUsers();

  const { congregations = [] } = useCongregations();
  const { user: currentUser } = useCurrentUser();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Role Edit Modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<string>('USER');

  // Status Toggle Modal
  const [statusTargetUser, setStatusTargetUser] = useState<User | null>(null);

  // Unlink Modal
  const [unlinkTargetUser, setUnlinkTargetUser] = useState<User | null>(null);

  // Delete Modal
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);

  const congMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of congregations) {
      map.set(c.id, c.name);
    }
    return map;
  }, [congregations]);

  const adminCount = users.filter((u) => isSystemAdmin(u.role)).length;
  const publisherCount = users.length - adminCount;

  const filtered = useMemo(() => {
    let list = users;
    if (roleFilter === 'admin') {
      list = list.filter((u) => isSystemAdmin(u.role));
    } else if (roleFilter === 'user') {
      list = list.filter((u) => !isSystemAdmin(u.role));
    }

    if (statusFilter === 'active') {
      list = list.filter((u) => u.isActive);
    } else if (statusFilter === 'inactive') {
      list = list.filter((u) => !u.isActive);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((u) => {
        const nameMatch = u.name.toLowerCase().includes(q);
        const emailMatch = u.email.toLowerCase().includes(q);
        const congName = u.congregationId ? congMap.get(u.congregationId)?.toLowerCase() || '' : '';
        const congMatch = congName.includes(q);
        return nameMatch || emailMatch || congMatch;
      });
    }

    return list;
  }, [users, roleFilter, statusFilter, search, congMap]);

  const handleOpenRoleEdit = (u: User) => {
    setSelectedUser(u);
    setNewRole(isSystemAdmin(u.role) ? UserRole.ADMIN : UserRole.USER);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;
    if (selectedUser.id === currentUser?.id) {
      toast.error('You cannot change or downgrade your own administrator role.');
      return;
    }
    try {
      await updateUserRole(selectedUser.id, newRole, currentUser?.id);
      toast.success(`Role updated for ${selectedUser.name || selectedUser.email}!`);
      setSelectedUser(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update role.');
    }
  };

  const handleToggleStatus = async () => {
    if (!statusTargetUser) return;
    const nextStatus = !statusTargetUser.isActive;
    try {
      await toggleUserStatus(statusTargetUser.id, nextStatus);
      toast.success(
        nextStatus
          ? `Activated account for ${statusTargetUser.name}.`
          : `Deactivated account for ${statusTargetUser.name}.`
      );
      setStatusTargetUser(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update user status.');
    }
  };

  const handleUnlinkCongregation = async () => {
    if (!unlinkTargetUser) return;
    try {
      await unlinkUserCongregation(unlinkTargetUser.id, unlinkTargetUser.congregationId);
      toast.success(`Unlinked ${unlinkTargetUser.name} from congregation.`);
      setUnlinkTargetUser(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to unlink user.');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return;
    try {
      await deleteUserRecord(deleteTargetUser.id);
      toast.success(`User record for ${deleteTargetUser.name} deleted.`);
      setDeleteTargetUser(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete user record.');
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
                Users & Roles Directory
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Global overview of all registered publishers, servants, and system administrators
              </p>
            </div>
          </div>
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
              placeholder="Search by name, email, or congregation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-10 rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Role Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border shrink-0">
              <button
                type="button"
                onClick={() => setRoleFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  roleFilter === 'all'
                    ? 'bg-card text-foreground shadow-xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  roleFilter === 'admin'
                    ? 'bg-card text-purple-600 dark:text-purple-400 shadow-xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Admins ({adminCount})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('user')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  roleFilter === 'user'
                    ? 'bg-card text-primary shadow-xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Publishers ({publisherCount})
              </button>
            </div>
          </div>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-border p-6">
            <Users size={40} className="text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No users found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try changing your search keywords or filter selection
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((u) => {
              const isAdmin = isSystemAdmin(u.role);
              const isMe = u.id === currentUser?.id;
              const congName = u.congregationId ? congMap.get(u.congregationId) : null;
              const initials = (u.name || u.email || 'U')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <Card
                  key={u.id}
                  className="bg-card border-border shadow-xs hover:border-primary/30 transition-all"
                >
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Avatar className="w-10 h-10 rounded-full border border-primary/20 bg-primary/10 overflow-hidden shrink-0">
                        {u.avatarUrl && (
                          <AvatarImage
                            src={u.avatarUrl}
                            alt={u.name}
                            className="object-cover w-full h-full"
                          />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground truncate">
                            {u.name || 'Unnamed Publisher'}
                          </span>
                          {isMe && (
                            <Badge variant="secondary" className="text-[9px] font-bold px-1.5 py-0 h-4">
                              You
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider ${
                              isAdmin
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                                : 'bg-primary/10 text-primary border-primary/20'
                            }`}
                          >
                            {isAdmin ? '🛡️ System Admin' : '👤 Publisher'}
                          </Badge>
                          {!u.isActive && (
                            <Badge variant="destructive" className="text-[9px] font-bold px-1.5 py-0 h-4">
                              Deactivated
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-muted-foreground flex-wrap text-[11px]">
                          <span>{u.email}</span>
                          {congName ? (
                            <span className="flex items-center gap-1 text-foreground font-medium">
                              <Building2 size={11} className="text-primary shrink-0" />
                              <span>{congName}</span>
                            </span>
                          ) : (
                            <span className="italic text-muted-foreground">No congregation</span>
                          )}
                          <span>Joined: {new Date(u.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className={`rounded-xl text-xs h-8 gap-1 font-semibold ${isMe ? 'opacity-80' : ''}`}
                        onClick={() => handleOpenRoleEdit(u)}
                        disabled={isProcessing}
                      >
                        <UserCog size={13} />
                        <span>{isMe ? 'Your Role' : 'Manage Role'}</span>
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
                        <DropdownMenuContent align="end" className="w-48 rounded-xl text-xs">
                          <DropdownMenuItem
                            onClick={() => handleOpenRoleEdit(u)}
                            className="cursor-pointer gap-2"
                            disabled={isMe}
                          >
                            <Shield size={13} />
                            <span>Change System Role</span>
                          </DropdownMenuItem>

                          {u.congregationId && (
                            <DropdownMenuItem
                              onClick={() => setUnlinkTargetUser(u)}
                              className="cursor-pointer gap-2 text-amber-600"
                            >
                              <LogOut size={13} />
                              <span>Unlink Congregation</span>
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => setStatusTargetUser(u)}
                            className="cursor-pointer gap-2"
                            disabled={isMe}
                          >
                            {u.isActive ? (
                              <>
                                <UserX size={13} className="text-destructive" />
                                <span className="text-destructive">Deactivate Account</span>
                              </>
                            ) : (
                              <>
                                <UserCheck size={13} className="text-emerald-600" />
                                <span className="text-emerald-600">Reactivate Account</span>
                              </>
                            )}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => setDeleteTargetUser(u)}
                            className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                            disabled={isMe}
                          >
                            <Trash2 size={13} />
                            <span>Delete User Record</span>
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

        {/* Change Role Dialog */}
        <ResponsiveDialog
          open={Boolean(selectedUser)}
          onOpenChange={(open) => {
            if (!open) setSelectedUser(null);
          }}
          title={selectedUser?.id === currentUser?.id ? 'Your Administrator Role' : 'Manage User Role'}
          description={`System permissions for ${selectedUser?.name || selectedUser?.email}.`}
        >
          <div className="space-y-4">
            {selectedUser?.id === currentUser?.id && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldAlert size={14} className="shrink-0 text-amber-600" />
                  <span>Protected Administrator Account</span>
                </p>
                <p>
                  You cannot change or downgrade your own system administrator role. Another system administrator must make this change if needed.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Global System Role</Label>
              <Select
                value={newRole}
                onValueChange={setNewRole}
                disabled={selectedUser?.id === currentUser?.id}
              >
                <SelectTrigger className="h-10 rounded-xl text-xs">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value={UserRole.USER}>
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-primary" />
                      <span>Publisher (Standard Access)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value={UserRole.ADMIN}>
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={14} className="text-purple-600" />
                      <span>System Administrator (Full Global Access)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-xl bg-muted/60 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Role Permissions:</p>
              {newRole === UserRole.ADMIN ? (
                <p>
                  System Admins can access the Global Admin Suite, manage all congregations, approve/reject requests, and promote other users.
                </p>
              ) : (
                <p>
                  Standard publishers only access assigned congregation workspaces and territories based on local congregation servant roles.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => setSelectedUser(null)}
                disabled={isProcessing}
              >
                {selectedUser?.id === currentUser?.id ? 'Close' : 'Cancel'}
              </Button>
              {selectedUser?.id !== currentUser?.id && (
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl text-xs font-semibold"
                  onClick={handleSaveRole}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Updating…' : 'Save Role'}
                </Button>
              )}
            </div>
          </div>
        </ResponsiveDialog>

        {/* Toggle Account Status Dialog */}
        <ResponsiveDialog
          open={Boolean(statusTargetUser)}
          onOpenChange={(open) => {
            if (!open) setStatusTargetUser(null);
          }}
          title={statusTargetUser?.isActive ? 'Deactivate Account' : 'Reactivate Account'}
          description={`Confirm account status change for ${statusTargetUser?.name}.`}
        >
          <div className="space-y-4">
            <div className={`p-3 rounded-xl text-xs space-y-1 ${
              statusTargetUser?.isActive
                ? 'bg-destructive/10 border border-destructive/20 text-destructive'
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
            }`}>
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{statusTargetUser?.isActive ? 'Account Deactivation' : 'Account Reactivation'}</span>
              </p>
              <p>
                {statusTargetUser?.isActive
                  ? 'Deactivating this user will prevent them from signing in and accessing workspaces until reactivated.'
                  : 'Reactivating this user will restore their ability to sign in and participate in ministry workspaces.'}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => setStatusTargetUser(null)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={statusTargetUser?.isActive ? 'destructive' : 'default'}
                size="sm"
                className="rounded-xl text-xs font-semibold"
                onClick={handleToggleStatus}
                disabled={isProcessing}
              >
                {isProcessing
                  ? 'Processing…'
                  : statusTargetUser?.isActive
                    ? 'Confirm Deactivation'
                    : 'Confirm Reactivation'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>

        {/* Unlink Congregation Dialog */}
        <ResponsiveDialog
          open={Boolean(unlinkTargetUser)}
          onOpenChange={(open) => {
            if (!open) setUnlinkTargetUser(null);
          }}
          title="Unlink User from Congregation"
          description={`Remove ${unlinkTargetUser?.name} from their active congregation workspace.`}
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                <span>Membership Removal</span>
              </p>
              <p>
                This will unassign the user from their congregation, service groups, and group roles. The user account will remain active.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => setUnlinkTargetUser(null)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="rounded-xl text-xs font-semibold"
                onClick={handleUnlinkCongregation}
                disabled={isProcessing}
              >
                {isProcessing ? 'Unlinking…' : 'Confirm Unlink'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>

        {/* Delete User Record Dialog */}
        <ResponsiveDialog
          open={Boolean(deleteTargetUser)}
          onOpenChange={(open) => {
            if (!open) setDeleteTargetUser(null);
          }}
          title="Delete User Record"
          description={`Permanently remove ${deleteTargetUser?.name} from Firestore.`}
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle size={14} className="shrink-0" />
                <span>Permanent Deletion</span>
              </p>
              <p>
                This action will delete the Firestore user document and congregation membership entry.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => setDeleteTargetUser(null)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="rounded-xl text-xs font-semibold"
                onClick={handleDeleteUser}
                disabled={isProcessing}
              >
                {isProcessing ? 'Deleting…' : 'Delete Record'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>
      </div>
    </ProtectedPage>
  );
}
