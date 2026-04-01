'use client';

import { useSession } from 'next-auth/react';
import { UserRole } from '@/entities/User';

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
  congregationId?: string | null;
}

export function useCurrentUser(): {
  user: SessionUser | null;
  loading: boolean;
  isAuthenticated: boolean;
} {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return { user: null, loading: true, isAuthenticated: false };
  }

  if (!session?.user) {
    return { user: null, loading: false, isAuthenticated: false };
  }

  const u = session.user as SessionUser;
  return {
    user: u,
    loading: false,
    isAuthenticated: true,
  };
}

export function useIsRole(...roles: UserRole[]): boolean {
  const { user } = useCurrentUser();
  if (!user) return false;
  return roles.includes(user.role);
}

export function useIsSuperAdmin(): boolean {
  return useIsRole(UserRole.SUPER_ADMIN);
}

export function useIsServiceOverseer(): boolean {
  return useIsRole(UserRole.SERVICE_OVERSEER, UserRole.SUPER_ADMIN, UserRole.ADMIN);
}
