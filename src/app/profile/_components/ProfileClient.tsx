'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Camera, Loader2, CloudOff } from 'lucide-react';
import { useProfile, useUpdateProfile, useChangePassword, useUploadAvatar } from '@/hooks/use-profile';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { AvatarCropDialog } from '@/components/avatar-crop-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { updateProfileSchema, changePasswordSchema } from '@/schemas/profile';
import type { UpdateProfileFormData, ChangePasswordFormData } from '@/schemas/profile';

// ─── Password strength ────────────────────────────────────────────────────────

type StrengthInfo = { label: string; width: string; color: string; bg: string; score: number };

function getPasswordStrength(password: string): StrengthInfo {
  if (password.length === 0)
    return { label: '', width: '0%', color: 'text-border', bg: 'bg-border', score: 0 };
  if (password.length < 6)
    return { label: 'Too short', width: '20%', color: 'text-red-400', bg: 'bg-red-400', score: 1 };
  if (password.length < 8)
    return { label: 'Weak', width: '40%', color: 'text-orange-400', bg: 'bg-orange-400', score: 2 };
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const extras = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (extras === 0)
    return { label: 'Fair', width: '55%', color: 'text-yellow-400', bg: 'bg-yellow-400', score: 3 };
  if (extras <= 1)
    return { label: 'Good', width: '75%', color: 'text-accent', bg: 'bg-accent', score: 4 };
  return { label: 'Strong', width: '100%', color: 'text-green-400', bg: 'bg-green-400', score: 5 };
}

function roleLabel(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN': return 'Super Admin';
    case 'ADMIN': return 'Admin';
    case 'SERVICE_OVERSEER': return 'Service Overseer';
    case 'TERRITORY_SERVANT': return 'Territory Servant';
    default: return 'Member';
  }
}

// ─── Avatar component ─────────────────────────────────────────────────────────

