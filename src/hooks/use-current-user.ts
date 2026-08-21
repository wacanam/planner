'use client';

import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { useAuthSession as useSession } from '@/lib/firebase/auth';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/schema';
import { CongregationRole, MemberStatus, UserRole } from '@/lib/roles';

export interface PendingMembershipInfo {
  congregationId: string;
  status: 'pending' | 'rejected';
  joinedAt?: string | null;
  joinMessage?: string | null;
  reviewNote?: string | null;
}

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
  membershipStatus: 'active' | 'pending' | 'rejected' | 'none';
  pendingMembership: PendingMembershipInfo | null;
} {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  const [membershipStatus, setMembershipStatus] = useState<
    'active' | 'pending' | 'rejected' | 'none'
  >('none');
  const [pendingMembership, setPendingMembership] = useState<PendingMembershipInfo | null>(null);
  const [membershipRole, setMembershipRole] = useState<string | null>(null);
  const [membershipCongregationId, setMembershipCongregationId] = useState<string | null>(null);
  const [membershipGroupId, setMembershipGroupId] = useState<string | null>(null);
  const [membershipLoading, setMembershipLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!userId) {
      setMembershipStatus('none');
      setPendingMembership(null);
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
          const rawStatus = data.status ?? 'active';
          const isActive =
            rawStatus === 'active' || rawStatus === 'approved' || rawStatus === MemberStatus.ACTIVE;
          const isPending = rawStatus === 'pending' || rawStatus === MemberStatus.PENDING;
          const isRejected = rawStatus === 'rejected' || rawStatus === MemberStatus.REJECTED;

          if (isActive && data.congregationId) {
            setMembershipStatus('active');
            setPendingMembership(null);
            setMembershipRole(
              data.congregationRole ? String(data.congregationRole) : CongregationRole.PUBLISHER
            );
            setMembershipCongregationId(String(data.congregationId));
            setMembershipGroupId(data.groupId ? String(data.groupId) : null);
          } else if (isPending) {
            setMembershipStatus('pending');
            setMembershipRole(null);
            setMembershipCongregationId(null);
            setMembershipGroupId(null);
            setPendingMembership({
              congregationId: data.congregationId ? String(data.congregationId) : '',
              status: 'pending',
              joinedAt: data.joinedAt || null,
              joinMessage: data.joinMessage || null,
            });
          } else if (isRejected) {
            setMembershipStatus('rejected');
            setMembershipRole(null);
            setMembershipCongregationId(null);
            setMembershipGroupId(null);
            setPendingMembership({
              congregationId: data.congregationId ? String(data.congregationId) : '',
              status: 'rejected',
              joinedAt: data.joinedAt || null,
              joinMessage: data.joinMessage || null,
              reviewNote: data.reviewNote || null,
            });
          } else {
            setMembershipStatus('none');
            setPendingMembership(null);
            setMembershipRole(null);
            setMembershipCongregationId(null);
            setMembershipGroupId(null);
          }
        } else {
          setMembershipStatus('none');
          setPendingMembership(null);
          setMembershipRole(null);
          setMembershipCongregationId(null);
          setMembershipGroupId(null);
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
      where('status', 'in', ['active', 'approved'])
    );
    const unsubQuery = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0]?.data();
          if (docData?.congregationId) {
            setMembershipStatus('active');
            setPendingMembership(null);
            setMembershipRole(
              docData.congregationRole
                ? String(docData.congregationRole)
                : CongregationRole.PUBLISHER
            );
            setMembershipCongregationId(String(docData.congregationId));
            setMembershipGroupId(docData.groupId ? String(docData.groupId) : null);
          }
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

  const rawGlobalRole = (session?.user?.role || '').toUpperCase();
  const isGlobalAdmin = rawGlobalRole === 'SUPER_ADMIN' || rawGlobalRole === 'ADMIN';

  const effectiveRole = (() => {
    if (isGlobalAdmin) {
      return (session?.user?.role as UserRole) || UserRole.ADMIN;
    }
    if (membershipStatus === 'active' && membershipRole) {
      const normalized = membershipRole.toUpperCase().replace(/\s+/g, '_');
      if (normalized === 'SERVICE_OVERSEER') return UserRole.SERVICE_OVERSEER;
      if (normalized === 'TERRITORY_SERVANT') return UserRole.TERRITORY_SERVANT;
      if (normalized === 'PUBLISHER' || normalized === 'USER') return UserRole.PUBLISHER;
    }
    return UserRole.USER;
  })();

  const congregationId = isGlobalAdmin
    ? session?.user?.congregationId || membershipCongregationId || null
    : membershipStatus === 'active'
      ? membershipCongregationId
      : null;

  const groupId = membershipStatus === 'active' ? membershipGroupId : null;

  const user = useMemo((): SessionUser => {
    return {
      id: session?.user?.id || '',
      name: session?.user?.name || null,
      email: session?.user?.email || null,
      role: effectiveRole,
      congregationId,
      congregationRole: membershipStatus === 'active' ? membershipRole : null,
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
    membershipStatus,
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
      membershipStatus,
      pendingMembership,
    }),
    [user, loading, isAuthenticated, membershipStatus, pendingMembership]
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
