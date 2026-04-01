'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/db';

export default function DashboardRedirectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user) {
      router.replace('/auth/login');
      return;
    }

    const user = session.user as { role: UserRole; congregationId?: string | null };

    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
      router.replace('/admin/dashboard');
    } else if (user.congregationId) {
      router.replace(`/congregation/${user.congregationId}/dashboard`);
    } else {
      // No congregation yet — show a holding page
      router.replace('/onboarding');
    }
  }, [session, status, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <svg
          className="animate-spin h-8 w-8 text-primary"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
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
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </div>
    </div>
  );
}
