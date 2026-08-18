'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { collection, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import {
  AlertCircle,
  Building2,
  ChevronRight,
  Clock,
  Globe,
  LogOut,
  MapPin,
  Search,
  Shield,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ThemeToggle } from '@/components/theme-toggle';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

type Mode = 'choose' | 'create' | 'join' | 'join-sent';

type SearchResult = {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  country?: string | null;
};

export default function OnboardingPage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('choose');
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  // Join flow
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [selectedCong, setSelectedCong] = useState<SearchResult | null>(null);
  const [joinError, setJoinError] = useState('');

  const user = session?.user as { name?: string; congregationId?: string } | undefined;
  const userId = session?.user?.id;
  const userEmail = session?.user?.email ?? null;
  const isAdmin = isSystemAdmin(session?.user?.role);

  useEffect(() => {
    if (isAdmin) {
      router.replace('/admin/dashboard');
      return;
    }
    if (user?.congregationId) {
      router.replace(`/congregation/${user.congregationId}/dashboard`);
    }
  }, [isAdmin, user?.congregationId, router]);

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

  if (isAdmin || user?.congregationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // ── Create congregation ───────────────────────────────────────────────────

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
      await setDoc(
        doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.congregations, congregation.id),
        congregation
      );
      await setDoc(doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.congregationMembers, userId), {
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
      await updateDoc(doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.users, userId), {
        congregationId: congregation.id,
        updatedAt: now,
      });
      await updateSession({ congregationId: congregation.id });
      router.replace(`/congregation/${congregation.id}/dashboard`);
      router.refresh();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    }
  }

  // ── Search congregation ───────────────────────────────────────────────────

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim().length < 2) return;
    setSearchLoading(true);
    setSearchDone(false);
    setSearchResults([]);
    setSelectedCong(null);
    try {
      const term = searchQuery.trim().toLowerCase();
      const snapshot = await getDocs(
        collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.congregations)
      );
      const results = snapshot.docs
        .map((document) => ({ id: document.id, ...(document.data() as Omit<SearchResult, 'id'>) }))
        .filter((item) => item.name?.toLowerCase().includes(term) || item.slug?.includes(term))
        .slice(0, 10);
      setSearchResults(results ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
      setSearchDone(true);
    }
  }

  // ── Submit join request ───────────────────────────────────────────────────

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

      // Notify congregation overseers of the new join request
      try {
        await notifyCongregationOverseers(firestore, selectedCong.id, {
          type: NotificationType.JOIN_REQUEST,
          title: 'New Member Access Request',
          body: `${user?.name || userEmail || 'A user'} requested to join ${selectedCong.name}.`,
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

      setMode('join-sent');
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
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
        {/* ── MODE: choose ───────────────────────────────────────────────────────── */}
        {mode === 'choose' && (
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
        {mode === 'create' && (
          <div className="w-full max-w-md">
            <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-10">
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
        {mode === 'join' && (
          <div className="w-full max-w-md">
            <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-10">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/40 mb-4">
                  <Users size={24} className="text-foreground" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Find your congregation</h1>
                <p className="text-muted-foreground mt-1.5 text-sm">
                  Search by name or city. Your request will be sent to the service overseer for
                  approval.
                </p>
              </div>

              {/* Search */}
              {!selectedCong && (
                <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search congregation name or city…"
                      className="pl-9 rounded-xl"
                      disabled={searchLoading}
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    className="rounded-xl"
                    disabled={searchLoading || searchQuery.trim().length < 2}
                  >
                    {searchLoading ? '…' : 'Search'}
                  </Button>
                </form>
              )}

              {/* Results */}
              {!selectedCong && searchDone && (
                <div className="mb-4">
                  {searchResults.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      <p>No congregations found for &quot;{searchQuery}&quot;.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {searchResults.map((cong) => (
                        <button
                          key={cong.id}
                          type="button"
                          onClick={() => setSelectedCong(cong)}
                          className="w-full flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-left hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                        >
                          <div>
                            <p className="font-medium text-foreground text-sm">{cong.name}</p>
                            {(cong.city || cong.country) && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {[cong.city, cong.country].filter(Boolean).join(', ')}
                              </p>
                            )}
                          </div>
                          <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Join request form */}
              {selectedCong && (
                <form onSubmit={joinForm.handleSubmit(handleJoin)} className="space-y-5">
                  <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{selectedCong.name}</p>
                      {(selectedCong.city || selectedCong.country) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[selectedCong.city, selectedCong.country].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCong(null)}
                      className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="join-message">Message to overseer</Label>
                    <textarea
                      id="join-message"
                      {...joinForm.register('message')}
                      placeholder="e.g. Hi, I'm a publisher in this congregation…"
                      rows={3}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>

                  {joinError && (
                    <Alert variant="destructive" className="rounded-xl">
                      <AlertCircle size={16} className="absolute left-4 top-3.5" />
                      <AlertDescription className="pl-6 text-xs">{joinError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-3 pt-1">
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
                      {joinForm.formState.isSubmitting ? 'Sending…' : 'Send join request'}
                    </Button>
                  </div>
                </form>
              )}

              {!selectedCong && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMode('choose')}
                  className="w-full mt-2 rounded-xl"
                >
                  ← Back
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── MODE: join-sent ─────────────────────────────────────────────────────── */}
        {mode === 'join-sent' && (
          <div className="w-full max-w-md text-center bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/15 mb-5">
              <Clock size={28} className="text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Request sent!</h1>
            <p className="text-muted-foreground text-sm mb-2">
              Your join request has been sent to{' '}
              <span className="font-medium text-foreground">{selectedCong?.name}</span>.
            </p>
            <p className="text-muted-foreground text-sm mb-8">
              The service overseer will review your request.
            </p>
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full rounded-xl"
              >
                Back to home
              </Button>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
              >
                <LogOut size={14} className="mr-1.5" />
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </Button>
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
