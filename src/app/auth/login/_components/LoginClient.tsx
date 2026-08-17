'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, Eye, EyeOff, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ThemeToggle } from '@/components/theme-toggle';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signInWithEmail, signInWithGoogle } from '@/lib/firebase/auth';
import { type LoginFormData, loginSchema } from '@/schemas';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: LoginFormData) {
    setError('');
    try {
      await signInWithEmail(data.email, data.password);
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
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-foreground/20 mb-3 shadow-xs">
                <MapPin size={22} className="text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Ministry Planner</h1>
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
                  className="w-full h-10 rounded-xl text-xs font-semibold shadow-sm"
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
        © {new Date().getFullYear()} Ministry Planner
      </div>
    </div>
  );
}
