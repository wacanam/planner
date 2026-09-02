'use client';

import {
  AlertCircle,
  Building2,
  Check,
  KeyRound,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { fetchInvitationByCode, useAcceptInvitation, useCurrentUser } from '@/hooks';
import type { Invitation } from '@/types/api';

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  publisher: 'Publisher',
  visiting_publisher: 'Visiting Publisher',
  territory_servant: 'Territory Servant',
  secretary: 'Secretary',
  service_overseer: 'Service Overseer',
  circuit_overseer: 'Circuit Overseer',
};

export default function InviteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCode = searchParams?.get('code') || '';
  const { user, loading: loadingUser, isAuthenticated } = useCurrentUser();

  const [inputCode, setInputCode] = useState(rawCode ? rawCode.trim().toUpperCase() : '');
  const [loading, setLoading] = useState(Boolean(rawCode));
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { accept, isAccepting } = useAcceptInvitation();

  const loadInvite = async (codeToFetch: string) => {
    if (!codeToFetch) return;
    setLoading(true);
    setError(null);
    try {
      const inv = await fetchInvitationByCode(codeToFetch);
      if (!inv) {
        setError('Invitation not found or code is invalid.');
        setInvitation(null);
      } else if (inv.status !== 'pending') {
        setError(`This invitation has already been ${inv.status}.`);
        setInvitation(null);
      } else if (new Date(inv.expiresAt).getTime() < Date.now()) {
        setError('This invitation has expired.');
        setInvitation(null);
      } else {
        setInvitation(inv);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to fetch invitation details.');
      setInvitation(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (rawCode) {
      loadInvite(rawCode.trim().toUpperCase());
    }
  }, [rawCode]);

  const handleAccept = async () => {
    if (!invitation || !user?.id) return;
    try {
      await accept(invitation, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
      toast.success('Invitation accepted!');
      setSuccess(true);

      setTimeout(() => {
        if (invitation.congregationId) {
          router.replace(`/congregation/${invitation.congregationId}/dashboard`);
        } else {
          router.replace('/admin/dashboard');
        }
      }, 1500);
    } catch (e: any) {
      setError(e.message || 'Failed to accept invitation.');
      toast.error(e.message || 'Failed to accept invitation');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {success ? (
          <Card className="rounded-3xl border-border p-6 sm:p-8 text-center shadow-lg animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4">
              <Check size={36} />
            </div>
            <h1 className="text-xl font-bold text-foreground">Welcome to the Congregation!</h1>
            <p className="text-xs text-muted-foreground mt-2">
              Your invitation has been accepted. Opening your congregation workspace...
            </p>
          </Card>
        ) : loading ? (
          <Card className="rounded-3xl border-border p-8 text-center shadow-lg">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xs text-muted-foreground">Verifying invitation code...</p>
          </Card>
        ) : invitation ? (
          <Card className="rounded-3xl border-border p-6 sm:p-8 shadow-lg space-y-6 animate-in fade-in">
            <div className="text-center space-y-2">
              <div
                className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
                  invitation.type === 'system_admin'
                    ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                {invitation.type === 'system_admin' ? (
                  <ShieldCheck size={30} />
                ) : (
                  <Building2 size={30} />
                )}
              </div>
              <h1 className="text-xl font-bold text-foreground">
                {invitation.congregationName || 'System Admin Invitation'}
              </h1>
              <p className="text-xs text-muted-foreground">
                Invited by {invitation.invitedByName} ({invitation.invitedByRole})
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">ASSIGNED ROLE</span>
                <Badge
                  variant="outline"
                  className="bg-primary/15 text-primary border-primary/30 font-bold uppercase text-[10px]"
                >
                  {ROLE_DISPLAY_NAMES[invitation.congregationRole || ''] ||
                    invitation.systemRole ||
                    invitation.congregationRole ||
                    'Publisher'}
                </Badge>
              </div>

              {invitation.groupName && (
                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <span className="text-muted-foreground">SERVICE GROUP</span>
                  <span className="font-bold text-foreground">{invitation.groupName}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                <span className="text-muted-foreground">EXPIRES ON</span>
                <span className="text-foreground">{new Date(invitation.expiresAt).toLocaleDateString()}</span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loadingUser ? (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground animate-pulse">Checking session...</p>
              </div>
            ) : !isAuthenticated || !user?.id ? (
              <div className="space-y-3">
                <p className="text-xs text-center text-muted-foreground">
                  Please sign in or create an account to accept this invitation.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Link href={`/auth/login?redirect=/invite?code=${invitation.id}`} className="w-full">
                    <Button variant="outline" className="w-full rounded-xl text-xs font-semibold">
                      Sign In
                    </Button>
                  </Link>
                  <Link href={`/auth/register?redirect=/invite?code=${invitation.id}`} className="w-full">
                    <Button className="w-full rounded-xl text-xs font-semibold">
                      Register
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  className="w-full rounded-xl text-xs font-semibold gap-2 cursor-pointer h-10"
                  onClick={handleAccept}
                  disabled={isAccepting}
                >
                  <UserCheck size={16} />
                  <span>{isAccepting ? 'Accepting…' : 'Accept & Join Workspace'}</span>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full rounded-xl text-xs"
                  onClick={() => router.replace('/app')}
                >
                  Cancel
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <Card className="rounded-3xl border-border p-6 sm:p-8 shadow-lg space-y-4">
            <div>
              <h1 className="text-lg font-bold text-foreground">Enter Invitation Code</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Enter the 6-character code provided by your congregation overseer.
              </p>
            </div>

            <div className="space-y-3">
              <Input
                placeholder="e.g. 7X9K2P"
                maxLength={10}
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                className="font-mono text-center text-lg tracking-widest uppercase rounded-xl"
              />

              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                className="w-full rounded-xl text-xs font-semibold gap-2 cursor-pointer h-10"
                onClick={() => loadInvite(inputCode)}
                disabled={loading || !inputCode.trim()}
              >
                <KeyRound size={15} />
                <span>{loading ? 'Checking…' : 'Lookup Invitation'}</span>
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
