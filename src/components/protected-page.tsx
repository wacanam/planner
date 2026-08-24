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
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
