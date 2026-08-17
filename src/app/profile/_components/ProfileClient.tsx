'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Camera, Eye, EyeOff, KeyRound, User } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AvatarCropDialog } from '@/components/avatar-crop-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCongregation } from '@/hooks/use-congregations';
import {
  useChangePassword,
  useProfile,
  useUpdateAvatar,
  useUpdateProfile,
} from '@/hooks/use-profile';
import type { ChangePasswordFormData, UpdateProfileFormData } from '@/schemas/profile';
import { changePasswordSchema, updateProfileSchema } from '@/schemas/profile';

function roleLabel(role?: string | null) {
  const map: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    SERVICE_OVERSEER: 'Service Overseer',
    TERRITORY_SERVANT: 'Territory Servant',
  };
  return role ? (map[role] ?? 'Publisher') : 'Publisher';
}

export default function ProfilePage() {
  const { data: profile } = useProfile();
  const { congregation } = useCongregation(profile?.congregationId);
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
      name: profile?.name ?? '',
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
  };

  const handleCropComplete = async (blob: Blob) => {
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
    await updateAvatar.mutateAsync(file);
  };

  const onProfileSubmit = async (data: UpdateProfileFormData) => {
    await updateProfile.mutateAsync(data);
  };

  const onPasswordSubmit = async (data: ChangePasswordFormData) => {
    await changePassword.mutateAsync(data);
    passwordForm.reset();
  };

  const userInitials = (profile?.name || profile?.email || 'P')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile & Settings</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage your account information and preferences
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1 bg-card border-border shadow-xs">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="relative group mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                {profile?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.image}
                    alt={profile.name ?? 'Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  userInitials
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Change photo"
              >
                <Camera size={20} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onSelectFile}
              />
            </div>

            <h2 className="text-base font-bold text-foreground truncate max-w-full">
              {profile?.name || 'Publisher'}
            </h2>
            <p className="text-xs text-muted-foreground truncate max-w-full">{profile?.email}</p>

            <div className="mt-3">
              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5">
                {roleLabel(profile?.role)}
              </Badge>
            </div>

            {/* Congregation Details */}
            <div className="mt-5 pt-4 border-t border-border w-full text-left space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Congregation
              </p>
              {congregation ? (
                <div className="p-3 rounded-xl bg-muted/50 border border-border space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Building2 size={13} className="text-primary shrink-0" />
                    <span className="truncate">{congregation.name}</span>
                  </div>
                  {congregation.city && (
                    <p className="text-[11px] text-muted-foreground pl-5">{congregation.city}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No congregation assigned</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Account Details */}
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
                    placeholder="Your name"
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
                    value={profile?.email ?? ''}
                    disabled
                    className="h-10 rounded-xl text-xs opacity-60 bg-muted/50"
                  />
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

          {/* Change Password */}
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
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
