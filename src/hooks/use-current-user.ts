'use client';

import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { useAuthSession as useSession } from '@/lib/firebase/auth';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/schema';
import { UserRole } from '@/lib/roles';

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
  congregationId?: string | null;
  congregationRole?: string | null;
  groupId?: string | null;
  avatarUrl?: string | null;
  image?: string | null;
}

export function useCurrentUser(): {
  user: SessionUser;
  loading: boolean;
  isAuthenticated: boolean;
} {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  const [membershipRole, setMembershipRole] = useState<string | null>(null);
  const [membershipCongregationId, setMembershipCongregationId] = useState<string | null>(null);
  const [membershipGroupId, setMembershipGroupId] = useState<string | null>(null);
  const [membershipLoading, setMembershipLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!userId) {
      setMembershipRole(null);
      setMembershipCongregationId(null);
      setMembershipGroupId(null);
      setMembershipLoading(false);
      return;
    }

    setMembershipLoading(true);

    // Subscribe to direct doc or query by userId in congregationMembers
    const directDocRef = doc(
      getPlannerFirestore(),
      FIRESTORE_COLLECTIONS.congregationMembers,
      userId
    );
    const unsubDirect = onSnapshot(
      directDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.congregationRole) setMembershipRole(String(data.congregationRole));
          if (data.congregationId) setMembershipCongregationId(String(data.congregationId));
          if (data.groupId) setMembershipGroupId(String(data.groupId));
        }
        setMembershipLoading(false);
      },
      () => {
        setMembershipLoading(false);
      }
    );

    const q = query(
      collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.congregationMembers),
      where('userId', '==', userId),
      where('status', '==', 'active')
    );
    const unsubQuery = onSnapshot(
      q,
      (snapshot) => {
        const docData = snapshot.docs[0]?.data();
        if (docData?.congregationRole) {
          setMembershipRole(String(docData.congregationRole));
        }
        if (docData?.congregationId) {
          setMembershipCongregationId(String(docData.congregationId));
        }
        if (docData?.groupId) {
          setMembershipGroupId(String(docData.groupId));
        }
        setMembershipLoading(false);
      },
      () => {
        setMembershipLoading(false);
      }
    );

    return () => {
      unsubDirect();
      unsubQuery();
    };
  }, [userId]);

  const effectiveRole = (() => {
    const rawRole = (session?.user?.role || '').toUpperCase();
    if (rawRole === 'SUPER_ADMIN' || rawRole === 'ADMIN') {
      return (session?.user?.role as UserRole) || UserRole.ADMIN;
    }
    if (membershipRole) {
      const normalized = membershipRole.toUpperCase().replace(/\s+/g, '_');
      if (normalized === 'SERVICE_OVERSEER') return UserRole.SERVICE_OVERSEER;
      if (normalized === 'TERRITORY_SERVANT') return UserRole.TERRITORY_SERVANT;
      if (normalized === 'PUBLISHER' || normalized === 'USER') return UserRole.PUBLISHER;
    }
    if (rawRole === 'SERVICE_OVERSEER') return UserRole.SERVICE_OVERSEER;
    if (rawRole === 'TERRITORY_SERVANT') return UserRole.TERRITORY_SERVANT;
    return UserRole.PUBLISHER;
  })();

  const congregationId = session?.user?.congregationId || membershipCongregationId || null;
  const groupId = (session?.user as any)?.groupId || membershipGroupId || null;

  const user = useMemo((): SessionUser => {
    return {
      id: session?.user?.id || '',
      name: session?.user?.name || null,
      email: session?.user?.email || null,
      role: effectiveRole,
      congregationId,
      congregationRole: membershipRole,
      groupId,
      avatarUrl: session?.user?.avatarUrl || null,
    };
  }, [
    session?.user?.id,
    session?.user?.name,
    session?.user?.email,
    session?.user?.avatarUrl,
    effectiveRole,
    congregationId,
    membershipRole,
    groupId,
  ]);

  const loading = status === 'loading' || (Boolean(userId) && membershipLoading);
  const isAuthenticated = Boolean(session?.user);

  return useMemo(
    () => ({
      user,
      loading,
      isAuthenticated,
    }),
    [user, loading, isAuthenticated]
  );
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
