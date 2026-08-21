'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Globe,
  LogOut,
  MapPin,
  RefreshCw,
  Search,
  Users,
  XCircle,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme-toggle';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/hooks/use-current-user';
import { signOut, useAuthSession as useSession } from '@/lib/firebase/auth';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { createClientId, FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
import { notifyCongregationOverseers } from '@/lib/notifications';
import { isSystemAdmin } from '@/lib/permissions';
import { CongregationRole, MemberStatus, NotificationType } from '@/lib/roles';
import {
  type CreateCongregationFormData,
  createCongregationSchema,
  type JoinRequestFormData,
  joinRequestSchema,
} from '@/schemas';
import type { Congregation } from '@/types/api';

type Mode = 'choose' | 'create' | 'join';

type SearchResult = {
  id: string;
  name: string;
  slug?: string;
  city?: string | null;
  country?: string | null;
  status?: string;
};

export default function OnboardingPage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const { user, loading: userLoading, membershipStatus, pendingMembership } = useCurrentUser();

  const [mode, setMode] = useState<Mode>('choose');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isCancellingRequest, setIsCancellingRequest] = useState(false);

  // Pending / Rejected Congregation details cache
  const [pendingCongregation, setPendingCongregation] = useState<Congregation | null>(null);

  // Create form
  const [createError, setCreateError] = useState('');
  const createForm = useForm<CreateCongregationFormData>({
    resolver: zodResolver(createCongregationSchema),
    defaultValues: { name: '', city: '', country: '' },
  });

  // Join form
  const joinForm = useForm<JoinRequestFormData>({
    resolver: zodResolver(joinRequestSchema),
    defaultValues: { message: '' },
  });

  // Search state & congregation list
  const [allCongregations, setAllCongregations] = useState<SearchResult[]>([]);
  const [isLoadingCongregations, setIsLoadingCongregations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCong, setSelectedCong] = useState<SearchResult | null>(null);
  const [joinError, setJoinError] = useState('');

  const userId = session?.user?.id;
  const userEmail = session?.user?.email ?? null;
  const isAdmin = isSystemAdmin(session?.user?.role);

  // ── 1. Redirect if admin or active approved member ──────────────────────────
  useEffect(() => {
    if (userLoading) return;
    if (isAdmin) {
      router.replace('/admin/dashboard');
      return;
    }
    if (membershipStatus === 'active' && user?.congregationId) {
      toast.success('Welcome to your congregation workspace!');
      router.replace(`/congregation/${user.congregationId}/dashboard`);
    }
  }, [isAdmin, user?.congregationId, membershipStatus, userLoading, router]);

  // ── 2. Fetch pending congregation info if user is waiting for approval ───────
  useEffect(() => {
    const targetCongId = pendingMembership?.congregationId;
    if (!targetCongId) {
      setPendingCongregation(null);
      return;
    }

    const firestore = getPlannerFirestore();
    const congRef = doc(firestore, FIRESTORE_COLLECTIONS.congregations, targetCongId);
    return onSnapshot(congRef, (snap) => {
      if (snap.exists()) {
        setPendingCongregation({ id: snap.id, ...snap.data() } as Congregation);
      }
    });
  }, [pendingMembership?.congregationId]);

  // ── 3. Fetch congregations list for discovery & instant search ───────────────
  useEffect(() => {
    let isMounted = true;
    async function loadCongregations() {
      setIsLoadingCongregations(true);
      try {
        const firestore = getPlannerFirestore();
        const snap = await getDocs(collection(firestore, FIRESTORE_COLLECTIONS.congregations));
        if (!isMounted) return;
        const list: SearchResult[] = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as SearchResult)
          .filter((c) => c.status !== 'archived');
        setAllCongregations(list);
      } catch (err) {
        console.error('Failed to load congregations:', err);
      } finally {
        if (isMounted) setIsLoadingCongregations(false);
      }
    }
    loadCongregations();
    return () => {
      isMounted = false;
    };
  }, []);

  // ── 4. Filtered search results ──────────────────────────────────────────────
  const searchResults = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return allCongregations.slice(0, 15);

    return allCongregations
      .filter((item) => {
        const name = (item.name || '').toLowerCase();
        const city = (item.city || '').toLowerCase();
        const country = (item.country || '').toLowerCase();
        const slug = (item.slug || '').toLowerCase();
        return (
          name.includes(term) ||
          city.includes(term) ||
          country.includes(term) ||
          slug.includes(term)
        );
      })
      .slice(0, 20);
  }, [allCongregations, searchQuery]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push('/auth/login');
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
      setIsSigningOut(false);
    }
  };

  // ── 5. Cancel pending or rejected request ────────────────────────────────────
  const handleCancelRequest = async () => {
    if (!userId) return;
    setIsCancellingRequest(true);
    try {
      const firestore = getPlannerFirestore();
      await deleteDoc(doc(firestore, FIRESTORE_COLLECTIONS.congregationMembers, userId));
      await updateDoc(doc(firestore, FIRESTORE_COLLECTIONS.users, userId), {
        congregationId: null,
        updatedAt: nowIso(),
      }).catch(() => undefined);
      setPendingCongregation(null);
      setMode('choose');
      setSelectedCong(null);
      toast.success('Request cancelled. You can select another congregation.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to cancel request.');
    } finally {
      setIsCancellingRequest(false);
    }
  };

  // ── 6. Create congregation ───────────────────────────────────────────────────
  async function handleCreate(data: CreateCongregationFormData) {
    setCreateError('');
    try {
      if (!userId) throw new Error('Sign in again to finish setup.');
      const now = nowIso();
      const congregation = {
        id: createClientId(),
        name: data.name.trim(),
        slug: data.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
        city: data.city?.trim() || null,
        country: data.country?.trim() || null,
        status: 'active',
        createdById: userId,
        createdAt: now,
        updatedAt: now,
      };
      const firestore = getPlannerFirestore();
      await setDoc(
        doc(firestore, FIRESTORE_COLLECTIONS.congregations, congregation.id),
        congregation
      );
      await setDoc(doc(firestore, FIRESTORE_COLLECTIONS.congregationMembers, userId), {
        id: userId,
        userId,
        congregationId: congregation.id,
        congregationRole: CongregationRole.SERVICE_OVERSEER,
        status: MemberStatus.ACTIVE,
        joinMessage: null,
        joinedAt: now,
        user: {
          id: userId,
          name: user?.name ?? null,
          email: userEmail,
          role: session?.user?.role ?? null,
        },
      });
      await updateDoc(doc(firestore, FIRESTORE_COLLECTIONS.users, userId), {
        congregationId: congregation.id,
        updatedAt: now,
      });
      await updateSession({ congregationId: congregation.id });
      toast.success(`Congregation "${congregation.name}" created!`);
      router.replace(`/congregation/${congregation.id}/dashboard`);
      router.refresh();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    }
  }

  // ── 7. Submit join request ───────────────────────────────────────────────────
  async function handleJoin(data: JoinRequestFormData) {
    if (!selectedCong) return;
    setJoinError('');
    try {
      if (!userId) throw new Error('Sign in again to request access.');
      const firestore = getPlannerFirestore();
      await setDoc(doc(firestore, FIRESTORE_COLLECTIONS.congregationMembers, userId), {
        id: userId,
        userId,
        congregationId: selectedCong.id,
        congregationRole: null,
        status: MemberStatus.PENDING,
        joinMessage: data.message?.trim() || null,
        joinedAt: nowIso(),
        reviewNote: null,
        reviewedAt: null,
        user: {
          id: userId,
          name: user?.name ?? null,
          email: userEmail,
          role: session?.user?.role ?? null,
        },
      });

      // Notify congregation overseers
      try {
        await notifyCongregationOverseers(firestore, selectedCong.id, {
          type: NotificationType.JOIN_REQUEST,
          title: 'New Member Access Request',
          body: `${user?.name || userEmail || 'A publisher'} requested to join ${selectedCong.name}.`,
          data: {
            congregationId: selectedCong.id,
            userId,
            applicantName: user?.name || userEmail,
          },
          excludeUserId: userId,
        });
      } catch (notifErr) {
        console.error('Failed to notify overseers of join request:', notifErr);
      }

      toast.success('Join request submitted to the Service Overseer!');
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Top Floating Utility Bar */}
      <header className="w-full border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/icons/icon-192.png"
              alt="Kanataran Logo"
              width={28}
              height={28}
              className="w-7 h-7 rounded-xl object-contain shadow-xs transition-transform group-hover:scale-105"
              priority
            />
            <span className="font-bold text-foreground text-sm tracking-tight">Kanataran</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {userEmail && (
              <span className="hidden md:inline-block text-xs text-muted-foreground truncate max-w-[200px]">
                {userEmail}
              </span>
            )}
            <ThemeToggle />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="text-xs font-semibold rounded-xl gap-1.5 border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors cursor-pointer"
            >
              <LogOut size={13} className={isSigningOut ? 'animate-spin' : ''} />
              <span>{isSigningOut ? 'Signing out…' : 'Sign out'}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 py-10">
        {/* ── STATE: PENDING APPROVAL ────────────────────────────────────────────── */}
        {membershipStatus === 'pending' && (
          <div className="w-full max-w-md">
            <div className="bg-card rounded-3xl shadow-sm border border-border p-6 sm:p-8 text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-amber-500/15 mx-auto">
                <Clock size={32} className="text-amber-500 animate-pulse" />
              </div>

              <div className="space-y-2">
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs px-3 py-1 font-semibold"
                >
                  Pending Overseer Approval
                </Badge>
                <h1 className="text-2xl font-bold text-foreground">Access Request Under Review</h1>
                <p className="text-sm text-muted-foreground">
                  Your request has been submitted to the Service Overseer of{' '}
                  <span className="font-semibold text-foreground">
                    {pendingCongregation?.name || 'the congregation'}
                  </span>
                  .
                </p>
              </div>

              {/* Congregation Summary Card */}
              <Card className="bg-muted/30 border-border text-left">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-primary shrink-0" />
                    <span className="font-bold text-sm text-foreground">
                      {pendingCongregation?.name || 'Congregation'}
                    </span>
                  </div>
                  {(pendingCongregation?.city || pendingCongregation?.country) && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin size={13} />
                      <span>
                        {[pendingCongregation.city, pendingCongregation.country]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  )}
                  {pendingMembership?.joinMessage && (
                    <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground italic">
                      &ldquo;{pendingMembership.joinMessage}&rdquo;
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 text-xs text-muted-foreground flex items-start gap-2.5 text-left">
                <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
                <span>
                  As soon as your Service Overseer approves your request, this page will
                  automatically refresh and grant you access.
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelRequest}
                  disabled={isCancellingRequest}
                  className="w-full rounded-xl text-xs font-semibold text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {isCancellingRequest
                    ? 'Cancelling…'
                    : 'Cancel request & pick another congregation'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full rounded-xl text-xs text-muted-foreground"
                >
                  <LogOut size={13} className="mr-1.5" />
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── STATE: REJECTED REQUEST ────────────────────────────────────────────── */}
        {membershipStatus === 'rejected' && (
          <div className="w-full max-w-md">
            <div className="bg-card rounded-3xl shadow-sm border border-border p-6 sm:p-8 text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-destructive/15 mx-auto">
                <XCircle size={32} className="text-destructive" />
              </div>

              <div className="space-y-2">
                <Badge
                  variant="outline"
                  className="bg-destructive/10 text-destructive border-destructive/20 text-xs px-3 py-1 font-semibold"
                >
                  Request Not Approved
                </Badge>
                <h1 className="text-2xl font-bold text-foreground">Access Request Declined</h1>
                <p className="text-sm text-muted-foreground">
                  Your request to join{' '}
                  <span className="font-semibold text-foreground">
                    {pendingCongregation?.name || 'the congregation'}
                  </span>{' '}
                  was not approved.
                </p>
                {pendingMembership?.reviewNote && (
                  <p className="text-xs bg-muted/50 p-3 rounded-xl text-muted-foreground italic mt-2">
                    Note: &ldquo;{pendingMembership.reviewNote}&rdquo;
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  type="button"
                  onClick={handleCancelRequest}
                  disabled={isCancellingRequest}
                  className="w-full rounded-xl text-xs font-semibold"
                >
                  Search other congregations
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full rounded-xl text-xs text-muted-foreground"
                >
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODE: choose ───────────────────────────────────────────────────────── */}
        {membershipStatus === 'none' && mode === 'choose' && (
          <div className="w-full max-w-lg">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-primary/15 mb-4 sm:mb-5">
                <MapPin size={32} className="text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Welcome{firstName ? `, ${firstName}` : ''}! 👋
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base max-w-sm mx-auto">
                Are you setting up a new congregation or joining an existing one?
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Create card */}
              <button
                type="button"
                onClick={() => setMode('create')}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6 text-left shadow-xs hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 group-hover:bg-primary/25 transition-colors">
                  <Building2 size={22} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Create a congregation</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Start fresh. You&apos;ll be the administrator.
                  </p>
                </div>
                <ChevronRight
                  size={18}
                  className="ml-auto text-muted-foreground group-hover:text-foreground transition-colors"
                />
              </button>

              {/* Join card */}
              <button
                type="button"
                onClick={() => setMode('join')}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6 text-left shadow-xs hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/40 group-hover:bg-secondary/60 transition-colors">
                  <Users size={22} className="text-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Join an existing one</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Find your congregation and request access.
                  </p>
                </div>
                <ChevronRight
                  size={18}
                  className="ml-auto text-muted-foreground group-hover:text-foreground transition-colors"
                />
              </button>
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-muted-foreground">
                Signed in as{' '}
                <span className="font-medium text-foreground">
                  {userEmail || user?.name || 'User'}
                </span>
                .{' '}
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="text-primary hover:underline font-semibold cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 ml-1"
                >
                  Sign out
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ── MODE: create ───────────────────────────────────────────────────────── */}
        {membershipStatus === 'none' && mode === 'create' && (
          <div className="w-full max-w-md">
            <div className="bg-card rounded-3xl shadow-sm border border-border p-6 sm:p-10">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 mb-4">
                  <Building2 size={24} className="text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Create your congregation</h1>
                <p className="text-muted-foreground mt-1.5 text-sm">
                  You&apos;ll be the administrator. You can rename it later.
                </p>
              </div>

              {createError && (
                <Alert variant="destructive" className="mb-6 rounded-xl">
                  <AlertCircle size={16} className="absolute left-4 top-3.5" />
                  <AlertDescription className="pl-6 text-xs">{createError}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="cong-name">
                    Congregation name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cong-name"
                    autoFocus
                    {...createForm.register('name')}
                    placeholder="e.g. Southside Congregation"
                    disabled={createForm.formState.isSubmitting}
                    className="rounded-xl"
                  />
                  {createForm.formState.errors.name && (
                    <p className="text-xs text-destructive mt-1">
                      {createForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cong-city">
                    City <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <Input
                    id="cong-city"
                    {...createForm.register('city')}
                    placeholder="e.g. Manila"
                    disabled={createForm.formState.isSubmitting}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cong-country">
                    Country <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <div className="relative">
                    <Globe
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="cong-country"
                      {...createForm.register('country')}
                      placeholder="e.g. Philippines"
                      disabled={createForm.formState.isSubmitting}
                      className="pl-9 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMode('choose')}
                    disabled={createForm.formState.isSubmitting}
                    className="flex-1 rounded-xl"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={createForm.formState.isSubmitting}
                    className="flex-2 rounded-xl"
                  >
                    {createForm.formState.isSubmitting ? 'Creating…' : 'Create congregation'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODE: join ──────────────────────────────────────────────────────────── */}
        {membershipStatus === 'none' && mode === 'join' && (
          <div className="w-full max-w-md">
            <div className="bg-card rounded-3xl shadow-sm border border-border p-6 sm:p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/40 mb-3">
                  <Users size={24} className="text-foreground" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Find your congregation</h1>
                <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                  Search by congregation name, city, or country to request publisher access.
                </p>
              </div>

              {/* Instant Search Bar */}
              {!selectedCong && (
                <div className="space-y-4 mb-4">
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type name, city, or country…"
                      className="pl-10 pr-9 rounded-2xl h-11 text-sm bg-muted/40"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Real-time Discovery List */}
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {isLoadingCongregations ? (
                      <div className="text-center py-8 space-y-2">
                        <RefreshCw size={20} className="animate-spin text-primary mx-auto" />
                        <p className="text-xs text-muted-foreground">Loading congregations…</p>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-xs space-y-2">
                        <p>No congregations found matching &ldquo;{searchQuery}&rdquo;.</p>
                        <p className="text-[11px]">
                          Need to set up a new congregation?{' '}
                          <button
                            type="button"
                            onClick={() => setMode('create')}
                            className="text-primary hover:underline font-semibold"
                          >
                            Create one here
                          </button>
                        </p>
                      </div>
                    ) : (
                      searchResults.map((cong) => (
                        <button
                          key={cong.id}
                          type="button"
                          onClick={() => setSelectedCong(cong)}
                          className="w-full flex items-center justify-between rounded-2xl border border-border bg-background p-3.5 text-left hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                              {cong.name}
                            </p>
                            {(cong.city || cong.country) && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                <MapPin size={12} className="shrink-0" />
                                <span className="truncate">
                                  {[cong.city, cong.country].filter(Boolean).join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                          <ChevronRight
                            size={16}
                            className="text-muted-foreground shrink-0 group-hover:text-primary transition-colors"
                          />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Join request form */}
              {selectedCong && (
                <form onSubmit={joinForm.handleSubmit(handleJoin)} className="space-y-4">
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground text-sm">{selectedCong.name}</p>
                      {(selectedCong.city || selectedCong.country) && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin size={12} />
                          {[selectedCong.city, selectedCong.country].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCong(null)}
                      className="text-xs text-primary hover:underline font-medium cursor-pointer"
                    >
                      Change
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="join-message" className="text-xs font-semibold">
                      Introduction message to Service Overseer{' '}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <textarea
                      id="join-message"
                      {...joinForm.register('message')}
                      placeholder="e.g. Hi brother, I am a publisher in this congregation and would like access to my territory assignments."
                      rows={3}
                      className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none leading-relaxed"
                    />
                  </div>

                  {joinError && (
                    <Alert variant="destructive" className="rounded-xl">
                      <AlertCircle size={16} className="absolute left-4 top-3.5" />
                      <AlertDescription className="pl-6 text-xs">{joinError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedCong(null)}
                      className="flex-1 rounded-xl"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={joinForm.formState.isSubmitting}
                      className="flex-2 rounded-xl"
                    >
                      {joinForm.formState.isSubmitting ? 'Submitting…' : 'Send join request'}
                    </Button>
                  </div>
                </form>
              )}

              {!selectedCong && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMode('choose')}
                  className="w-full mt-2 rounded-xl text-xs"
                >
                  ← Back to options
                </Button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="py-4 text-center text-[11px] text-muted-foreground border-t border-border/40">
        © {new Date().getFullYear()} Kanataran
      </footer>
    </div>
  );
}
