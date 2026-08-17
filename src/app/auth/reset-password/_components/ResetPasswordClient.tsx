'use client';

import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Lock, MapPin, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme-toggle';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { confirmUserPasswordReset, sendUserPasswordResetEmail, verifyUserPasswordResetCode } from '@/lib/firebase/auth';

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode') || searchParams.get('code') || '';

  const [verifying, setVerifying] = useState(true);
  const [accountEmail, setAccountEmail] = useState('');
  const [verifyError, setVerifyError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Re-request state
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setVerifying(false);
      setVerifyError('No reset code was provided in the link. Please request a new password reset link.');
      return;
    }

    let isMounted = true;
    verifyUserPasswordResetCode(oobCode)
      .then((email) => {
        if (isMounted) {
          setAccountEmail(email);
          setResendEmail(email);
          setVerifying(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          console.error('[verify reset code error]', err);
          setVerifyError(
            err?.message || 'This password reset link has expired or has already been used. Please request a new one.'
          );
          setVerifying(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (newPassword.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmUserPasswordReset(oobCode, newPassword);
      setIsSuccess(true);
      toast.success('Your password has been reset successfully!');
    } catch (err: any) {
      console.error('[confirm reset error]', err);
      setFormError(err?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResendLoading(true);
    try {
      await sendUserPasswordResetEmail(resendEmail);
      setResendSuccess(true);
      toast.success('New password reset link sent to your email!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send reset link.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between min-h-screen bg-background text-foreground p-4 sm:p-6 relative transition-colors duration-200">
      {/* Utility Bar */}
      <div className="flex items-center justify-between w-full max-w-5xl mx-auto py-2">
        <Link
          href="/auth/login"
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={15} />
          <span>Back to Sign In</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Centered Box */}
      <div className="flex-1 flex items-center justify-center my-6">
        <div className="w-full max-w-md">
          <Card className="rounded-2xl shadow-xl border border-border overflow-hidden bg-card">
            {/* Header */}
            <div className="bg-primary px-6 py-6 text-primary-foreground text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-foreground/20 mb-3 shadow-xs">
                <Lock size={22} className="text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Reset Your Password</h1>
              <p className="text-xs text-primary-foreground/80 mt-1">
                Create a new secure password for your account
              </p>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-5">
              {verifying ? (
                <div className="py-8 text-center space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  <p className="text-xs text-muted-foreground">Verifying password reset link…</p>
                </div>
              ) : isSuccess ? (
                <div className="space-y-4 py-2 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">Password Reset Complete!</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your password has been changed. You can now sign in with your new credentials.
                    </p>
                  </div>
                  <Button
                    asChild
                    className="w-full h-10 rounded-xl text-xs font-semibold shadow-xs mt-2"
                  >
                    <Link href="/auth/login">Proceed to Sign In</Link>
                  </Button>
                </div>
              ) : verifyError ? (
                <div className="space-y-4 py-2">
                  <Alert variant="destructive" className="rounded-xl">
                    <AlertCircle size={15} />
                    <AlertDescription className="text-xs">{verifyError}</AlertDescription>
                  </Alert>

                  <div className="p-3.5 rounded-xl bg-muted/60 text-xs text-muted-foreground space-y-2">
                    <p className="font-semibold text-foreground">Why did this happen?</p>
                    <ul className="list-disc pl-4 space-y-1 text-[11px]">
                      <li>
                        <strong>Multiple requests:</strong> If you requested a reset link more than once, only the <em>latest</em> email contains a valid link. All previous links are automatically expired.
                      </li>
                      <li>
                        <strong>Link expiration:</strong> Reset links expire after a short period for security.
                      </li>
                    </ul>
                  </div>

                  {resendSuccess ? (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                      <p className="font-bold flex items-center gap-1 mb-0.5">
                        <CheckCircle2 size={14} /> New Link Sent!
                      </p>
                      <p className="text-[11px]">
                        Please check your inbox (and spam folder) for the newest email and click the link inside.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleResend} className="space-y-3 pt-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="resendEmail" className="text-xs font-medium">
                          Request a Fresh Reset Link
                        </Label>
                        <Input
                          id="resendEmail"
                          type="email"
                          placeholder="name@example.com"
                          value={resendEmail}
                          onChange={(e) => setResendEmail(e.target.value)}
                          className="h-10 rounded-xl text-xs"
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full h-10 rounded-xl text-xs font-semibold gap-1.5"
                        disabled={resendLoading || !resendEmail.trim()}
                      >
                        <RefreshCw size={13} className={resendLoading ? 'animate-spin' : ''} />
                        <span>{resendLoading ? 'Sending new link…' : 'Send New Reset Link'}</span>
                      </Button>
                    </form>
                  )}

                  <div className="pt-2 text-center">
                    <Link
                      href="/auth/login"
                      className="text-xs text-muted-foreground hover:text-foreground font-medium"
                    >
                      Return to Sign In
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {accountEmail && (
                    <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/15 text-xs text-foreground flex items-center gap-2">
                      <KeyRound size={14} className="text-primary shrink-0" />
                      <span>
                        Resetting password for: <strong className="text-primary">{accountEmail}</strong>
                      </span>
                    </div>
                  )}

                  {formError && (
                    <Alert variant="destructive" className="rounded-xl">
                      <AlertCircle size={15} />
                      <AlertDescription className="text-xs">{formError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword" className="text-xs font-medium">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-10 rounded-xl text-xs pr-10"
                        required
                        minLength={6}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Minimum 6 characters</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-xs font-medium">
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-10 rounded-xl text-xs"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-10 rounded-xl text-xs font-semibold shadow-xs"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Resetting password…' : 'Save New Password'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="py-2 text-center text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} Ministry Planner
      </div>
    </div>
  );
}
