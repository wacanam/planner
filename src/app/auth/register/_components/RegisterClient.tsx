'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ThemeToggle } from '@/components/theme-toggle';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerWithEmail, signInWithGoogle } from '@/lib/firebase/auth';
import { type RegisterFormData, registerSchema } from '@/schemas';

type StrengthInfo = {
  label: string;
  width: string;
  color: string;
  bg: string;
  score: number;
};

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
    return { label: 'Good', width: '75%', color: 'text-blue-500', bg: 'bg-blue-500', score: 4 };
  return { label: 'Strong', width: '100%', color: 'text-green-500', bg: 'bg-green-500', score: 5 };
}

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password') ?? '';
  const confirmPasswordValue = watch('confirmPassword') ?? '';
  const strength = getPasswordStrength(passwordValue);
  const passwordsMatch = confirmPasswordValue.length > 0 && passwordValue === confirmPasswordValue;

  async function onSubmit(data: RegisterFormData) {
    setError('');
    setSuccess('');
    const name = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();

    try {
      await registerWithEmail({ email: data.email, password: data.password, name });
      setSuccess('Welcome! Setting up your workspace…');
      setTimeout(() => {
        router.push('/onboarding');
        router.refresh();
      }, 600);
    } catch (err) {
      console.error('[register error]:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    setSuccess('');
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      setSuccess('Welcome! Setting up your workspace…');
      setTimeout(() => {
        router.push('/onboarding');
        router.refresh();
      }, 600);
    } catch (err) {
      console.error('[google register error]:', err);
      setError(
        err instanceof Error ? err.message : 'Google registration failed. Please try again.'
      );
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

      {/* Centered Register Card */}
      <div className="flex-1 flex items-center justify-center my-6">
        <div className="w-full max-w-md">
          {/* Solid Card */}
          <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
            {/* Studio Brand Header */}
            <div className="bg-primary px-6 py-6 text-primary-foreground text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-foreground/20 mb-3 shadow-xs">
                <MapPin size={22} className="text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Create Account</h1>
              <p className="text-xs text-primary-foreground/80 mt-1">
                Join your congregation&apos;s territory workspace
              </p>
            </div>

            <div className="p-6 sm:p-8 space-y-4">
              {error && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertCircle size={15} />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="rounded-xl border-green-200 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  <CheckCircle2 size={15} />
                  <AlertDescription className="text-xs">{success}</AlertDescription>
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
                {isGoogleLoading ? 'Connecting…' : 'Sign up with Google'}
              </Button>

              <div className="relative flex items-center">
                <div className="h-px flex-1 bg-border" />
                <span className="px-3 text-[11px] text-muted-foreground uppercase font-medium">
                  or continue with email
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="firstName" className="text-xs font-medium">
                      First name
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      className="h-9 rounded-xl text-xs"
                      {...register('firstName')}
                    />
                    {errors.firstName && (
                      <p className="text-[10px] text-destructive">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="lastName" className="text-xs font-medium">
                      Last name
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      className="h-9 rounded-xl text-xs"
                      {...register('lastName')}
                    />
                    {errors.lastName && (
                      <p className="text-[10px] text-destructive">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs font-medium">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="h-9 rounded-xl text-xs"
                    autoComplete="email"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-[10px] text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="password" className="text-xs font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="h-9 rounded-xl text-xs pr-9"
                      autoComplete="new-password"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {passwordValue.length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${strength.bg} transition-all duration-300`}
                          style={{ width: strength.width }}
                        />
                      </div>
                    </div>
                  )}
                  {errors.password && (
                    <p className="text-[10px] text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium">
                    Confirm password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="h-9 rounded-xl text-xs pr-9"
                      autoComplete="new-password"
                      {...register('confirmPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {passwordsMatch && (
                    <p className="text-[10px] text-green-600 dark:text-green-400">
                      ✓ Passwords match
                    </p>
                  )}
                  {errors.confirmPassword && (
                    <p className="text-[10px] text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 rounded-xl text-xs font-semibold shadow-sm mt-2 cursor-pointer"
                  disabled={isSubmitting || isGoogleLoading}
                >
                  {isSubmitting ? 'Creating account…' : 'Create account'}
                </Button>
              </form>

              <div className="text-center pt-1">
                <p className="text-xs text-muted-foreground">
                  Already have an account?{' '}
                  <Link href="/auth/login" className="font-semibold text-primary hover:underline">
                    Sign in
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
