import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { createClientId, FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
import type { JoinRequest, Member } from '@/types/api';

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
    congregationRole: data.congregationRole ?? null,
    status: data.status ?? 'active',
    joinMessage: data.joinMessage ?? null,
    joinedAt: data.joinedAt ?? now,
    user: data.user ?? null,
  };
}

function joinRequestFromMember(
  member: Member & { reviewNote?: string | null; reviewedAt?: string | null }
): JoinRequest {
  return {
    id: member.id,
    congregationId: member.congregationId,
    status: member.status,
    joinMessage: member.joinMessage,
    reviewNote: member.reviewNote ?? null,
    joinedAt: member.joinedAt,
    reviewedAt: member.reviewedAt ?? null,
    user: member.user
      ? { id: member.user.id, name: member.user.name, email: member.user.email }
      : null,
  };
}

export function useCongregationMembers(congregationId: string | null | undefined) {
  const [data, setData] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(congregationId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!congregationId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const memberQuery = query(
      memberCollection(),
      where('congregationId', '==', congregationId),
      where('status', '==', 'active')
    );
    return onSnapshot(
      memberQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        setData(
          snapshot.docs.map((document) =>
            memberFromData(document.id, document.data() as Partial<Member>)
          )
        );
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [congregationId]);

  return { data, isLoading, error };
}

export function useCongregationJoinRequests(
  congregationId: string | null | undefined,
  status?: string
) {
  const [data, setData] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(congregationId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!congregationId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const constraints: QueryConstraint[] = [where('congregationId', '==', congregationId)];
    if (status) constraints.push(where('status', '==', status));
    const memberQuery = query(memberCollection(), ...constraints);
    return onSnapshot(
      memberQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        setData(
          snapshot.docs
            .map((document) =>
              joinRequestFromMember(memberFromData(document.id, document.data() as Partial<Member>))
            )
            .sort((left, right) => right.joinedAt.localeCompare(left.joinedAt))
        );
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [congregationId, status]);

  return { data, isLoading, error };
}

export function useReviewJoinRequest(congregationId: string) {
  const [isReviewing, setIsReviewing] = useState(false);
  const review = useCallback(
    async (arg: { requestId: string; status: string; reviewNote?: string }) => {
      setIsReviewing(true);
      try {
        const now = nowIso();
        await updateDoc(memberDocument(arg.requestId), {
          status: arg.status,
          reviewNote: arg.reviewNote ?? null,
          reviewedAt: now,
        });
        if (arg.status === 'active') {
          await updateDoc(doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.users, arg.requestId), {
            congregationId,
            updatedAt: now,
          });
        }
        const notificationId = createClientId();
        await setDoc(
          doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.notifications, notificationId),
          {
            id: notificationId,
            userId: arg.requestId,
            type: arg.status === 'active' ? 'join_approved' : 'join_rejected',
            title: arg.status === 'active' ? 'Join request approved' : 'Join request rejected',
            body:
              arg.status === 'active'
                ? 'Your congregation access request was approved.'
                : 'Your congregation access request was not approved.',
            data: JSON.stringify({ congregationId }),
            isRead: false,
            createdAt: now,
          }
        );
      } finally {
        setIsReviewing(false);
      }
    },
    [congregationId]
  );
  return { review, isReviewing };
}

export function useUpdateMemberRole(_congregationId: string) {
  const [isUpdating, setIsUpdating] = useState(false);
  const updateRole = useCallback(
    async (arg: { userId: string; congregationRole: string | null }) => {
      setIsUpdating(true);
      try {
        await updateDoc(memberDocument(arg.userId), {
          congregationRole: arg.congregationRole,
          updatedAt: nowIso(),
        });
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );
  return { updateRole, isUpdating };
}

export function useAddMember(congregationId: string) {
  const [isAdding, setIsAdding] = useState(false);
  const addMember = useCallback(
    async (arg: Record<string, unknown>) => {
      setIsAdding(true);
      try {
        const userId = String(arg.userId ?? '');
        const id = userId || createClientId();
        const user = arg.user as Member['user'] | undefined;
        await setDoc(memberDocument(id), {
          id,
          userId,
          congregationId,
          congregationRole: (arg.congregationRole as string | null | undefined) ?? null,
          status: 'active',
          joinMessage: null,
          joinedAt: nowIso(),
          user: user ?? null,
        } satisfies Member);
        if (userId) {
          await updateDoc(doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.users, userId), {
            congregationId,
            updatedAt: nowIso(),
          });
        }
        return { id };
      } finally {
        setIsAdding(false);
      }
    },
    [congregationId]
  );
  return { addMember, isAdding };
}

export function useRemoveMember(_congregationId: string) {
  const [isRemoving, setIsRemoving] = useState(false);
  const removeMember = useCallback(async (arg: { userId: string }) => {
    setIsRemoving(true);
    try {
      await updateDoc(memberDocument(arg.userId), { status: 'removed', updatedAt: nowIso() });
      await updateDoc(doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.users, arg.userId), {
        congregationId: null,
        updatedAt: nowIso(),
      });
    } finally {
      setIsRemoving(false);
    }
  }, []);
  return { removeMember, isRemoving };
}
