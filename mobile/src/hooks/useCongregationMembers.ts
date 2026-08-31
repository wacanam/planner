import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { commitChunkedBatch, type BatchOperation } from '@/lib/batch-utils';
import { FIRESTORE_COLLECTIONS, getPlannerFirestore, nowIso } from '@/lib/firebase';
import { AssignmentStatus } from '@/lib/roles';
import type { Member } from '@/types/api';

function memberCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.congregationMembers);
}

function memberDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.congregationMembers, id);
}

function memberFromData(id: string, data: Partial<Member>): Member {
  const now = nowIso();
  const rawStatus = data.status ?? 'active';
  const status = rawStatus === 'approved' ? 'active' : rawStatus;
  return {
    id,
    userId: data.userId ?? '',
    congregationId: data.congregationId ?? '',
    congregationRole: data.congregationRole ?? 'publisher',
    groupId: data.groupId ?? null,
    status,
    joinMessage: data.joinMessage ?? null,
    joinedAt: data.joinedAt ?? now,
    reviewedAt: data.reviewedAt ?? null,
    reviewedBy: data.reviewedBy ?? null,
    reviewedByName: data.reviewedByName ?? null,
    reviewedByRole: data.reviewedByRole ?? null,
    approvedBy: data.approvedBy ?? (status === 'active' ? (data.reviewedBy ?? null) : null),
    approvedByName:
      data.approvedByName ?? (status === 'active' ? (data.reviewedByName ?? null) : null),
    declinedBy: data.declinedBy ?? (status === 'rejected' ? (data.reviewedBy ?? null) : null),
    declinedByName:
      data.declinedByName ?? (status === 'rejected' ? (data.reviewedByName ?? null) : null),
    reviewNote: data.reviewNote ?? null,
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

  const approve = useCallback(
    async (
      memberId: string,
      status: 'active' | 'rejected',
      reviewer?: { id?: string | null; name?: string | null; role?: string | null }
    ) => {
      setIsApproving(true);
      try {
        const now = nowIso();
        const reviewerId = reviewer?.id || null;
        const reviewerName = reviewer?.name || null;
        const reviewerRole = reviewer?.role || null;
        const isApproved = status === 'active';

        await updateDoc(memberDocument(memberId), {
          status,
          reviewedAt: now,
          reviewedBy: reviewerId,
          reviewedByName: reviewerName,
          reviewedByRole: reviewerRole,
          approvedBy: isApproved ? reviewerId : null,
          approvedByName: isApproved ? reviewerName : null,
          declinedBy: !isApproved ? reviewerId : null,
          declinedByName: !isApproved ? reviewerName : null,
          updatedAt: now,
        });
      } finally {
        setIsApproving(false);
      }
    },
    []
  );

  return { approve, isApproving };
}

export function useRemoveMember() {
  const [isRemoving, setIsRemoving] = useState(false);

  const remove = useCallback(async (userId: string, memberId?: string) => {
    setIsRemoving(true);
    try {
      const now = nowIso();
      const firestore = getPlannerFirestore();
      const effectiveMemberId = memberId || userId;

      const [activeAssignments, territories, pendingRequests, overseenGroups, assistedGroups] =
        await Promise.all([
          getDocs(
            query(
              collection(firestore, FIRESTORE_COLLECTIONS.assignments),
              where('userId', '==', userId)
            )
          ),
          getDocs(
            query(
              collection(firestore, FIRESTORE_COLLECTIONS.territories),
              where('publisherId', '==', userId)
            )
          ),
          getDocs(
            query(
              collection(firestore, FIRESTORE_COLLECTIONS.territoryRequests),
              where('publisherId', '==', userId)
            )
          ),
          getDocs(
            query(
              collection(firestore, FIRESTORE_COLLECTIONS.groups),
              where('overseerId', '==', userId)
            )
          ),
          getDocs(
            query(
              collection(firestore, FIRESTORE_COLLECTIONS.groups),
              where('assistantOverseerId', '==', userId)
            )
          ),
        ]);

      const ops: BatchOperation[] = [];

      // 1. Mark member status removed
      ops.push((b) =>
        b.update(memberDocument(effectiveMemberId), { status: 'removed', updatedAt: now })
      );

      // 2. Clear congregationId on user document
      ops.push((b) =>
        b.update(doc(firestore, FIRESTORE_COLLECTIONS.users, userId), {
          congregationId: null,
          updatedAt: now,
        })
      );

      // 3. Complete active assignments
      for (const a of activeAssignments.docs) {
        const data = a.data();
        const s = data.status?.toLowerCase().trim();
        if (
          s === 'active' ||
          s === 'assigned' ||
          s === 'pending_approval' ||
          s === 'pending' ||
          !data.returnedAt
        ) {
          ops.push((b) =>
            b.update(a.ref, {
              status: AssignmentStatus.COMPLETED,
              returnedAt: now,
              updatedAt: now,
            })
          );
        }
      }

      // 4. Release checked-out territories
      for (const t of territories.docs) {
        ops.push((b) =>
          b.update(t.ref, {
            status: 'available',
            publisherId: null,
            publisherName: null,
            updatedAt: now,
          })
        );
      }

      // 5. Cancel pending territory requests
      for (const r of pendingRequests.docs) {
        const data = r.data();
        if (data.status === 'pending') {
          ops.push((b) =>
            b.update(r.ref, {
              status: 'cancelled',
              responseMessage: 'Publisher removed from congregation',
              updatedAt: now,
            })
          );
        }
      }

      // 6. Clear group overseer references
      for (const g of overseenGroups.docs) {
        ops.push((b) =>
          b.update(g.ref, {
            overseerId: null,
            overseerName: null,
            updatedAt: now,
          })
        );
      }
      for (const g of assistedGroups.docs) {
        ops.push((b) =>
          b.update(g.ref, {
            assistantOverseerId: null,
            assistantOverseerName: null,
            updatedAt: now,
          })
        );
      }

      await commitChunkedBatch(firestore, ops);
    } finally {
      setIsRemoving(false);
    }
  }, []);

  return { remove, isRemoving };
}
