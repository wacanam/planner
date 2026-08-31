'use client';

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  Copy,
  KeyRound,
  LogOut,
  Mail,
  MoreVertical,
  Search,
  Shield,
  ShieldAlert,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminUsers, useCongregations, useCurrentUser } from '@/hooks';
import { formatDate } from '@/lib/date-utils';
import { isSystemAdmin } from '@/lib/permissions';
import { UserRole } from '@/lib/roles';
import type { User } from '@/types/api';

export default function AdminUsersClient() {
  const {
    users = [],
    isLoading: loading,
    isProcessing,
    updateUserRole,
    updateUserEmail,
    toggleUserStatus,
    unlinkUserCongregation,
    deleteUserRecord,
  } = useAdminUsers();

  const { congregations = [] } = useCongregations();
  const { user: currentUser } = useCurrentUser();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [statusFilter, _setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Role Edit Modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<string>('USER');

  // Email Replace Modal
  const [emailTargetUser, setEmailTargetUser] = useState<User | null>(null);
  const [newEmailAddress, setNewEmailAddress] = useState<string>('');
  const [sendPasswordReset, setSendPasswordReset] = useState<boolean>(true);
  const [generatedResetLink, setGeneratedResetLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Status Toggle Modal
  const [statusTargetUser, setStatusTargetUser] = useState<User | null>(null);

  // Unlink Modal
  const [unlinkTargetUser, setUnlinkTargetUser] = useState<User | null>(null);

  // Delete Modal
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);
  const [transferRecipientId, setTransferRecipientId] = useState<string>('');

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

  const handleOpenEmailReplace = (u: User) => {
    setEmailTargetUser(u);
    setNewEmailAddress('');
    setSendPasswordReset(true);
    setGeneratedResetLink(null);
    setCopiedLink(false);
  };

  const handleSaveEmail = async () => {
    if (!emailTargetUser) return;
    if (!newEmailAddress || !newEmailAddress.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (newEmailAddress.trim().toLowerCase() === emailTargetUser.email.trim().toLowerCase()) {
      toast.error('The new email address must be different from the current email.');
      return;
    }

    try {
      const result = await updateUserEmail(
        emailTargetUser.id,
        newEmailAddress.trim().toLowerCase(),
        sendPasswordReset
      );
      toast.success(`Email updated for ${emailTargetUser.name}!`);
      if (result.resetLink) {
        setGeneratedResetLink(result.resetLink);
      } else {
        setEmailTargetUser(null);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update email address.');
    }
  };

  const handleCopyResetLink = async () => {
    if (!generatedResetLink) return;
    try {
      await navigator.clipboard.writeText(generatedResetLink);
      setCopiedLink(true);
      toast.success('Password reset link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      toast.error('Failed to copy link to clipboard.');
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

  const potentialRecipients = useMemo(() => {
    if (!deleteTargetUser) return [];
    return users
      .filter((u) => u.id !== deleteTargetUser.id && u.isActive)
      .sort((a, b) => {
        const aSameCong =
          deleteTargetUser.congregationId && a.congregationId === deleteTargetUser.congregationId
            ? -1
            : 1;
        const bSameCong =
          deleteTargetUser.congregationId && b.congregationId === deleteTargetUser.congregationId
            ? -1
            : 1;
        if (aSameCong !== bSameCong) return aSameCong - bSameCong;
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [users, deleteTargetUser]);

  const handleOpenDeleteModal = (u: User) => {
    setDeleteTargetUser(u);
    // Find candidate in same congregation first (prefer Service Overseer)
    const sameCongUsers = users.filter(
      (c) =>
        c.id !== u.id && c.isActive && c.congregationId && c.congregationId === u.congregationId
    );
    const serviceOverseer = sameCongUsers.find(
      (c) => String(c.role).toUpperCase() === 'SERVICE_OVERSEER'
    );
    const candidate =
      serviceOverseer?.id ||
      sameCongUsers[0]?.id ||
      (currentUser?.id !== u.id ? currentUser?.id : '') ||
      users.find((c) => c.id !== u.id && c.isActive)?.id ||
      '';
    setTransferRecipientId(candidate || '');
  };

  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return;
    try {
      const res = await deleteUserRecord(deleteTargetUser.id, transferRecipientId);
      toast.success(res?.message || `User record for ${deleteTargetUser.name} deleted.`);
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
                            <Badge
                              variant="secondary"
                              className="text-[9px] font-bold px-1.5 py-0 h-4"
                            >
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
                            <Badge
                              variant="destructive"
                              className="text-[9px] font-bold px-1.5 py-0 h-4"
                            >
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
                          <span>Joined: {formatDate(u.createdAt)}</span>
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

                          <DropdownMenuItem
                            onClick={() => handleOpenEmailReplace(u)}
                            className="cursor-pointer gap-2"
                            disabled={isMe}
                          >
                            <Mail size={13} className="text-primary" />
                            <span>Replace Email Address</span>
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
                            onClick={() => handleOpenDeleteModal(u)}
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
          title={
            selectedUser?.id === currentUser?.id ? 'Your Administrator Role' : 'Manage User Role'
          }
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
                  You cannot change or downgrade your own system administrator role. Another system
                  administrator must make this change if needed.
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
                  System Admins can access the Global Admin Suite, manage all congregations,
                  approve/reject requests, and promote other users.
                </p>
              ) : (
                <p>
                  Standard publishers only access assigned congregation workspaces and territories
                  based on local congregation servant roles.
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

        {/* Replace Email Dialog */}
        <ResponsiveDialog
          open={Boolean(emailTargetUser)}
          onOpenChange={(open) => {
            if (!open) {
              setEmailTargetUser(null);
              setGeneratedResetLink(null);
              setCopiedLink(false);
            }
          }}
          title={generatedResetLink ? 'Email Replaced Successfully' : 'Replace User Email Address'}
          description={
            generatedResetLink
              ? `The email for ${emailTargetUser?.name || 'the user'} has been updated.`
              : `Update the login email address for ${emailTargetUser?.name || emailTargetUser?.email}.`
          }
        >
          {generatedResetLink ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <Check size={14} className="shrink-0 text-emerald-600" />
                  <span>Email Updated to {newEmailAddress}</span>
                </p>
                <p>
                  A password reset link was generated for the new email address. You can copy this
                  link and send it directly to the user so they can set a password and regain
                  access:
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Password Reset Link</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={generatedResetLink}
                    className="h-10 rounded-xl text-xs bg-muted font-mono select-all truncate"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl h-10 px-3 shrink-0 gap-1.5 text-xs font-semibold"
                    onClick={handleCopyResetLink}
                  >
                    {copiedLink ? (
                      <Check size={14} className="text-emerald-600" />
                    ) : (
                      <Copy size={14} />
                    )}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl text-xs font-semibold"
                  onClick={() => {
                    setEmailTargetUser(null);
                    setGeneratedResetLink(null);
                    setCopiedLink(false);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground space-y-1">
                <p className="font-semibold flex items-center gap-1.5 text-primary">
                  <KeyRound size={14} className="shrink-0" />
                  <span>Administrative Email Replacement</span>
                </p>
                <p className="text-muted-foreground">
                  This will update the user's primary login in Firebase Authentication and their
                  profile in Firestore. Any active sessions on other devices will be invalidated.
                </p>
              </div>

              <div className="space-y-1 text-xs">
                <span className="text-muted-foreground">Current Email:</span>{' '}
                <span className="font-semibold text-foreground">
                  {emailTargetUser?.email || 'None'}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">New Email Address</Label>
                <Input
                  type="email"
                  placeholder="e.g. publisher@example.com"
                  value={newEmailAddress}
                  onChange={(e) => setNewEmailAddress(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                  autoFocus
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="sendPasswordReset"
                  checked={sendPasswordReset}
                  onChange={(e) => setSendPasswordReset(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label
                  htmlFor="sendPasswordReset"
                  className="text-xs text-foreground font-medium cursor-pointer"
                >
                  Generate a password reset link for the user
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs"
                  onClick={() => setEmailTargetUser(null)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl text-xs font-semibold"
                  onClick={handleSaveEmail}
                  disabled={isProcessing || !newEmailAddress.trim()}
                >
                  {isProcessing ? 'Updating Email…' : 'Replace Email'}
                </Button>
              </div>
            </div>
          )}
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
            <div
              className={`p-3 rounded-xl text-xs space-y-1 ${
                statusTargetUser?.isActive
                  ? 'bg-destructive/10 border border-destructive/20 text-destructive'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle size={14} className="shrink-0" />
                <span>
                  {statusTargetUser?.isActive ? 'Account Deactivation' : 'Account Reactivation'}
                </span>
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
                This will unassign the user from their congregation, service groups, and group
                roles. The user account will remain active.
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
          title="Delete User & Account"
          description={`Permanently delete ${deleteTargetUser?.name || deleteTargetUser?.email} and all associated data.`}
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle size={14} className="shrink-0" />
                <span>Account Deletion & Record Transfer</span>
              </p>
              <p>
                This will permanently delete this user from <strong>Firebase Authentication</strong>{' '}
                and remove their profile from the <strong>users</strong> collection.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Transfer Records To (Service Overseer / Publisher)
              </Label>
              <Select value={transferRecipientId} onValueChange={setTransferRecipientId}>
                <SelectTrigger className="h-10 rounded-xl text-xs">
                  <SelectValue placeholder="Select recipient for ministry records" />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs max-h-56">
                  {potentialRecipients.map((r) => {
                    const isSameCong =
                      deleteTargetUser?.congregationId &&
                      r.congregationId === deleteTargetUser.congregationId;
                    const congLabel = r.congregationId ? congMap.get(r.congregationId) : null;
                    const isOverseer = String(r.role).toUpperCase() === 'SERVICE_OVERSEER';

                    return (
                      <SelectItem key={r.id} value={r.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{r.name || r.email}</span>
                          {isOverseer && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20"
                            >
                              Service Overseer
                            </Badge>
                          )}
                          {isSameCong && !isOverseer && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                              Same Congregation
                            </Badge>
                          )}
                          {congLabel && !isSameCong && (
                            <span className="text-muted-foreground text-[10px]">({congLabel})</span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                All households, visits, encounters, and contacts created by{' '}
                {deleteTargetUser?.name || 'this user'} will be safely preserved and transferred to
                the selected person.
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
