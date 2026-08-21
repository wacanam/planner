// mobile/src/hooks/useCongregationMembers.ts
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { createClientId, FIRESTORE_COLLECTIONS, getPlannerFirestore, nowIso } from '@/lib/firebase';
import type { Member } from '@/types/api';

function memberCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.congregationMembers);
}

function memberDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.congregationMembers, id);
}

function memberFromData(id: string, data: Partial<Member>): Member {
  const now = nowIso();
  return {
    id,
    userId: data.userId ?? '',
    congregationId: data.congregationId ?? '',
    congregationRole: data.congregationRole ?? 'publisher',
    groupId: data.groupId ?? null,
    status: data.status ?? 'active',
    joinMessage: data.joinMessage ?? null,
    joinedAt: data.joinedAt ?? now,
    user: data.user ?? null,
  };
}

export function useCongregationMembers(congregationId: string | null | undefined) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(congregationId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!congregationId) {
      setMembers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query(memberCollection(), where('congregationId', '==', congregationId));
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const list = snapshot.docs.map((d) => memberFromData(d.id, d.data() as Partial<Member>));
        setMembers(list);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [congregationId]);

  return { members, data: members, isLoading, error };
}

export function useJoinCongregation() {
  const [isJoining, setIsJoining] = useState(false);

  const join = useCallback(
    async (arg: {
      congregationId: string;
      userId: string;
      userName: string;
      userEmail: string;
      message?: string;
    }) => {
      setIsJoining(true);
      try {
        const now = nowIso();
        const id = `${arg.congregationId}_${arg.userId}`;
        const memberDoc: Member = {
          id,
          userId: arg.userId,
          congregationId: arg.congregationId,
          congregationRole: 'publisher',
          groupId: null,
          status: 'pending',
          joinMessage: arg.message || null,
          joinedAt: now,
          user: {
            id: arg.userId,
            name: arg.userName,
            email: arg.userEmail,
            role: 'USER',
          },
        };
        await setDoc(memberDocument(id), memberDoc);
        return { id };
      } finally {
        setIsJoining(false);
      }
    },
    []
  );

  return { join, isJoining };
}

export function useUpdateMemberRole() {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateRole = useCallback(
    async (memberId: string, role: string, groupId?: string | null) => {
      setIsUpdating(true);
      try {
        const updates: Record<string, unknown> = {
          congregationRole: role,
          updatedAt: nowIso(),
        };
        if (groupId !== undefined) updates.groupId = groupId;
        await updateDoc(memberDocument(memberId), updates);
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  return { updateRole, isUpdating };
}

export function useApproveMember() {
  const [isApproving, setIsApproving] = useState(false);

  const approve = useCallback(async (memberId: string, status: 'active' | 'rejected') => {
    setIsApproving(true);
    try {
      await updateDoc(memberDocument(memberId), {
        status,
        updatedAt: nowIso(),
      });
    } finally {
      setIsApproving(false);
    }
  }, []);

  return { approve, isApproving };
}
