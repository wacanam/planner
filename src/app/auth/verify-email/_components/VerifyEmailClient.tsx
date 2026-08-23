'use client';

import { AlertCircle, ArrowLeft, CheckCircle2, LogOut, Mail, RefreshCw, Send } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme-toggle';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { applyEmailVerificationCode, signOut, useAuthSession } from '@/lib/firebase/auth';

const COOLDOWN_SECONDS = 60;
const COOLDOWN_KEY = 'planner_verify_resend_timestamp';

export default function VerifyEmailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawParamCode = searchParams.get('oobCode') || searchParams.get('code') || '';

  const { data: session, status, reloadUser, sendVerificationEmail } = useAuthSession();

  const [isApplyingCode, setIsApplyingCode] = useState(Boolean(rawParamCode));
  const [codeAppliedSuccess, setCodeAppliedSuccess] = useState(false);
  const [codeError, setCodeError] = useState('');

  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [warningMessage, setWarningMessage] = useState('');

  // Handle cooldown timer initialized from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(COOLDOWN_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      const diff = Math.floor((Date.now() - parsed) / 1000);
      if (diff < COOLDOWN_SECONDS) {
        setCooldown(COOLDOWN_SECONDS - diff);
      } else {
        localStorage.removeItem(COOLDOWN_KEY);
      }
    }
  }, []);

  // Cooldown countdown interval
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (typeof window !== 'undefined') localStorage.removeItem(COOLDOWN_KEY);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  // If user is already verified and logged in (and not processing an oobCode), redirect to onboarding
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.emailVerified && !rawParamCode) {
      router.replace('/onboarding');
    }
  }, [status, session?.user?.emailVerified, rawParamCode, router]);

  // Handle direct verification link (oobCode param)
  useEffect(() => {
    let activeCode = rawParamCode;
    if (!activeCode && typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      activeCode = sp.get('oobCode') || sp.get('code') || '';
      if (!activeCode && window.location.hash) {
        const hp = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        activeCode = hp.get('oobCode') || hp.get('code') || '';
      }
    }

    if (!activeCode) return;

    let isMounted = true;
    setIsApplyingCode(true);

    applyEmailVerificationCode(activeCode)
      .then(async () => {
        if (isMounted) {
          setCodeAppliedSuccess(true);
          setIsApplyingCode(false);
          toast.success('Email verified successfully!');
          await reloadUser().catch(() => undefined);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          console.error('[apply verification code error]', err);
          setCodeError(
            err?.message ||
              'This verification link has expired or has already been used. Please sign in and request a new link.'
          );
          setIsApplyingCode(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [rawParamCode, reloadUser]);

  const handleCheckStatus = async () => {
    setWarningMessage('');
    setIsCheckingStatus(true);
    try {
      const refreshedSession = await reloadUser();
      if (refreshedSession?.user?.emailVerified) {
        toast.success('Email verified! Redirecting to workspace…');
        router.push('/onboarding');
        router.refresh();
      } else {
        setWarningMessage(
          'Your email is not verified yet. Please check your inbox (and spam folder) and click the confirmation link.'
        );
      }
    } catch (err: any) {
      setWarningMessage(err?.message || 'Unable to check verification status. Please try again.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleResendEmail = async () => {
    if (cooldown > 0 || isResending) return;
    setWarningMessage('');
    setIsResending(true);
    setResendSuccess(false);
    try {
      await sendVerificationEmail();
      setResendSuccess(true);
      setCooldown(COOLDOWN_SECONDS);
      if (typeof window !== 'undefined') {
        localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
      }
      toast.success('Verification link sent to your email!');
    } catch (err: any) {
      setWarningMessage(
        err?.message || 'Failed to send verification email. Please try again in a moment.'
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/auth/login');
      router.refresh();
    } catch {
      router.push('/auth/login');
    }
  };

  // State 1: Applying direct action code from email link
  if (isApplyingCode) {
    return (
      <div className="flex-1 flex flex-col justify-between min-h-screen bg-background text-foreground p-4 sm:p-6">
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

        <div className="flex-1 flex items-center justify-center my-6">
          <div className="w-full max-w-md">
            <Card className="rounded-2xl shadow-xl border border-border p-8 text-center space-y-4">
              <RefreshCw className="h-10 w-10 animate-spin text-primary mx-auto" />
              <h2 className="text-lg font-bold">Verifying your email address…</h2>
              <p className="text-xs text-muted-foreground">
                Please wait while we validate your confirmation link.
              </p>
            </Card>
          </div>
        </div>
        <div />
      </div>
    );
  }

  // State 2: Direct action code successfully applied
  if (codeAppliedSuccess) {
    return (
      <div className="flex-1 flex flex-col justify-between min-h-screen bg-background text-foreground p-4 sm:p-6">
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

        <div className="flex-1 flex items-center justify-center my-6">
          <div className="w-full max-w-md">
            <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
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
                <h1 className="text-xl font-bold tracking-tight">Email Verified!</h1>
                <p className="text-xs text-primary-foreground/80 mt-1">
                  Your email address has been successfully verified.
                </p>
              </div>

              <div className="p-6 sm:p-8 space-y-5 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400">
                  <CheckCircle2 size={28} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Thank you for verifying your email. You now have full access to your congregation
                  territory management workspace.
                </p>

                <Button
                  className="w-full h-10 rounded-xl text-xs font-semibold"
                  onClick={() => {
                    router.push(status === 'authenticated' ? '/onboarding' : '/auth/login');
                    router.refresh();
                  }}
                >
                  {status === 'authenticated' ? 'Continue to Workspace' : 'Proceed to Sign In'}
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div />
      </div>
    );
  }

  // State 3: Code error or link expired
  if (codeError && !session?.user) {
    return (
      <div className="flex-1 flex flex-col justify-between min-h-screen bg-background text-foreground p-4 sm:p-6">
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

        <div className="flex-1 flex items-center justify-center my-6">
          <div className="w-full max-w-md">
            <Card className="rounded-2xl shadow-xl border border-border p-6 sm:p-8 space-y-5">
              <Alert variant="destructive" className="rounded-xl">
                <AlertCircle size={15} />
                <AlertDescription className="text-xs">{codeError}</AlertDescription>
              </Alert>

              <div className="space-y-3 pt-2">
                <Button asChild className="w-full h-10 rounded-xl text-xs font-semibold">
                  <Link href="/auth/login">Back to Sign In</Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>
        <div />
      </div>
    );
  }

  const userEmail = session?.user?.email || 'your registered email';

  // State 4: Standard In-App Verify Email Screen
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
              <h1 className="text-xl font-bold tracking-tight">Verify Your Email</h1>
              <p className="text-xs text-primary-foreground/80 mt-1">
                Activate your account to access your territories
              </p>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              {/* Mail Icon Highlight */}
              <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-xs">
                <Mail size={28} />
              </div>

              {/* Status & Instructions */}
              <div className="text-center space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  We have sent a confirmation email with a verification link to:
                </p>
                <p className="text-sm font-semibold text-foreground break-all bg-muted/60 py-1.5 px-3 rounded-lg border border-border">
                  {userEmail}
                </p>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Please click the link in your email to verify your identity.
                </p>
              </div>

              {/* Warning / Error Message */}
              {warningMessage && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertCircle size={15} />
                  <AlertDescription className="text-xs">{warningMessage}</AlertDescription>
                </Alert>
              )}

              {/* Resend Success Notice */}
              {resendSuccess && !warningMessage && (
                <Alert className="rounded-xl border-green-200 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  <CheckCircle2 size={15} />
                  <AlertDescription className="text-xs">
                    A fresh verification link has been sent to your email.
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="space-y-2.5 pt-2">
                <Button
                  type="button"
                  className="w-full h-10 rounded-xl text-xs font-semibold gap-2 shadow-xs"
                  onClick={() => void handleCheckStatus()}
                  disabled={isCheckingStatus || status === 'loading'}
                >
                  {isCheckingStatus ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Checking Status…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      I&apos;ve Verified My Email
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 rounded-xl text-xs font-semibold gap-2"
                  onClick={() => void handleResendEmail()}
                  disabled={isResending || cooldown > 0}
                >
                  {isResending ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Sending Link…
                    </>
                  ) : cooldown > 0 ? (
                    <>
                      <Send size={14} />
                      Resend Email ({cooldown}s)
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Resend Verification Email
                    </>
                  )}
                </Button>
              </div>

              {/* Help tip & Switch account */}
              <div className="border-t border-border pt-4 text-center space-y-3">
                <p className="text-[11px] text-muted-foreground">
                  Didn&apos;t receive the email? Check your <strong>Spam</strong> or{' '}
                  <strong>Junk</strong> folder.
                </p>

                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>Sign out & use a different account</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div />
    </div>
  );
}