function Avatar({ avatarUrl, name, size = 'lg' }: { avatarUrl?: string | null; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-8 h-8 text-sm', md: 'w-12 h-12 text-base', lg: 'w-20 h-20 text-2xl' };
  if (avatarUrl) {
    // biome-ignore lint/performance/noImgElement: avatarUrl may be a blob URL (local preview) — next/image can't handle it
    return <img src={avatarUrl} alt={name} className={`${sizes[size]} rounded-full object-cover`} />;
  }
  return (
    <div className={`${sizes[size]} rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold`}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

// ─── LocalStorage helpers for offline pending avatar ─────────────────────────

function getPendingAvatarKey(userId: string) {
  return `pending_avatar_${userId}`;
}

function storePendingAvatar(userId: string, base64: string) {
  try {
    localStorage.setItem(getPendingAvatarKey(userId), base64);
  } catch {
    // storage quota exceeded or unavailable
  }
}

function getPendingAvatar(userId: string): string | null {
  try {
    return localStorage.getItem(getPendingAvatarKey(userId));
  } catch {
    return null;
  }
}

function clearPendingAvatar(userId: string) {
  try {
    localStorage.removeItem(getPendingAvatarKey(userId));
  } catch {
    // ignore
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── AvatarUpload section ────────────────────────────────────────────────────

interface AvatarUploadProps {
  userId: string;
  name: string;
  serverAvatarUrl?: string | null;
  onUploaded: (url: string) => void;
}

function AvatarUpload({ userId, name, serverAvatarUrl, onUploaded }: AvatarUploadProps) {
  const { upload, isUploading } = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [offlineMsg, setOfflineMsg] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Crop dialog state
  const [cropImgSrc, setCropImgSrc] = useState('');
  const [cropOpen, setCropOpen] = useState(false);

  // On mount: try to sync a pending offline avatar
  const trySyncPending = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const pending = getPendingAvatar(userId);
    if (!pending || !navigator.onLine) return;
    try {
      const res = await fetch(pending);
      const blob = await res.blob();
      const file = new File([blob], 'avatar', { type: blob.type });
      const result = await upload({ file });
      if (result?.avatarUrl) {
        onUploaded(result.avatarUrl);
        clearPendingAvatar(userId);
        setOfflineMsg('');
        setPreviewUrl(result.avatarUrl);
      }
    } catch {
      // Will retry next time
    }
  }, [userId, upload, onUploaded]);

  useEffect(() => {
    const pending = getPendingAvatar(userId);
    if (pending) {
      setPreviewUrl(pending);
      setOfflineMsg('Saved locally, will sync when online');
      trySyncPending();
    }
  }, [userId, trySyncPending]);

  // Try to sync when coming back online
  useEffect(() => {
    const handler = () => trySyncPending();
    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
  }, [trySyncPending]);

  // Step 1: file selected → open crop dialog
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setOfflineMsg('');
    const reader = new FileReader();
    reader.onload = () => {
      setCropImgSrc(reader.result as string);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Step 2: crop confirmed → preview + upload/queue
  async function handleCropComplete(file: File) {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    if (navigator.onLine) {
      try {
        const result = await upload({ file });
        if (result?.avatarUrl) {
          onUploaded(result.avatarUrl);
          setPreviewUrl(result.avatarUrl);
          clearPendingAvatar(userId);
        }
      } catch (err: unknown) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed.');
      }
    } else {
      const base64 = await fileToBase64(file);
      storePendingAvatar(userId, base64);
      setOfflineMsg('Saved locally, will sync when online');
    }
  }

  const displayUrl = previewUrl ?? serverAvatarUrl;

  return (
    <>
      <AvatarCropDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        imgSrc={cropImgSrc}
        onCropComplete={handleCropComplete}
      />

      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <Avatar avatarUrl={displayUrl} name={name} size="lg" />
          {isUploading && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
              <Loader2 size={20} className="text-white animate-spin" />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-foreground leading-none">{name}</p>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-1.5 text-xs"
            >
              <Camera size={13} />
              {isUploading ? 'Uploading…' : 'Change photo'}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, or WebP · max 5 MB</p>
          </div>
          {offlineMsg && <p className="text-xs text-yellow-500">{offlineMsg}</p>}
          {uploadError && (
            uploadError.toLowerCase().includes('not configured') ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-default mt-1">
                      <CloudOff size={14} className="text-muted-foreground" />
                      Cloud sync unavailable
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Profile picture sync is not configured yet. Your photo is saved locally.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <p className="text-xs text-destructive">{uploadError}</p>
            )
          )}
        </div>
      </div>
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileClient() {
  const { profile, isLoading, mutate } = useProfile();
  const { update, isUpdating } = useUpdateProfile();
  const { changePassword, isChanging } = useChangePassword();

  const [nameSuccess, setNameSuccess] = useState('');
  const [nameError, setNameError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const nameForm = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    values: { name: profile?.name ?? '' },
  });

  const pwForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  });

  const newPasswordValue = pwForm.watch('newPassword');
  const strength = getPasswordStrength(newPasswordValue ?? '');

  async function onUpdateName(data: UpdateProfileFormData) {
    setNameSuccess('');
    setNameError('');
    try {
      await update({ name: data.name });
      await mutate();
      setNameSuccess('Name updated successfully.');
    } catch (e: unknown) {
      setNameError(e instanceof Error ? e.message : 'Failed to update name.');
    }
  }

  async function onChangePassword(data: ChangePasswordFormData) {
    setPwSuccess('');
    setPwError('');
    try {
      await changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      setPwSuccess('Password changed successfully.');
      pwForm.reset();
    } catch (e: unknown) {
      setPwError(e instanceof Error ? e.message : 'Failed to change password.');
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading profile…</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-destructive text-sm">Could not load profile.</div>
      </div>
    );
  }

  const memberSince = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Page header */}
        <div className="flex items-center gap-4">
          <Avatar avatarUrl={profile.avatarUrl} name={profile.name} size="md" />
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        </div>

        {/* ── Section 1: Profile Info ── */}
        <section className="border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Profile Info</h2>
          <AvatarUpload
            userId={profile.id}
            name={profile.name}
            serverAvatarUrl={profile.avatarUrl}
            onUploaded={() => mutate()}
          />
          <div className="pt-2 space-y-1">
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <span className="inline-block text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
              {roleLabel(profile.role)}
            </span>
            <p className="text-xs text-muted-foreground pt-1">Member since {memberSince}</p>
          </div>
        </section>

        {/* ── Section 2: Update Name ── */}
        <section className="border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Update Name</h2>
          <form onSubmit={nameForm.handleSubmit(onUpdateName)} className="space-y-4">
            <FormField
              label="Name"
              id="name"
              type="text"
              error={nameForm.formState.errors.name?.message}
              {...nameForm.register('name')}
            />
            {nameSuccess && <p className="text-sm text-green-500">{nameSuccess}</p>}
            {nameError && <p className="text-sm text-destructive">{nameError}</p>}
            <Button type="submit" disabled={isUpdating || nameForm.formState.isSubmitting} size="sm">
              {isUpdating ? 'Saving…' : 'Save Changes'}
            </Button>
          </form>
        </section>

        {/* ── Section 3: Change Password ── */}
        <section className="border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Change Password</h2>
          <form onSubmit={pwForm.handleSubmit(onChangePassword)} className="space-y-4">

            {/* Current password */}
            <div className="relative">
              <FormField
                label="Current Password"
                id="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                error={pwForm.formState.errors.currentPassword?.message}
                {...pwForm.register('currentPassword')}
              />
              <button
                type="button"
                className="absolute right-3 top-[34px] text-muted-foreground hover:text-foreground"
                onClick={() => setShowCurrent((v) => !v)}
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* New password */}
            <div className="relative">
              <FormField
                label="New Password"
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                error={pwForm.formState.errors.newPassword?.message}
                {...pwForm.register('newPassword')}
              />
              <button
                type="button"
                className="absolute right-3 top-[34px] text-muted-foreground hover:text-foreground"
                onClick={() => setShowNew((v) => !v)}
                tabIndex={-1}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Password strength indicator */}
            {newPasswordValue && newPasswordValue.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Password strength</span>
                  {strength.label && (
                    <span className={`text-xs font-medium ${strength.color}`}>{strength.label}</span>
                  )}
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strength.bg}`}
                    style={{ width: strength.width }}
                  />
                </div>
              </div>
            )}

            {/* Confirm new password */}
            <div className="relative">
              <FormField
                label="Confirm New Password"
                id="confirmNewPassword"
                type={showConfirm ? 'text' : 'password'}
                error={pwForm.formState.errors.confirmNewPassword?.message}
                {...pwForm.register('confirmNewPassword')}
              />
              <button
                type="button"
                className="absolute right-3 top-[34px] text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {pwSuccess && <p className="text-sm text-green-500">{pwSuccess}</p>}
            {pwError && <p className="text-sm text-destructive">{pwError}</p>}
            <Button type="submit" disabled={isChanging || pwForm.formState.isSubmitting} size="sm">
              {isChanging ? 'Changing…' : 'Change Password'}
            </Button>
          </form>
        </section>

      </div>
    </div>
  );
}
