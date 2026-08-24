'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { UserRole } from '@/lib/roles';

interface ProtectedPageProps {
  children: ReactNode;
  /**
   * Required global role. If the user's role is lower, redirect to /onboarding.
   * If omitted, only authentication is checked.
   */
  requiredRole?: UserRole;
  /**
   * Explicit list of allowed user roles.
   */
  allowedRoles?: UserRole[];
  /**
   * If set, also verify the user belongs to this congregation
   * (for SERVICE_OVERSEER checks). Skipped for SUPER_ADMIN / ADMIN.
   */
  congregationId?: string;
  /** Where to redirect on auth failure. Defaults to /auth/login */
  loginRedirect?: string;
  /** Where to redirect on role failure. Defaults to /onboarding */
  roleRedirect?: string;
  /** Where to redirect if email is unverified. Defaults to /auth/verify-email */
  verificationRedirect?: string;
}

const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.USER]: 0,
  [UserRole.VISITING_PUBLISHER]: 0,
  [UserRole.TERRITORY_SERVANT]: 1,
  [UserRole.SECRETARY]: 2,
  [UserRole.SERVICE_OVERSEER]: 2,
  [UserRole.CIRCUIT_OVERSEER]: 2,
  [UserRole.ADMIN]: 3,
  [UserRole.SUPER_ADMIN]: 4,
};

export function ProtectedPage({
  children,
  requiredRole,
  allowedRoles,
  congregationId,
  loginRedirect = '/auth/login',
  roleRedirect = '/onboarding',
  verificationRedirect = '/auth/verify-email',
}: ProtectedPageProps) {
  const { user, userMemberships, loading, isAuthenticated } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user?.id) {
      router.replace(loginRedirect);
      return;
    }

    if (user.emailVerified === false) {
      router.replace(verificationRedirect);
      return;
    }

    if (allowedRoles && allowedRoles.length > 0) {
      const isAllowed =
        user.role === UserRole.SUPER_ADMIN ||
        user.role === UserRole.ADMIN ||
        allowedRoles.includes(user.role as UserRole);
      if (!isAllowed) {
        router.replace(roleRedirect);
        return;
      }
    } else if (requiredRole) {
      const userRank = ROLE_RANK[user.role as UserRole] ?? 0;
      const requiredRank = ROLE_RANK[requiredRole] ?? 0;
      if (userRank < requiredRank) {
        router.replace(roleRedirect);
        return;
      }
    }

    // Congregation scoping: if a congregationId is required and user is not
    // a global admin, verify they are an active member of this congregation
    // (supporting single or multi-congregation memberships for circuit overseers).
    if (congregationId && user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.ADMIN) {
      const hasMembership =
        user.congregationId === congregationId ||
        userMemberships.some(
          (m) =>
            m.congregationId === congregationId &&
            (m.status === 'active' || m.status === 'approved')
        );
      if (!hasMembership) {
        router.replace(roleRedirect);
        return;
      }
    }
  }, [
    user.id,
    user.role,
    user.congregationId,
    user.emailVerified,
    userMemberships,
    loading,
    isAuthenticated,
    router,
    requiredRole,
    congregationId,
    loginRedirect,
    roleRedirect,
    verificationRedirect,
  ]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-4 sm:p-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded-md" />
            <div className="h-4 w-72 bg-muted rounded-md" />
          </div>
          <div className="h-10 w-32 bg-muted rounded-md" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array
            <div key={i} className="p-5 rounded-xl border bg-card shadow-xs space-y-3">
              <div className="h-4 w-24 bg-muted rounded-md" />
              <div className="h-7 w-16 bg-muted rounded-md" />
              <div className="h-3 w-36 bg-muted rounded-md" />
            </div>
          ))}
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
          <div className="h-5 w-36 bg-muted rounded-md pb-2" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array
              <div
                key={i}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-9 w-9 bg-muted rounded-lg" />
                  <div className="space-y-1 flex-1">
                    <div className="h-4 w-40 bg-muted rounded-md" />
                    <div className="h-3 w-64 bg-muted rounded-md" />
                  </div>
                </div>
                <div className="h-6 w-20 bg-muted rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
