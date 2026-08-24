'use client';

import { Compass } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { isSystemAdmin } from '@/lib/permissions';

export default function AppGatewayPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useCurrentUser();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (redirectedRef.current) return;

    // 1. Instant cache fast-path: If user has an active congregation in localStorage, jump immediately
    if (typeof window !== 'undefined') {
      try {
        const cachedCongId = localStorage.getItem('kanataran_active_congregation');
        if (cachedCongId) {
          redirectedRef.current = true;
          router.replace(`/congregation/${cachedCongId}/dashboard`);
          return;
        }
      } catch {
        // Fall back to auth state if localStorage access fails
      }
    }

    // 2. Auth State resolution fallback
    if (!loading) {
      redirectedRef.current = true;
      if (!isAuthenticated) {
        router.replace('/auth/login');
      } else if (isSystemAdmin(user?.role)) {
        router.replace('/admin/dashboard');
      } else if (user?.congregationId) {
        router.replace(`/congregation/${user.congregationId}/dashboard`);
      } else {
        router.replace('/onboarding');
      }
    }
  }, [loading, isAuthenticated, user, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center animate-pulse">
          <Compass size={28} className="text-primary" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold text-foreground">Opening Kanataran…</p>
          <p className="text-xs text-muted-foreground">Loading your workspace</p>
        </div>
      </div>
    </div>
  );
}
