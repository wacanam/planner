'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import axios from 'axios';
import Link from 'next/link';
import { Eye, EyeOff, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { registerSchema, type RegisterFormData } from '@/schemas';

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
    return { label: 'Good', width: '75%', color: 'text-accent', bg: 'bg-accent', score: 4 };
  return { label: 'Strong', width: '100%', color: 'text-green-400', bg: 'bg-green-400', score: 5 };
}

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
  const passwordsDontMatch =
    confirmPasswordValue.length > 0 && passwordValue !== confirmPasswordValue;

  async function onSubmit(data: RegisterFormData) {
    setError('');
    setSuccess('');

    const name = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();

    try {
      const registerData = await axios
        .post<{ user?: unknown; error?: string }>('/api/auth/register', {
          email: data.email,
          password: data.password,
          name,
        })
        .then((r) => r.data)
        .catch((err) => {
          const msg =
            axios.isAxiosError(err)
              ? (err.response?.data as { error?: string })?.error ?? 'Registration failed.'
              : 'Registration failed.';
          throw new Error(msg);
        });

      console.log('[register] User created:', registerData.user);
      setSuccess('Account created! Signing you in…');

      const signInResult = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      console.log('[register] signIn result:', signInResult);

      if (signInResult?.error) {
        console.error('[register] signIn error:', signInResult.error);
        setError('Account created, but sign-in failed. Please try signing in manually.');
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      } else if (signInResult?.ok) {
        setSuccess('Welcome! Setting up your account…');
        setTimeout(() => {
          router.push('/onboarding');
          router.refresh();
        }, 1000);
      }
    } catch (err) {
      console.error('[register] catch error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12 min-h-screen bg-linear-to-br from-accent/5 via-background to-primary/5">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8 sm:p-10">
          {/* Logo & heading */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/30 mb-4">
              <MapPin size={24} className="text-accent-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Join Ministry Planner today — it&apos;s free
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle size={16} className="absolute left-4 top-3.5" />
              <AlertDescription className="pl-6">{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert variant="success" className="mb-6">
              <CheckCircle2 size={16} className="absolute left-4 top-3.5" />
              <AlertDescription className="pl-6">{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  {...register('firstName')}
                  placeholder="Jane"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.firstName}
                  className={errors.firstName ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive mt-1">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  {...register('lastName')}
                  placeholder="Doe"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.lastName}
                  className={errors.lastName ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                placeholder="you@example.com"
                disabled={isSubmitting}
                aria-invalid={!!errors.email}
                className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('password')}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.password}
                  className={`pr-10${errors.password ? ' border-destructive focus-visible:ring-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
              )}

              {/* Password strength indicator */}
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Password strength</span>
                  {strength.label && (
                    <span className={`text-xs font-medium ${strength.color}`}>
                      {strength.label}
                    </span>
                  )}
                </div>
                <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strength.bg}`}
                    style={{ width: strength.width }}
                  />
                </div>
              </div>
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.confirmPassword}
                  className={`pr-10${errors.confirmPassword ? ' border-destructive focus-visible:ring-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isSubmitting}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>
              )}
              {!errors.confirmPassword && passwordsDontMatch && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
              {passwordsMatch && <p className="text-xs text-green-500 mt-1">✓ Passwords match</p>}
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-2 pt-2">
              <input
                id="terms"
                type="checkbox"
                {...register('agreeTerms')}
                disabled={isSubmitting}
                className="w-4 h-4 rounded border-border bg-background cursor-pointer mt-0.5"
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                I agree to the{' '}
                <Link href="/terms" className="text-accent hover:underline">
                  terms
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-accent hover:underline">
                  privacy policy
                </Link>
              </label>
            </div>
            {errors.agreeTerms && (
              <p className="text-xs text-destructive mt-1">{errors.agreeTerms.message}</p>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-6"
              size="lg"
            >
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          {/* Sign in link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-accent font-medium hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
