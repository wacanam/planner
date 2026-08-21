'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Layers,
  LogOut,
  MapPin,
  Share2,
  Shield,
  Trash2,
  User,
  Users,
  Volume2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AvatarCropDialog } from '@/components/avatar-crop-dialog';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { ProtectedPage } from '@/components/protected-page';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  useChangePassword,
  useCongregation,
  useCongregationGroups,
  useCongregationMembers,
  useCongregationTerritories,
  useCurrentUser,
  useMyAccountRequests,
  useMyAssignments,
  useNotificationSettings,
  useProfile,
  useUpdateAvatar,
  useUpdateProfile,
} from '@/hooks';
import { signOut } from '@/lib/firebase/auth';
import {
  filterActiveAssignments,
  getUserGroupIds,
  isSystemAdmin,
  isUserInGroup,
  resolveUserAssignments,
} from '@/lib/permissions';
import type { ChangePasswordFormData, UpdateProfileFormData } from '@/schemas/profile';
import { changePasswordSchema, updateProfileSchema } from '@/schemas/profile';
import type { NotificationSoundStyle } from '@/types/api';

export default function ProfilePage() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { user } = useCurrentUser();
  const congregationId = profile?.congregationId || user.congregationId || '';
  const { congregation } = useCongregation(congregationId);
  const { data: groups = [] } = useCongregationGroups(congregationId);
  const { data: members = [] } = useCongregationMembers(congregationId);
  const { data: territories = [] } = useCongregationTerritories(congregationId);
  const { data: assignments = [] } = useMyAssignments(congregationId);

  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const updateAvatar = useUpdateAvatar();
  const {
    settings: notifSettings,
    soundEnabled: notifSoundEnabled,
    soundStyle: notifSoundStyle,
    isUpdating: isUpdatingNotif,
    updateSettings: updateNotifSettings,
    toggleSound: toggleNotifSound,
    setSoundStyle: setNotifSoundStyle,
    playPreview: playNotifPreview,
  } = useNotificationSettings();

  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
      setIsSigningOut(false);
    }
  };

  const profileForm = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema) as any,
    values: {
      name: profile?.name ?? user.name ?? '',
    },
  });

  const passwordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema) as any,
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = async (blob: Blob) => {
    try {
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      await updateAvatar.mutateAsync(file);
      toast.success('Avatar updated successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update avatar.');
    }
  };

  const onProfileSubmit = async (data: UpdateProfileFormData) => {
    try {
      await updateProfile.mutateAsync(data);
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile.');
    }
  };

  const onPasswordSubmit = async (data: ChangePasswordFormData) => {
    try {
      await changePassword.mutateAsync(data);
      toast.success('Password updated successfully!');
      passwordForm.reset();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update password.');
    }
  };

  const avatarUrl = profile?.avatarUrl || profile?.image || user.avatarUrl || null;
  const targetUserId = profile?.id || user.id;

  const userInitials = (profile?.name || user.name || profile?.email || user.email || 'P')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // User's membership in congregation
  const memberRecord = members.find((m) => m.userId === targetUserId || m.id === targetUserId);

  // User's group in congregation
  const userGroup = groups.find((g) =>
    isUserInGroup({ id: targetUserId, email: profile?.email || user.email }, g)
  );

  const groupMember = userGroup?.members.find((m) => (m.userId || m.id) === targetUserId);

  // Determine user group role label
  const groupRoleLabel = (() => {
    if (!userGroup) return null;
    if (userGroup.overseerId === targetUserId || groupMember?.role === 'group_overseer') {
      return { title: 'Group Overseer', icon: '👑' };
    }
    if (
      userGroup.assistantOverseerId === targetUserId ||
      groupMember?.role === 'assistant_overseer'
    ) {
      return { title: 'Assistant Overseer', icon: '🛡️' };
    }
    return { title: 'Group Member', icon: '👥' };
  })();

  // Robust groupmates list from group.members + congregationMembers
  const groupmatesList = useMemo(() => {
    if (!userGroup) return [];

    const map = new Map<
      string,
      {
        id: string;
        userId: string;
        name: string;
        email: string;
        role?: string;
        congregationRole?: string | null;
      }
    >();

    // 1. Members from group.members
    for (const gm of userGroup.members || []) {
      const uid = gm.userId || gm.id;
      if (!uid) continue;
      const memberDoc = members.find((m) => (m.userId || m.id) === uid);
      map.set(uid, {
        id: uid,
        userId: uid,
        name:
          gm.user?.name ||
          memberDoc?.user?.name ||
          (gm as any).name ||
          memberDoc?.user?.email ||
          'Publisher',
        email: gm.user?.email || memberDoc?.user?.email || '',
        role:
          gm.role ||
          (uid === userGroup.overseerId
            ? 'group_overseer'
            : uid === userGroup.assistantOverseerId
              ? 'assistant_overseer'
              : 'member'),
        congregationRole: memberDoc?.congregationRole || null,
      });
    }

    // 2. Members from congregationMembers with matching groupId
    for (const m of members) {
      if (m.groupId === userGroup.id && (m.status === 'active' || !m.status)) {
        const uid = m.userId || m.id;
        if (!uid || map.has(uid)) continue;
        map.set(uid, {
          id: uid,
          userId: uid,
          name: m.user?.name || m.user?.email || 'Publisher',
          email: m.user?.email || '',
          role:
            uid === userGroup.overseerId
              ? 'group_overseer'
              : uid === userGroup.assistantOverseerId
                ? 'assistant_overseer'
                : 'member',
          congregationRole: m.congregationRole || null,
        });
      }
    }

    // 3. Ensure Overseer and Assistant Overseer are present if names exist
    if (userGroup.overseerId && !map.has(userGroup.overseerId)) {
      const memberDoc = members.find((m) => (m.userId || m.id) === userGroup.overseerId);
      map.set(userGroup.overseerId, {
        id: userGroup.overseerId,
        userId: userGroup.overseerId,
        name: userGroup.overseerName || memberDoc?.user?.name || 'Group Overseer',
        email: memberDoc?.user?.email || '',
        role: 'group_overseer',
        congregationRole: memberDoc?.congregationRole || null,
      });
    }
    if (userGroup.assistantOverseerId && !map.has(userGroup.assistantOverseerId)) {
      const memberDoc = members.find((m) => (m.userId || m.id) === userGroup.assistantOverseerId);
      map.set(userGroup.assistantOverseerId, {
        id: userGroup.assistantOverseerId,
        userId: userGroup.assistantOverseerId,
        name: userGroup.assistantOverseerName || memberDoc?.user?.name || 'Assistant Overseer',
        email: memberDoc?.user?.email || '',
        role: 'assistant_overseer',
        congregationRole: memberDoc?.congregationRole || null,
      });
    }

    return Array.from(map.values());
  }, [userGroup, members]);

  // Congregation role label
  const congregationRoleLabel = (() => {
    const rawRole = (
      user.congregationRole ||
      memberRecord?.congregationRole ||
      user.role ||
      profile?.role ||
      ''
    )
      .toUpperCase()
      .replace(/\s+/g, '_');
    if (rawRole === 'SUPER_ADMIN') {
      return {
        title: 'Super Admin',
        badgeColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
        icon: '⭐',
      };
    }
    if (rawRole === 'ADMIN') {
      return {
        title: 'Admin',
        badgeColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
        icon: '🛡️',
      };
    }
    if (rawRole === 'CIRCUIT_OVERSEER') {
      return {
        title: 'Circuit Overseer',
        badgeColor: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
        icon: '🌐',
      };
    }
    if (rawRole === 'SERVICE_OVERSEER') {
      return {
        title: 'Service Overseer',
        badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        icon: '👑',
      };
    }
    if (rawRole === 'TERRITORY_SERVANT') {
      return {
        title: 'Territory Servant',
        badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
        icon: '🛡️',
      };
    }
    if (rawRole === 'VISITING_PUBLISHER') {
      return {
        title: 'Visiting Publisher',
        badgeColor: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
        icon: '🕊️',
      };
    }
    return {
      title: 'Publisher',
      badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      icon: '👤',
    };
  })();

  // Active assignments for current user
  const userGroupIds = useMemo(() => getUserGroupIds(user, groups), [groups, user]);
  const activeAssignments = useMemo(() => {
    const userAssignments = resolveUserAssignments(
      user,
      assignments,
      territories,
      userGroupIds,
      congregationId
    );
    return filterActiveAssignments(userAssignments);
  }, [user, assignments, territories, userGroupIds, congregationId]);

  const {
    pendingLeaveRequest,
    pendingDeleteRequest,
    createRequest,
    cancelRequest,
    isSubmitting: isSubmittingRequest,
  } = useMyAccountRequests();

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleRequestLeave = async () => {
    try {
      await createRequest({
        type: 'leave_congregation',
        reason: leaveReason,
        congregationId: congregation?.id || congregationId,
        congregationName: congregation?.name,
      });
      toast.success('Request to leave congregation submitted for System Admin approval.');
      setLeaveDialogOpen(false);
      setLeaveReason('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit leave request.');
    }
  };

  const handleRequestDelete = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      toast.error('Please type DELETE to confirm your request.');
      return;
    }
    try {
      await createRequest({
        type: 'delete_account',
        reason: deleteReason,
        congregationId: congregation?.id || congregationId,
        congregationName: congregation?.name,
      });
      toast.success('Account deletion request submitted for System Admin review.');
      setDeleteDialogOpen(false);
      setDeleteReason('');
      setDeleteConfirmText('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit deletion request.');
    }
  };

  const handleCancelRequest = async (id: string) => {
    try {
      await cancelRequest(id);
      toast.success('Request cancelled successfully.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to cancel request.');
    }
  };

  const backHref = isSystemAdmin(user.role)
    ? '/admin/dashboard'
    : congregationId
      ? `/congregation/${congregationId}/dashboard`
      : '/';

  return (
    <ProtectedPage>
      <div className="min-h-screen bg-background">
        {/* Top Sticky Header */}
        <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur-md">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                title="Go back"
              >
                <Link href={backHref} aria-label="Go back">
                  <ArrowLeft size={18} />
                </Link>
              </Button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight truncate">
                  Profile & Settings
                </h1>
                <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                  Manage your account, congregation role, and preferences
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <ThemeToggle />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="h-8 px-2.5 sm:px-3 text-xs font-semibold rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 cursor-pointer"
                title="Sign out"
              >
                <LogOut size={13} className="sm:mr-1.5 shrink-0" />
                <span className="hidden sm:inline">
                  {isSigningOut ? 'Signing out…' : 'Sign Out'}
                </span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Container */}
        <main className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-28 sm:pb-12">
          {/* Profile Overview Hero Card */}
          <Card className="bg-card border-border shadow-xs overflow-hidden rounded-2xl sm:rounded-3xl">
            <div className="h-24 sm:h-32 bg-gradient-to-r from-primary/25 via-primary/15 to-primary/5 relative" />
            <CardContent className="px-4 sm:px-6 pb-5 pt-0 relative">
              {/* Avatar Row */}
              <div className="flex items-end justify-between -mt-12 sm:-mt-16 mb-3">
                {/* Avatar with Touch-friendly Upload Button */}
                <div className="relative group shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl overflow-hidden bg-card ring-4 ring-card shadow-lg flex items-center justify-center cursor-pointer group-hover:opacity-90 active:scale-95 transition-all text-left relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    title="Change profile picture"
                    aria-label="Change profile picture"
                  >
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={profile?.name || user.name || 'Avatar'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xl sm:text-2xl font-bold text-primary">
                          {userInitials}
                        </span>
                      </div>
                    )}
                    {/* Hover overlay on desktop */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex flex-col items-center justify-center text-white text-[10px] font-semibold">
                      <Camera size={18} className="mb-0.5" />
                      <span>Edit</span>
                    </div>
                  </button>

                  {/* Camera Icon Badge for Mobile & Desktop */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-1.5 sm:p-2 rounded-xl bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all cursor-pointer ring-2 ring-card"
                    title="Change photo"
                    aria-label="Change photo"
                  >
                    <Camera size={14} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onSelectFile}
                  />
                </div>
              </div>

              {/* User Credentials (Cleanly in card body, no line collision) */}
              <div className="space-y-0.5 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight truncate">
                    {profile?.name || user.name || 'Publisher'}
                  </h2>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider ${congregationRoleLabel.badgeColor}`}
                  >
                    <span className="mr-1">{congregationRoleLabel.icon}</span>
                    {congregationRoleLabel.title}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {profile?.email || user.email}
                </p>
              </div>

              {/* Congregation & Ministry Quick Status Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-border">
                {/* Congregation Tile */}
                <div className="p-2.5 sm:p-3 rounded-xl bg-muted/40 border border-border/80 flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Building2 size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      Congregation
                    </p>
                    <p className="text-xs font-semibold text-foreground truncate">
                      {congregation?.name || 'No congregation'}
                    </p>
                  </div>
                  {congregation && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5 shrink-0">
                      <CheckCircle2 size={11} />
                    </span>
                  )}
                </div>

                {/* Service Group Tile */}
                <div className="p-2.5 sm:p-3 rounded-xl bg-muted/40 border border-border/80 flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Users size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      Service Group
                    </p>
                    <p className="text-xs font-semibold text-foreground truncate">
                      {userGroup?.name || 'Unassigned'}
                    </p>
                  </div>
                  {groupRoleLabel && (
                    <span className="text-xs shrink-0" title={groupRoleLabel.title}>
                      {groupRoleLabel.icon}
                    </span>
                  )}
                </div>

                {/* Active Assignments Tile */}
                {congregationId ? (
                  <Link
                    href={`/congregation/${congregationId}/my-assignments`}
                    className="p-2.5 sm:p-3 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/15 flex items-center gap-2.5 min-w-0 transition-colors group active:scale-[0.98]"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                      <Layers size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-primary">
                        Territories
                      </p>
                      <p className="text-xs font-semibold text-foreground truncate">
                        {activeAssignments.length} Active Assigned
                      </p>
                    </div>
                    <ChevronRight
                      size={14}
                      className="text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0"
                    />
                  </Link>
                ) : (
                  <div className="p-2.5 sm:p-3 rounded-xl bg-muted/30 border border-border flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                      <Layers size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Territories
                      </p>
                      <p className="text-xs font-semibold text-muted-foreground">None active</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Responsive Segmented Tabs */}
          <Tabs defaultValue="profile" className="w-full space-y-4">
            <div className="overflow-x-auto scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">
              <TabsList className="h-auto p-1 bg-muted/60 border border-border/60 rounded-2xl grid grid-cols-4 sm:flex sm:w-auto w-full min-w-[320px] gap-1">
                <TabsTrigger
                  value="profile"
                  className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl text-xs font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs cursor-pointer"
                >
                  <User size={14} className="shrink-0" />
                  <span className="truncate">Profile</span>
                </TabsTrigger>

                <TabsTrigger
                  value="security"
                  className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl text-xs font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs cursor-pointer"
                >
                  <KeyRound size={14} className="shrink-0" />
                  <span className="truncate">Security</span>
                </TabsTrigger>

                <TabsTrigger
                  value="notifications"
                  className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl text-xs font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs cursor-pointer"
                >
                  <Bell size={14} className="shrink-0" />
                  <span className="truncate">Alerts</span>
                </TabsTrigger>

                <TabsTrigger
                  value="account"
                  className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl text-xs font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs cursor-pointer"
                >
                  <Shield size={14} className="shrink-0" />
                  <span className="truncate">Account</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: Profile & Affiliation Details */}
            <TabsContent value="profile" className="space-y-4 outline-none">
              {/* Account Information Form */}
              <Card className="bg-card border-border shadow-xs rounded-2xl">
                <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-3">
                  <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                    <User size={16} className="text-primary" />
                    <span>Account Information</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Update your public display name across congregation directories and records
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-semibold">
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        placeholder="Your full name"
                        autoComplete="name"
                        className="h-11 sm:h-10 rounded-xl text-sm sm:text-xs"
                        {...profileForm.register('name')}
                      />
                      {profileForm.formState.errors.name && (
                        <p className="text-[11px] text-destructive">
                          {profileForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-semibold">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile?.email || user.email || ''}
                        disabled
                        className="h-11 sm:h-10 rounded-xl text-sm sm:text-xs opacity-75 bg-muted/50"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Email address is tied to your authentication credentials and cannot be
                        changed here.
                      </p>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        className="rounded-xl text-xs font-semibold h-11 sm:h-9 w-full sm:w-auto active:scale-[0.98] cursor-pointer"
                        disabled={updateProfile.isPending}
                      >
                        {updateProfile.isPending ? 'Saving Changes…' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Congregation & Ministry Affiliation Details */}
              <Card className="bg-card border-border shadow-xs rounded-2xl">
                <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-3">
                  <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                    <Building2 size={16} className="text-primary" />
                    <span>Congregation & Ministry Details</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Your current assignment group, service role, and active territory records
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
                  {/* Congregation Detailed Row */}
                  <div className="p-3.5 rounded-2xl bg-muted/30 border border-border space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        Congregation
                      </p>
                      {congregation && (
                        <Badge
                          variant="outline"
                          className="text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        >
                          Active Member
                        </Badge>
                      )}
                    </div>
                    {congregation ? (
                      <div>
                        <p className="text-sm font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                          <Building2 size={15} className="text-primary shrink-0" />
                          <span>{congregation.name}</span>
                        </p>
                        {congregation.city && (
                          <p className="text-xs text-muted-foreground pl-5 flex items-center gap-1 mt-0.5">
                            <MapPin size={11} className="shrink-0" />
                            <span>{congregation.city}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic mt-1">
                        No congregation assigned
                      </p>
                    )}
                  </div>

                  {/* Service Group Detailed Row */}
                  {congregation && (
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                          Field Service Group
                        </p>
                        {groupRoleLabel && (
                          <Badge
                            variant="outline"
                            className="text-[9px] font-semibold bg-primary/10 text-primary border-primary/20"
                          >
                            {groupRoleLabel.icon} {groupRoleLabel.title}
                          </Badge>
                        )}
                      </div>

                      {userGroup ? (
                        <div className="space-y-3">
                          <div>
                            <p className="text-base font-bold text-foreground flex items-center gap-2">
                              <Users size={17} className="text-primary shrink-0" />
                              <span>{userGroup.name}</span>
                            </p>
                          </div>

                          {/* Leadership Summary */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl bg-card border border-border/70 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <Crown size={14} className="text-amber-500 shrink-0" />
                              <span className="text-muted-foreground text-xs">Overseer:</span>
                              <span className="font-semibold text-foreground truncate text-xs">
                                {userGroup.overseerName || 'Unassigned'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                              <Shield size={14} className="text-blue-500 shrink-0" />
                              <span className="text-muted-foreground text-xs">Assistant:</span>
                              <span className="font-semibold text-foreground truncate text-xs">
                                {userGroup.assistantOverseerName || 'Unassigned'}
                              </span>
                            </div>
                          </div>

                          {/* Groupmates list */}
                          <div className="space-y-2 pt-1 border-t border-border/50">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <span>Groupmates</span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                  {groupmatesList.length}
                                </Badge>
                              </p>
                              {congregationId && (
                                <Link
                                  href={`/congregation/${congregationId}/groups`}
                                  className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-0.5"
                                >
                                  <span>View Group Details</span>
                                  <ChevronRight size={12} />
                                </Link>
                              )}
                            </div>

                            {groupmatesList.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic py-1">
                                No other publishers assigned to this group yet.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                                {groupmatesList.map((gm) => {
                                  const isSelf =
                                    gm.userId === targetUserId ||
                                    (Boolean(gm.email) &&
                                      gm.email.toLowerCase() === user.email?.toLowerCase());
                                  const isOverseer = gm.userId === userGroup.overseerId;
                                  const isAssistant = gm.userId === userGroup.assistantOverseerId;

                                  return (
                                    <div
                                      key={gm.id}
                                      className="flex items-center justify-between p-2 rounded-xl bg-card/80 border border-border/60 text-xs shadow-2xs"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-[9px] flex items-center justify-center shrink-0">
                                          {(gm.name || gm.email || 'P')
                                            .split(' ')
                                            .map((n) => n[0])
                                            .join('')
                                            .toUpperCase()
                                            .slice(0, 2)}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-semibold text-foreground truncate text-[11px] leading-tight">
                                            {gm.name}
                                          </p>
                                          {gm.email && (
                                            <p className="text-[10px] text-muted-foreground truncate leading-tight">
                                              {gm.email}
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      <div className="shrink-0 ml-1">
                                        {isSelf ? (
                                          <Badge
                                            variant="secondary"
                                            className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-primary/20"
                                          >
                                            You
                                          </Badge>
                                        ) : isOverseer ? (
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] px-1 py-0 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                          >
                                            👑
                                          </Badge>
                                        ) : isAssistant ? (
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] px-1 py-0 bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                          >
                                            🛡️
                                          </Badge>
                                        ) : null}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic mt-1">
                          Not assigned to a service group
                        </p>
                      )}
                    </div>
                  )}

                  {/* Territory Shortcut */}
                  {congregationId && (
                    <Link
                      href={`/congregation/${congregationId}/my-assignments`}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-primary/5 hover:bg-primary/10 border border-primary/15 transition-all text-xs font-medium text-foreground group active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                          <Layers size={14} />
                        </div>
                        <div>
                          <span className="font-bold text-sm block">My Territories</span>
                          <span className="text-[11px] text-muted-foreground block">
                            View active assignments & map households
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary text-primary-foreground text-[10px] font-bold px-2 h-5">
                          {activeAssignments.length}
                        </Badge>
                        <ChevronRight
                          size={16}
                          className="text-muted-foreground group-hover:translate-x-0.5 transition-transform"
                        />
                      </div>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: Security & Password */}
            <TabsContent value="security" className="space-y-4 outline-none">
              <Card className="bg-card border-border shadow-xs rounded-2xl">
                <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-3">
                  <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                    <KeyRound size={16} className="text-primary" />
                    <span>Security & Password</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Ensure your account is using a secure, strong password
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <form
                    onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="currentPassword" className="text-xs font-semibold">
                        Current Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPw ? 'text' : 'password'}
                          autoComplete="current-password"
                          className="h-11 sm:h-10 rounded-xl text-sm sm:text-xs pr-11"
                          {...passwordForm.register('currentPassword')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPw(!showCurrentPw)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                          aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
                        >
                          {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {passwordForm.formState.errors.currentPassword && (
                        <p className="text-[11px] text-destructive">
                          {passwordForm.formState.errors.currentPassword.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="newPassword" className="text-xs font-semibold">
                          New Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPw ? 'text' : 'password'}
                            autoComplete="new-password"
                            className="h-11 sm:h-10 rounded-xl text-sm sm:text-xs pr-11"
                            {...passwordForm.register('newPassword')}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPw(!showNewPw)}
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                            aria-label={showNewPw ? 'Hide password' : 'Show password'}
                          >
                            {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {passwordForm.formState.errors.newPassword && (
                          <p className="text-[11px] text-destructive">
                            {passwordForm.formState.errors.newPassword.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="confirmPassword" className="text-xs font-semibold">
                          Confirm New Password
                        </Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          autoComplete="new-password"
                          className="h-11 sm:h-10 rounded-xl text-sm sm:text-xs"
                          {...passwordForm.register('confirmNewPassword')}
                        />
                        {passwordForm.formState.errors.confirmNewPassword && (
                          <p className="text-[11px] text-destructive">
                            {passwordForm.formState.errors.confirmNewPassword.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/40 border border-border text-[11px] text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground">Password Recommendation:</p>
                      <p>
                        Use at least 8 characters with a combination of uppercase letters, numbers,
                        and symbols.
                      </p>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        className="rounded-xl text-xs font-semibold h-11 sm:h-9 w-full sm:w-auto active:scale-[0.98] cursor-pointer"
                        disabled={changePassword.isPending}
                      >
                        {changePassword.isPending ? 'Updating Password…' : 'Update Password'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: Notification Preferences */}
            <TabsContent value="notifications" className="space-y-4 outline-none">
              <Card className="bg-card border-border shadow-xs rounded-2xl">
                <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                      <Bell size={16} className="text-primary" />
                      <span>Notification Preferences</span>
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0.5 px-2 border-primary/30 text-primary"
                    >
                      <Cloud size={11} className="mr-1" />
                      Firebase Cloud Sync
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground">
                    Manage real-time in-app alerts and audio chimes stored in your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
                  {/* Audio Sound Settings */}
                  <div className="p-3.5 sm:p-4 rounded-2xl border border-border bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                        <Label
                          htmlFor="profile-sound-switch"
                          className="font-semibold text-xs text-foreground cursor-pointer block"
                        >
                          Notification Audio Sound
                        </Label>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Play a gentle chime when new notifications arrive in real-time.
                        </p>
                      </div>
                      <Switch
                        id="profile-sound-switch"
                        checked={notifSoundEnabled}
                        onCheckedChange={toggleNotifSound}
                        disabled={isUpdatingNotif}
                        className="shrink-0"
                      />
                    </div>

                    {notifSoundEnabled && (
                      <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold text-foreground">Chime Style</span>
                          <p className="text-[11px] text-muted-foreground">
                            Choose synthesizer tone profile
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Select
                            value={notifSoundStyle}
                            onValueChange={(style) =>
                              setNotifSoundStyle(style as NotificationSoundStyle)
                            }
                            disabled={isUpdatingNotif}
                          >
                            <SelectTrigger className="h-9 sm:h-8 flex-1 sm:w-[140px] rounded-xl text-xs">
                              <SelectValue placeholder="Style" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="chime" className="text-xs">
                                Chime (Modern)
                              </SelectItem>
                              <SelectItem value="ding" className="text-xs">
                                Ding (Bell)
                              </SelectItem>
                              <SelectItem value="pop" className="text-xs">
                                Pop (Crisp)
                              </SelectItem>
                              <SelectItem value="subtle" className="text-xs">
                                Subtle (Warm)
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => playNotifPreview(notifSoundStyle)}
                            className="h-9 sm:h-8 px-3 rounded-xl text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10 active:scale-95 cursor-pointer shrink-0"
                          >
                            <Volume2 size={13} className="mr-1" />
                            Test
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Categories */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                      Event Categories
                    </p>

                    <div className="space-y-2">
                      <div className="p-3 sm:p-3.5 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-1">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <MapPin size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Label
                              htmlFor="profile-cat-territory"
                              className="text-xs font-semibold text-foreground block cursor-pointer truncate"
                            >
                              Territories & Assignments
                            </Label>
                            <span className="text-[11px] text-muted-foreground block truncate">
                              Approvals, endorsements, rejections & returns
                            </span>
                          </div>
                        </div>
                        <Switch
                          id="profile-cat-territory"
                          checked={notifSettings.territoryUpdates}
                          onCheckedChange={(checked) =>
                            updateNotifSettings({ territoryUpdates: checked })
                          }
                          disabled={isUpdatingNotif}
                          className="shrink-0"
                        />
                      </div>

                      <div className="p-3 sm:p-3.5 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-1">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Share2 size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Label
                              htmlFor="profile-cat-share"
                              className="text-xs font-semibold text-foreground block cursor-pointer truncate"
                            >
                              Record Sharing
                            </Label>
                            <span className="text-[11px] text-muted-foreground block truncate">
                              Household share requests, acceptances & declines
                            </span>
                          </div>
                        </div>
                        <Switch
                          id="profile-cat-share"
                          checked={notifSettings.shareUpdates}
                          onCheckedChange={(checked) =>
                            updateNotifSettings({ shareUpdates: checked })
                          }
                          disabled={isUpdatingNotif}
                          className="shrink-0"
                        />
                      </div>

                      <div className="p-3 sm:p-3.5 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-1">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                            <Users size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Label
                              htmlFor="profile-cat-membership"
                              className="text-xs font-semibold text-foreground block cursor-pointer truncate"
                            >
                              Membership & Access
                            </Label>
                            <span className="text-[11px] text-muted-foreground block truncate">
                              Join requests, endorsements & role updates
                            </span>
                          </div>
                        </div>
                        <Switch
                          id="profile-cat-membership"
                          checked={notifSettings.membershipUpdates}
                          onCheckedChange={(checked) =>
                            updateNotifSettings({ membershipUpdates: checked })
                          }
                          disabled={isUpdatingNotif}
                          className="shrink-0"
                        />
                      </div>

                      <div className="p-3 sm:p-3.5 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-1">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Shield size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Label
                              htmlFor="profile-cat-account"
                              className="text-xs font-semibold text-foreground block cursor-pointer truncate"
                            >
                              Account & Requests
                            </Label>
                            <span className="text-[11px] text-muted-foreground block truncate">
                              Leave requests & account status updates
                            </span>
                          </div>
                        </div>
                        <Switch
                          id="profile-cat-account"
                          checked={notifSettings.accountUpdates}
                          onCheckedChange={(checked) =>
                            updateNotifSettings({ accountUpdates: checked })
                          }
                          disabled={isUpdatingNotif}
                          className="shrink-0"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: Account Management (Danger Zone) */}
            <TabsContent value="account" className="space-y-4 outline-none">
              <Card className="border-destructive/30 bg-destructive/5 dark:bg-destructive/10 shadow-xs rounded-2xl">
                <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-3">
                  <CardTitle className="text-sm sm:text-base font-bold text-destructive flex items-center gap-2">
                    <AlertTriangle size={16} />
                    <span>Account & Congregation Management</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Request congregation departure or permanent account deletion with System Admin
                    review
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
                  {/* Leave Congregation Option */}
                  <div className="p-4 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-foreground">Leave Congregation</p>
                        {pendingLeaveRequest && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          >
                            ⏳ Pending Admin Approval
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {congregation
                          ? `Submit a request to leave ${congregation.name}. Upon System Admin approval, your assignments and group membership will be cleared.`
                          : 'You are currently not assigned to a congregation.'}
                      </p>
                      {pendingLeaveRequest && (
                        <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-0.5">
                          <p className="font-semibold">
                            Request submitted on{' '}
                            {new Date(pendingLeaveRequest.requestedAt).toLocaleDateString()}
                          </p>
                          {pendingLeaveRequest.reason && (
                            <p className="italic">&ldquo;{pendingLeaveRequest.reason}&rdquo;</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 pt-1 sm:pt-0">
                      {pendingLeaveRequest ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground h-10 sm:h-9 w-full sm:w-auto cursor-pointer"
                          onClick={() => handleCancelRequest(pendingLeaveRequest.id)}
                          disabled={isSubmittingRequest}
                        >
                          Cancel Request
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl text-xs font-semibold border-destructive/30 text-destructive hover:bg-destructive/10 h-10 sm:h-9 w-full sm:w-auto cursor-pointer"
                          onClick={() => setLeaveDialogOpen(true)}
                          disabled={!congregation || isSubmittingRequest}
                        >
                          <LogOut size={13} className="mr-1.5" />
                          Request to Leave
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Delete Account Option */}
                  <div className="p-4 rounded-2xl border border-destructive/20 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-destructive">Delete Account</p>
                        {pendingDeleteRequest && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold bg-destructive/15 text-destructive border-destructive/30"
                          >
                            ⏳ Pending Admin Review
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Permanently request account deactivation and removal. Requires System Admin
                        review to ensure territories and group assignments are resolved.
                      </p>
                      {pendingDeleteRequest && (
                        <div className="mt-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-0.5">
                          <p className="font-semibold">
                            Deletion request submitted on{' '}
                            {new Date(pendingDeleteRequest.requestedAt).toLocaleDateString()}
                          </p>
                          {pendingDeleteRequest.reason && (
                            <p className="italic">&ldquo;{pendingDeleteRequest.reason}&rdquo;</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 pt-1 sm:pt-0">
                      {pendingDeleteRequest ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground h-10 sm:h-9 w-full sm:w-auto cursor-pointer"
                          onClick={() => handleCancelRequest(pendingDeleteRequest.id)}
                          disabled={isSubmittingRequest}
                        >
                          Cancel Request
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="rounded-xl text-xs font-semibold h-10 sm:h-9 w-full sm:w-auto cursor-pointer"
                          onClick={() => setDeleteDialogOpen(true)}
                          disabled={isSubmittingRequest}
                        >
                          <Trash2 size={13} className="mr-1.5" />
                          Request Deletion
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Sign Out Option */}
                  <div className="p-4 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="font-bold text-sm text-foreground">Sign Out</p>
                      <p className="text-xs text-muted-foreground">
                        Log out of your current session on this device.
                      </p>
                    </div>
                    <div className="shrink-0 pt-1 sm:pt-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs font-semibold border-destructive/30 text-destructive hover:bg-destructive/10 h-10 sm:h-9 w-full sm:w-auto cursor-pointer"
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                      >
                        <LogOut size={13} className="mr-1.5" />
                        {isSigningOut ? 'Signing out…' : 'Sign Out'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        {/* Bottom Tab Bar for Mobile Users with Congregation */}
        {congregationId && <BottomTabBar />}

        {/* Avatar Crop Dialog */}
        {cropOpen && (
          <AvatarCropDialog
            open={cropOpen}
            onOpenChange={setCropOpen}
            imageSrc={cropSrc}
            onCropComplete={handleCropComplete}
            loading={updateAvatar.isPending}
          />
        )}

        {/* Request Leave Congregation Dialog */}
        <ResponsiveDialog
          open={leaveDialogOpen}
          onOpenChange={setLeaveDialogOpen}
          title="Request to Leave Congregation"
          description={`Submit a formal departure request for ${congregation?.name || 'your congregation'}.`}
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
              <p className="font-bold flex items-center gap-1.5 mb-1">
                <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                <span>System Admin Approval Required</span>
              </p>
              <p>
                Once approved by a System Admin, your publisher record will be unlinked from{' '}
                {congregation?.name}, any active territories will be returned, and group roles will
                be released.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="leaveReason" className="text-xs font-semibold">
                Reason for Leaving (Optional)
              </Label>
              <Textarea
                id="leaveReason"
                placeholder="e.g. Relocating to a new territory, transfer to another congregation…"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="text-sm sm:text-xs rounded-xl min-h-[90px]"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs h-10 sm:h-9 w-full sm:w-auto cursor-pointer"
                onClick={() => setLeaveDialogOpen(false)}
                disabled={isSubmittingRequest}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="rounded-xl text-xs font-semibold h-10 sm:h-9 w-full sm:w-auto cursor-pointer"
                onClick={handleRequestLeave}
                disabled={isSubmittingRequest}
              >
                {isSubmittingRequest ? 'Submitting…' : 'Submit Leave Request'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>

        {/* Request Delete Account Dialog */}
        <ResponsiveDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Request Account Deletion"
          description="Permanently submit your account for deactivation and deletion."
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              <p className="font-bold flex items-center gap-1.5 mb-1">
                <AlertTriangle size={14} className="shrink-0" />
                <span>Important Warning</span>
              </p>
              <p>
                This action requires System Admin verification. Upon approval, all your ministry
                assignments will be returned, your congregation membership removed, and your account
                permanently deactivated.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deleteReason" className="text-xs font-semibold">
                Reason for Deletion (Optional)
              </Label>
              <Textarea
                id="deleteReason"
                placeholder="Please let us know why you are deleting your account…"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="text-sm sm:text-xs rounded-xl min-h-[80px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deleteConfirm" className="text-xs font-semibold">
                Type <span className="font-bold text-destructive">DELETE</span> to confirm:
              </Label>
              <Input
                id="deleteConfirm"
                placeholder="DELETE"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="text-sm sm:text-xs rounded-xl h-10"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs h-10 sm:h-9 w-full sm:w-auto cursor-pointer"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isSubmittingRequest}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="rounded-xl text-xs font-semibold h-10 sm:h-9 w-full sm:w-auto cursor-pointer"
                onClick={handleRequestDelete}
                disabled={
                  deleteConfirmText.trim().toUpperCase() !== 'DELETE' || isSubmittingRequest
                }
              >
                {isSubmittingRequest ? 'Submitting…' : 'Submit Deletion Request'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>
      </div>
    </ProtectedPage>
  );
}
