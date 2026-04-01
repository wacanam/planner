'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/entities/User';
import type { ReactNode } from 'react';

interface ProtectedPageProps {
  children: ReactNode;
  /**
   * Required global role. If the user's role is lower, redirect to /dashboard.
   * If omitted, only authentication is checked.
   */
  requiredRole?: UserRole;
  /**
   * If set, also verify the user belongs to this congregation
   * (for SERVICE_OVERSEER checks). Skipped for SUPER_ADMIN / ADMIN.
   */
  congregationId?: string;
  /** Where to redirect on auth failure. Defaults to /auth/login */
  loginRedirect?: string;
  /** Where to redirect on role failure. Defaults to /dashboard */
  roleRedirect?: string;
}

const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.USER]: 0,
  [UserRole.TERRITORY_SERVANT]: 1,
  [UserRole.SERVICE_OVERSEER]: 2,
  [UserRole.ADMIN]: 3,
  [UserRole.SUPER_ADMIN]: 4,
};

export function ProtectedPage({
  children,
  requiredRole,
  congregationId,
  loginRedirect = '/auth/login',
  roleRedirect = '/dashboard',
}: ProtectedPageProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user) {
      router.replace(loginRedirect);
      return;
    }

    const user = session.user as {
      id: string;
      role: UserRole;
      congregationId?: string | null;
    };

    if (requiredRole) {
      const userRank = ROLE_RANK[user.role] ?? 0;
      const requiredRank = ROLE_RANK[requiredRole] ?? 0;
      if (userRank < requiredRank) {
        router.replace(roleRedirect);
        return;
      }
    }

    // Congregation scoping: if a congregationId is required and user is not
    // a global admin, check they belong to it.
    if (
      congregationId &&
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.ADMIN
    ) {
      if (user.congregationId !== congregationId) {
        router.replace(roleRedirect);
      }
    }
  }, [session, status, router, requiredRole, congregationId, loginRedirect, roleRedirect]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="animate-spin h-8 w-8 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!session?.user) return null;

  return <>{children}</>;
}
