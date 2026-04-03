'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useProfile, useUpdateProfile, useChangePassword } from '@/hooks/use-profile';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
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

  const initial = profile.name.charAt(0).toUpperCase();
  const memberSince = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Page header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
            {initial}
          </div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        </div>

        {/* ── Section 1: Profile Info ── */}
        <section className="border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Profile Info</h2>
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl shrink-0">
              {initial}
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground leading-none">{profile.name}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <span className="inline-block text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
                {roleLabel(profile.role)}
              </span>
              <p className="text-xs text-muted-foreground pt-1">Member since {memberSince}</p>
            </div>
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
