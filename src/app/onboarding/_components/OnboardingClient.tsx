'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Building2,
  Globe,
  Search,
  AlertCircle,
  ArrowRight,
  Users,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchWithAuth } from '@/lib/api-client';

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

  // Create form
  const [createForm, setCreateForm] = useState({ name: '', city: '', country: '' });
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Join flow
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [selectedCong, setSelectedCong] = useState<SearchResult | null>(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  const user = session?.user as { name?: string; congregationId?: string } | undefined;

  if (user?.congregationId) {
    router.replace('/dashboard');
    return null;
  }

  // ── Create congregation ───────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    if (!createForm.name.trim()) {
      setCreateError('Congregation name is required.');
      return;
    }
    setCreateLoading(true);
    try {
      const data = await fetchWithAuth<{ data: { id: string } }>('/api/congregations', {
        method: 'POST',
        body: JSON.stringify({
          name: createForm.name.trim(),
          city: createForm.city.trim() || undefined,
          country: createForm.country.trim() || undefined,
        }),
      });
      await updateSession({ congregationId: data.data.id });
      router.replace(`/congregation/${data.data.id}/dashboard`);
      router.refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setCreateLoading(false);
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
      const data = await fetchWithAuth<{ data: SearchResult[] }>(
        `/api/congregations/search?q=${encodeURIComponent(searchQuery.trim())}`
      );
      setSearchResults(data.data ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
      setSearchDone(true);
    }
  }

  // ── Submit join request ───────────────────────────────────────────────────

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCong) return;
    setJoinError('');
    setJoinLoading(true);
    try {
      await fetchWithAuth('/api/congregations/join-requests', {
        method: 'POST',
        body: JSON.stringify({
          congregationId: selectedCong.id,
          message: joinMessage.trim() || undefined,
        }),
      });
      setMode('join-sent');
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setJoinLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  const firstName = user?.name?.split(' ')[0] ?? '';

  // ── MODE: choose ─────────────────────────────────────────────────────────
  if (mode === 'choose') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/15 mb-5">
              <MapPin size={36} className="text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome{firstName ? `, ${firstName}` : ''}! 👋
            </h1>
            <p className="text-muted-foreground text-base max-w-sm mx-auto">
              You&apos;re almost in. Are you setting up a new congregation or joining an existing
              one?
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Create card */}
            <button
              type="button"
              onClick={() => setMode('create')}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6 text-left shadow-sm hover:border-primary/50 hover:shadow-md transition-all"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 group-hover:bg-primary/25 transition-colors">
                <Building2 size={22} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Create a congregation</p>
                <p className="text-sm text-muted-foreground mt-1">
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
              className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6 text-left shadow-sm hover:border-primary/50 hover:shadow-md transition-all"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/40 group-hover:bg-secondary/60 transition-colors">
                <Users size={22} className="text-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Join an existing one</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Find your congregation and request access.
                </p>
              </div>
              <ChevronRight
                size={18}
                className="ml-auto text-muted-foreground group-hover:text-foreground transition-colors"
              />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── MODE: create ─────────────────────────────────────────────────────────
  if (mode === 'create') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-sm border border-border p-8 sm:p-10">
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
              <Alert variant="destructive" className="mb-6">
                <AlertCircle size={16} className="absolute left-4 top-3.5" />
                <AlertDescription className="pl-6">{createError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleCreate} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="cong-name">
                  Congregation name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cong-name"
                  required
                  autoFocus
                  value={createForm.name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Southside Congregation"
                  disabled={createLoading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cong-city">
                  City <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  id="cong-city"
                  value={createForm.city}
                  onChange={(e) => setCreateForm((p) => ({ ...p, city: e.target.value }))}
                  placeholder="e.g. Manila"
                  disabled={createLoading}
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
                    value={createForm.country}
                    onChange={(e) => setCreateForm((p) => ({ ...p, country: e.target.value }))}
                    placeholder="e.g. Philippines"
                    disabled={createLoading}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMode('choose')}
                  disabled={createLoading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={createLoading || !createForm.name.trim()}
                  className="flex-[2]"
                >
                  {createLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Creating…
                    </span>
                  ) : (
                    <>
                      Create congregation <ArrowRight size={16} className="ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── MODE: join ────────────────────────────────────────────────────────────
  if (mode === 'join') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-sm border border-border p-8 sm:p-10">
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
                    className="pl-9"
                    disabled={searchLoading}
                    autoFocus
                  />
                </div>
                <Button type="submit" disabled={searchLoading || searchQuery.trim().length < 2}>
                  {searchLoading ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  ) : (
                    'Search'
                  )}
                </Button>
              </form>
            )}

            {/* Results */}
            {!selectedCong && searchDone && (
              <div className="mb-4">
                {searchResults.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <p>No congregations found for &quot;{searchQuery}&quot;.</p>
                    <p className="mt-1">Try a different name or city.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((cong) => (
                      <button
                        key={cong.id}
                        type="button"
                        onClick={() => setSelectedCong(cong)}
                        className="w-full flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-left hover:border-primary/50 hover:bg-primary/5 transition-all"
                      >
                        <div>
                          <p className="font-medium text-foreground text-sm">{cong.name}</p>
                          {(cong.city || cong.country) && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {[cong.city, cong.country].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Join request form */}
            {selectedCong && (
              <form onSubmit={handleJoin} className="space-y-5">
                {/* Selected congregation */}
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
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Change
                  </button>
                </div>

                {/* Optional message */}
                <div className="space-y-1.5">
                  <Label htmlFor="join-message">
                    Message to overseer{' '}
                    <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <textarea
                    id="join-message"
                    value={joinMessage}
                    onChange={(e) => setJoinMessage(e.target.value)}
                    placeholder="e.g. Hi, I'm a publisher in this congregation…"
                    rows={3}
                    disabled={joinLoading}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-50"
                  />
                </div>

                {joinError && (
                  <Alert variant="destructive">
                    <AlertCircle size={16} className="absolute left-4 top-3.5" />
                    <AlertDescription className="pl-6">{joinError}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedCong(null)}
                    disabled={joinLoading}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button type="submit" disabled={joinLoading} className="flex-[2]">
                    {joinLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Sending…
                      </span>
                    ) : (
                      <>
                        Send join request <ArrowRight size={16} className="ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {!selectedCong && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode('choose')}
                className="w-full mt-2"
              >
                ← Back
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── MODE: join-sent ───────────────────────────────────────────────────────
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4">
      <div className="w-full max-w-md text-center bg-card rounded-2xl shadow-sm border border-border p-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/15 mb-5">
          <Clock size={28} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Request sent!</h1>
        <p className="text-muted-foreground text-sm mb-2">
          Your join request has been sent to{' '}
          <span className="font-medium text-foreground">{selectedCong?.name}</span>.
        </p>
        <p className="text-muted-foreground text-sm mb-8">
          The service overseer will review your request. You&apos;ll receive a notification once
          it&apos;s been approved.
        </p>
        <Button
          variant="outline"
          onClick={() => router.push('/no-congregation')}
          className="w-full"
        >
          Back to home
        </Button>
      </div>
    </div>
  );
}
