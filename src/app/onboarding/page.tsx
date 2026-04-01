'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MapPin, Building2, Globe, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const STEPS = ['welcome', 'create'] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingPage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();

  const [step, setStep] = useState<Step>('welcome');
  const [form, setForm] = useState({ name: '', city: '', country: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const user = session?.user as { name?: string; congregationId?: string } | undefined;

  // If they already have a congregation, send them to dashboard
  if (user?.congregationId) {
    router.replace('/dashboard');
    return null;
  }

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Congregation name is required.');
      return;
    }

    setLoading(true);
    try {
      // Get auth token for the API call
      const tokenRes = await fetch('/api/auth/token');
      if (!tokenRes.ok) throw new Error('Failed to get auth token');
      const { token } = await tokenRes.json();

      const res = await fetch('/api/congregations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          city: form.city.trim() || undefined,
          country: form.country.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create congregation. Please try again.');
        return;
      }

      // Refresh the session so the JWT token picks up the new congregationId
      await updateSession({ congregationId: data.data.id });

      router.replace(`/congregation/${data.data.id}/dashboard`);
      router.refresh();
    } catch (err) {
      console.error('[onboarding]', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'welcome') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4">
        <div className="w-full max-w-lg text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/15 mb-6">
            <MapPin size={36} className="text-primary" />
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-3">
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="text-muted-foreground text-base mb-8 max-w-sm mx-auto">
            You&apos;re just one step away. Set up your congregation to start managing territories
            and assignments.
          </p>

          {/* Steps preview */}
          <div className="bg-card rounded-2xl border border-border p-6 mb-8 text-left space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-sm font-semibold text-primary">
                1
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Name your congregation</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Give it a name your members will recognise
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-sm font-semibold text-primary">
                2
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Add territories & groups</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Import or create territories and assign publishers
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-sm font-semibold text-primary">
                3
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Invite your team</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add overseers and publishers to your congregation
                </p>
              </div>
            </div>
          </div>

          <Button size="lg" className="w-full sm:w-auto px-10" onClick={() => setStep('create')}>
            Get started
            <ArrowRight size={16} className="ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // Step: create
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 mb-4">
              <Building2 size={24} className="text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Create your congregation</h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              You&apos;ll be the administrator. You can rename it later.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle size={16} className="absolute left-4 top-3.5" />
              <AlertDescription className="pl-6">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleCreate} className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Congregation name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g. Southside Congregation"
                disabled={loading}
                autoFocus
              />
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <Label htmlFor="city">
                City <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="city"
                type="text"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder="e.g. Manila"
                disabled={loading}
              />
            </div>

            {/* Country */}
            <div className="space-y-1.5">
              <Label htmlFor="country">
                Country <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <div className="relative">
                <Globe
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="country"
                  type="text"
                  value={form.country}
                  onChange={(e) => update('country', e.target.value)}
                  placeholder="e.g. Philippines"
                  disabled={loading}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('welcome')}
                disabled={loading}
                className="flex-1"
              >
                Back
              </Button>
              <Button type="submit" disabled={loading || !form.name.trim()} className="flex-2 flex-grow-[2]">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating…
                  </span>
                ) : (
                  <>
                    Create congregation
                    <ArrowRight size={16} className="ml-1" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Joining an existing congregation?{' '}
          <span className="text-foreground">
            Ask your congregation admin to add you as a member.
          </span>
        </p>
      </div>
    </div>
  );
}
