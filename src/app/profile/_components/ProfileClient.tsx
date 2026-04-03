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
import {
  storePendingAvatarBlob,
  getPendingAvatarBlob,
  clearPendingAvatarBlob,
  hasPendingAvatarFlag,
  setPendingAvatarFlag,
} from '@/lib/avatar-store';

// ─── Password strength ────────────────────────────────────────────────────────

type StrengthInfo = { label: string; width: string; color: string; bg: string };

function getPasswordStrength(p: string): StrengthInfo {
  if (!p) return { label: '', width: '0%', color: '', bg: 'bg-muted' };
  if (p.length < 6) return { label: 'Too short', width: '20%', color: 'text-red-400', bg: 'bg-red-400' };
  if (p.length < 8) return { label: 'Weak', width: '40%', color: 'text-orange-400', bg: 'bg-orange-400' };
  const extras = [/[A-Z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
  if (extras === 0) return { label: 'Fair', width: '55%', color: 'text-yellow-400', bg: 'bg-yellow-400' };
  if (extras <= 1) return { label: 'Good', width: '75%', color: 'text-primary', bg: 'bg-primary' };
  return { label: 'Strong', width: '100%', color: 'text-green-500', bg: 'bg-green-500' };
}

function roleLabel(role: string) {
  const map: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin',
    SERVICE_OVERSEER: 'Service Overseer', TERRITORY_SERVANT: 'Territory Servant',
  };
  return map[role] ?? 'Member';
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function AvatarCircle({
  url, name, size, loading, onClick,
}: {
  url?: string | null; name: string; size: number; loading?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative rounded-full overflow-hidden shrink-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 group"
      style={{ width: size, height: size }}
      aria-label="Change profile photo"
      type="button"
    >
      {url ? (
        // biome-ignore lint/performance/noImgElement: blob/remote URL
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div
          className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground font-semibold"
          style={{ fontSize: size * 0.38 }}
        >
          {name[0]?.toUpperCase()}
        </div>
      )}
      {/* hover overlay */}
      {onClick && !loading && (
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera size={size * 0.28} className="text-white" />
        </div>
      )}
      {loading && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <Loader2 size={size * 0.28} className="text-white animate-spin" />
        </div>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProfileClient() {
  const { profile, isLoading, mutate } = useProfile();
  const { update } = useUpdateProfile();
  const { changePassword } = useChangePassword();
  const { upload, isUploading } = useUploadAvatar();

  // ── Avatar / offline state ────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropImgSrc, setCropImgSrc] = useState('');
  const [cropOpen, setCropOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hasPending, setHasPending] = useState(() =>
    typeof window !== 'undefined' ? hasPendingAvatarFlag(profile?.id ?? '') : false
  );
  const [offlineMsg, setOfflineMsg] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Load IDB blob → object URL when there's a pending avatar
  useEffect(() => {
    if (!profile?.id || !hasPending) return;
    let objectUrl = '';
    getPendingAvatarBlob(profile.id).then((blob) => {
      if (!blob) return;
      objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
      setOfflineMsg('Saved locally · will sync when online');
    });
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [profile?.id, hasPending]);

  const trySyncPending = useCallback(async () => {
    if (!profile?.id || !navigator.onLine) return;
    const blob = await getPendingAvatarBlob(profile.id);
    if (!blob) return;
    try {
      const file = new File([blob], 'avatar.jpg', { type: blob.type });
      const result = await upload({ file });
      if (result?.avatarUrl) {
        await clearPendingAvatarBlob(profile.id);
        setPendingAvatarFlag(profile.id, false);
        setHasPending(false);
        setOfflineMsg('');
        setPreviewUrl(result.avatarUrl);
        await mutate();
      }
    } catch { /* retry next time */ }
  }, [profile?.id, upload, mutate]);

  useEffect(() => { if (hasPending) trySyncPending(); }, [hasPending, trySyncPending]);
  useEffect(() => {
    const handler = () => { if (hasPending) trySyncPending(); };
    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
  }, [hasPending, trySyncPending]);

  // ── File → crop ──────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    const reader = new FileReader();
    reader.onload = () => { setCropImgSrc(reader.result as string); setCropOpen(true); };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Crop confirmed → upload or queue ────────────────────────────────────
  async function handleCropComplete(file: File) {
    if (!profile?.id) return;
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    if (navigator.onLine) {
      try {
        const result = await upload({ file });
        if (result?.avatarUrl) {
          setPreviewUrl(result.avatarUrl);
          await clearPendingAvatarBlob(profile.id);
          setPendingAvatarFlag(profile.id, false);
          setHasPending(false);
          await mutate();
        }
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed.');
      }
    } else {
      await storePendingAvatarBlob(profile.id, file);
      setPendingAvatarFlag(profile.id, true);
      setHasPending(true);
      setOfflineMsg('Saved locally · will sync when online');
    }
  }

  // ── Name form ────────────────────────────────────────────────────────────
  const [nameSuccess, setNameSuccess] = useState('');
  const [nameError, setNameError] = useState('');
  const nameForm = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    values: { name: profile?.name ?? '' },
  });
  async function onUpdateName(data: UpdateProfileFormData) {
    setNameSuccess(''); setNameError('');
    try { await update({ name: data.name }); await mutate(); setNameSuccess('Name updated.'); }
    catch (e) { setNameError(e instanceof Error ? e.message : 'Failed.'); }
  }

  // ── Password form ────────────────────────────────────────────────────────
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const pwForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  });
  const newPw = pwForm.watch('newPassword');
  const strength = getPasswordStrength(newPw ?? '');
  async function onChangePassword(data: ChangePasswordFormData) {
    setPwSuccess(''); setPwError('');
    try {
      await changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      setPwSuccess('Password changed.'); pwForm.reset();
    } catch (e) { setPwError(e instanceof Error ? e.message : 'Failed.'); }
  }

  // ── Loading / error states ───────────────────────────────────────────────
  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[40vh] text-sm text-muted-foreground">
      Loading…
    </div>
  );
  if (!profile) return (
    <div className="flex items-center justify-center min-h-[40vh] text-sm text-destructive">
      Could not load profile.
    </div>
  );

  const displayUrl = previewUrl ?? profile.avatarUrl;
  const memberSince = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-8">
      <AvatarCropDialog open={cropOpen} onOpenChange={setCropOpen} imgSrc={cropImgSrc} onCropComplete={handleCropComplete} />
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />

      {/* ── Profile header ── */}
      <div className="flex items-center gap-4">
        <AvatarCircle
          url={displayUrl}
          name={profile.name}
          size={64}
          loading={isUploading}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        />
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground leading-tight truncate">{profile.name}</h1>
          <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
          <span className="text-xs text-muted-foreground">{roleLabel(profile.role)}</span>
        </div>
      </div>

      {/* Avatar status messages */}
      {offlineMsg && (
        <p className="text-xs text-amber-500 -mt-4">{offlineMsg}</p>
      )}
      {uploadError && (
        uploadError.toLowerCase().includes('not configured') ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-default -mt-4">
                  <CloudOff size={13} /> Cloud sync unavailable
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Profile picture sync is not configured yet. Your photo is saved locally.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <p className="text-xs text-destructive -mt-4">{uploadError}</p>
        )
      )}

      <p className="text-xs text-muted-foreground -mt-6">Member since {memberSince}</p>

      <div className="h-px bg-border" />

      {/* ── Update Name ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide text-muted-foreground">Update Name</h2>
        <form onSubmit={nameForm.handleSubmit(onUpdateName)} className="space-y-3">
          <FormField
            id="name"
            type="text"
            error={nameForm.formState.errors.name?.message}
            {...nameForm.register('name')}
          />
          {nameSuccess && <p className="text-xs text-green-500">{nameSuccess}</p>}
          {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          <Button type="submit" size="sm" disabled={nameForm.formState.isSubmitting}>
            {nameForm.formState.isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </form>
      </section>

      <div className="h-px bg-border" />

      {/* ── Change Password ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Change Password</h2>
        <form onSubmit={pwForm.handleSubmit(onChangePassword)} className="space-y-3">

          <div className="relative">
            <FormField id="currentPassword" label="Current Password"
              type={showCurrent ? 'text' : 'password'}
              error={pwForm.formState.errors.currentPassword?.message}
              {...pwForm.register('currentPassword')}
            />
            <button type="button" tabIndex={-1} onClick={() => setShowCurrent(v => !v)}
              className="absolute right-3 top-[34px] text-muted-foreground hover:text-foreground">
              {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <div className="relative">
            <FormField id="newPassword" label="New Password"
              type={showNew ? 'text' : 'password'}
              error={pwForm.formState.errors.newPassword?.message}
              {...pwForm.register('newPassword')}
            />
            <button type="button" tabIndex={-1} onClick={() => setShowNew(v => !v)}
              className="absolute right-3 top-[34px] text-muted-foreground hover:text-foreground">
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {newPw?.length > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Strength</span>
                <span className={strength.color}>{strength.label}</span>
              </div>
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div className={`h-full transition-all ${strength.bg}`} style={{ width: strength.width }} />
              </div>
            </div>
          )}

          <div className="relative">
            <FormField id="confirmNewPassword" label="Confirm Password"
              type={showConfirm ? 'text' : 'password'}
              error={pwForm.formState.errors.confirmNewPassword?.message}
              {...pwForm.register('confirmNewPassword')}
            />
            <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-[34px] text-muted-foreground hover:text-foreground">
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {pwSuccess && <p className="text-xs text-green-500">{pwSuccess}</p>}
          {pwError && <p className="text-xs text-destructive">{pwError}</p>}
          <Button type="submit" size="sm" disabled={pwForm.formState.isSubmitting}>
            {pwForm.formState.isSubmitting ? 'Changing…' : 'Change Password'}
          </Button>
        </form>
      </section>
    </div>
  );
}
