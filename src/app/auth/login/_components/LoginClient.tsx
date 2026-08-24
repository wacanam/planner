'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendUserPasswordResetEmail, signInWithEmail, signInWithGoogle } from '@/lib/firebase/auth';
import { type LoginFormData, loginSchema } from '@/schemas';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Forgot password state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: LoginFormData) {
    setError('');
    try {
      const user = await signInWithEmail(data.email, data.password);
      if (!user.emailVerified) {
        router.push('/auth/verify-email');
        router.refresh();
        return;
      }
      router.push('/onboarding');
      router.refresh();
    } catch (err) {
      console.error('[login error]', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.push('/onboarding');
      router.refresh();
    } catch (err) {
      console.error('[google login error]', err);
      setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  }

  async function handleSendResetEmail(e: React.FormEvent) {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);
    try {
      await sendUserPasswordResetEmail(resetEmail);
      setResetSuccess(true);
      toast.success('Password reset link sent to your email!');
    } catch (err: any) {
      setResetError(err?.message || 'Failed to send password reset email.');
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-between min-h-screen bg-background text-foreground p-4 sm:p-6 relative transition-colors duration-200">
      {/* Top Floating Utility Bar */}
      <div className="flex items-center justify-between w-full max-w-5xl mx-auto py-2">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={15} />
          <span>Back to Home</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Centered Auth Card */}
      <div className="flex-1 flex items-center justify-center my-6">
        <div className="w-full max-w-md">
          {/* Solid Card */}
          <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
            {/* Studio Brand Header */}
            <div className="bg-primary px-6 py-6 text-primary-foreground text-center">
              <div className="inline-flex items-center justify-center mb-3">
                <Image
                  src="/icons/icon-192.png"
                  alt="Kanataran Logo"
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-2xl object-contain shadow-md"
                  priority
                />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Kanataran</h1>
              <p className="text-xs text-primary-foreground/80 mt-1">
                Sign in to your territory management workspace
              </p>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              {/* Error alert */}
              {error && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertCircle size={15} />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              {/* Google Sign In */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 rounded-xl text-xs font-semibold gap-2"
                onClick={() => void handleGoogleSignIn()}
                disabled={isSubmitting || isGoogleLoading}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold">
                  G
                </span>
                {isGoogleLoading ? 'Connecting…' : 'Continue with Google'}
              </Button>

              <div className="relative flex items-center">
                <div className="h-px flex-1 bg-border" />
                <span className="px-3 text-[11px] text-muted-foreground uppercase font-medium">
                  or continue with email
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="h-10 rounded-xl text-xs"
                    autoComplete="email"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-[11px] text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-medium">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(getValues('email') || '');
                        setResetError('');
                        setResetSuccess(false);
                        setResetDialogOpen(true);
                      }}
                      className="text-xs font-medium text-primary hover:underline transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="h-10 rounded-xl text-xs pr-10"
                      autoComplete="current-password"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
                  disabled={isSubmitting || isGoogleLoading}
                >
                  {isSubmitting ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>

              <div className="text-center pt-2">
                <p className="text-xs text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/auth/register"
                    className="font-semibold text-primary hover:underline"
                  >
                    Create one now
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="py-2 text-center text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} Kanataran
      </div>

      {/* Forgot Password Dialog */}
      <ResponsiveDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title="Reset Your Password"
        description="Enter your account email address and we'll send you a password reset link."
      >
        {resetSuccess ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
              <CheckCircle2
                size={20}
                className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
              />
              <div className="text-xs space-y-1">
                <p className="font-bold text-foreground">Password Reset Link Sent!</p>
                <p className="text-muted-foreground">
                  We sent an email to{' '}
                  <span className="font-semibold text-foreground">{resetEmail}</span> with
                  instructions to reset your password.
                </p>
                <p className="text-[11px] text-muted-foreground italic mt-1">
                  Be sure to check your spam/junk folder if you don&apos;t see it in a few minutes.
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                className="rounded-xl text-xs font-semibold"
                onClick={() => setResetDialogOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendResetEmail} className="space-y-4 py-2">
            {resetError && (
              <Alert variant="destructive" className="rounded-xl">
                <AlertCircle size={15} />
                <AlertDescription className="text-xs">{resetError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="resetEmail" className="text-xs font-medium">
                Email Address
              </Label>
              <Input
                id="resetEmail"
                type="email"
                placeholder="name@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="h-10 rounded-xl text-xs"
                required
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => setResetDialogOpen(false)}
                disabled={resetLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="rounded-xl text-xs font-semibold"
                disabled={resetLoading || !resetEmail.trim()}
              >
                {resetLoading ? 'Sending link…' : 'Send Reset Link'}
              </Button>
            </div>
          </form>
        )}
      </ResponsiveDialog>
    </div>
  );
}
