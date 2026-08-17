'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  Layers,
  MapPin,
  Shield,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AvatarCropDialog } from '@/components/avatar-crop-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useChangePassword,
  useCongregation,
  useCongregationGroups,
  useCongregationMembers,
  useCurrentUser,
  useMyAssignments,
  useProfile,
  useUpdateAvatar,
  useUpdateProfile,
} from '@/hooks';
import type { ChangePasswordFormData, UpdateProfileFormData } from '@/schemas/profile';
import { changePasswordSchema, updateProfileSchema } from '@/schemas/profile';

export default function ProfilePage() {
  const { data: profile } = useProfile();
  const { user } = useCurrentUser();
  const congregationId = profile?.congregationId || user.congregationId || '';
  const { congregation } = useCongregation(congregationId);
  const { data: groups = [] } = useCongregationGroups(congregationId);
  const { data: members = [] } = useCongregationMembers(congregationId);
  const { data: assignments = [] } = useMyAssignments(congregationId);

  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const updateAvatar = useUpdateAvatar();

  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

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
  const userGroup = groups.find(
    (g) =>
      g.overseerId === targetUserId ||
      g.assistantOverseerId === targetUserId ||
      g.members.some((m) => (m.userId || m.id) === targetUserId)
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
    return {
      title: 'Publisher',
      badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      icon: '👤',
    };
  })();

  // Active assignments
  const activeAssignments = assignments.filter((a) => a.status === 'active');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Profile & Settings</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage your account credentials, congregation role, and ministry profile
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile & Ministry Overview Card */}
        <Card className="md:col-span-1 bg-card border-border shadow-xs">
          <CardContent className="p-6 flex flex-col items-center text-center">
            {/* Avatar with Camera Overlay & Click to Upload */}
            <div className="relative group mb-3">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-primary/10 border-2 border-primary/30 flex items-center justify-center shadow-xs">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={profile?.name || user.name || 'Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-primary">{userInitials}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-semibold"
                title="Change profile picture"
              >
                <Camera size={22} className="mb-0.5" />
                <span>Edit Photo</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onSelectFile}
              />
            </div>

            {/* Change Photo Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-7 text-[11px] px-2.5 rounded-lg mb-3 gap-1 text-muted-foreground hover:text-foreground"
            >
              <Camera size={12} />
              <span>Change Photo</span>
            </Button>

            {/* Name & Email */}
            <h2 className="text-base font-bold text-foreground truncate max-w-full">
              {profile?.name || user.name || 'Publisher'}
            </h2>
            <p className="text-xs text-muted-foreground truncate max-w-full">
              {profile?.email || user.email}
            </p>

            {/* Congregation Role Badge */}
            <div className="mt-3">
              <Badge
                variant="outline"
                className={`text-xs font-bold px-3 py-1 rounded-xl uppercase tracking-wider ${congregationRoleLabel.badgeColor}`}
              >
                <span className="mr-1">{congregationRoleLabel.icon}</span>
                {congregationRoleLabel.title}
              </Badge>
            </div>

            {/* Congregation Affiliation Details */}
            <div className="mt-5 pt-4 border-t border-border w-full text-left space-y-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center justify-between">
                  <span>Congregation</span>
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                    <CheckCircle2 size={10} /> Active
                  </span>
                </p>
                {congregation ? (
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <Building2 size={14} className="text-primary shrink-0" />
                      <span className="truncate">{congregation.name}</span>
                    </div>
                    {congregation.city && (
                      <p className="text-[11px] text-muted-foreground pl-5 flex items-center gap-1">
                        <MapPin size={10} className="shrink-0" />
                        <span>{congregation.city}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No congregation assigned</p>
                )}
              </div>

              {/* Service Group Affiliation */}
              {congregation && (
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Service Group
                  </p>
                  {userGroup ? (
                    <div className="p-3 rounded-2xl bg-muted/40 border border-border space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <Users size={14} className="text-primary shrink-0" />
                          <span className="truncate">{userGroup.name}</span>
                        </div>
                        {groupRoleLabel && (
                          <Badge
                            variant="outline"
                            className="text-[9px] font-semibold px-2 py-0.5 bg-primary/10 text-primary border-primary/20"
                          >
                            {groupRoleLabel.icon} {groupRoleLabel.title}
                          </Badge>
                        )}
                      </div>
                      {userGroup.overseerName && (
                        <p className="text-[11px] text-muted-foreground pl-5 truncate">
                          Overseer: <span className="text-foreground font-medium">{userGroup.overseerName}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-muted/30 border border-dashed border-border text-center">
                      <p className="text-[11px] text-muted-foreground">Not assigned to a service group</p>
                    </div>
                  )}
                </div>
              )}

              {/* Active Territory Assignments Snapshot */}
              {congregationId && (
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Ministry Activity
                  </p>
                  <Link
                    href={`/congregation/${congregationId}/my-assignments`}
                    className="flex items-center justify-between p-3 rounded-2xl bg-primary/5 hover:bg-primary/10 border border-primary/15 transition-all text-xs font-medium text-foreground group"
                  >
                    <div className="flex items-center gap-2">
                      <Layers size={14} className="text-primary" />
                      <span>Territory Assignments</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 h-4">
                        {activeAssignments.length}
                      </Badge>
                      <ChevronRight size={14} className="text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Forms & Account Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Account Information Form */}
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <User size={16} className="text-primary" />
                <span>Account Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Your full name"
                    className="h-10 rounded-xl text-xs"
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
                    className="h-10 rounded-xl text-xs opacity-70 bg-muted/50"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Email address is managed through your authentication credentials.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    className="rounded-xl text-xs font-semibold"
                    disabled={updateProfile.isPending}
                  >
                    {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Change Password Form */}
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <KeyRound size={16} className="text-primary" />
                <span>Security & Password</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword" className="text-xs font-semibold">
                    Current Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPw ? 'text' : 'password'}
                      className="h-10 rounded-xl text-xs pr-10"
                      {...passwordForm.register('currentPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-[11px] text-destructive">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword" className="text-xs font-semibold">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPw ? 'text' : 'password'}
                        className="h-10 rounded-xl text-xs pr-10"
                        {...passwordForm.register('newPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
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
                      className="h-10 rounded-xl text-xs"
                      {...passwordForm.register('confirmNewPassword')}
                    />
                    {passwordForm.formState.errors.confirmNewPassword && (
                      <p className="text-[11px] text-destructive">
                        {passwordForm.formState.errors.confirmNewPassword.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="outline"
                    className="rounded-xl text-xs font-semibold"
                    disabled={changePassword.isPending}
                  >
                    {changePassword.isPending ? 'Updating…' : 'Update Password'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

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
    </div>
  );
}

