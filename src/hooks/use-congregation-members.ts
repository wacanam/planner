import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  type QueryConstraint,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { createClientId, FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
import { commitChunkedBatch, type BatchOperation } from '@/lib/firebase/batch-utils';
import { queueWelcomeEmail } from '@/lib/mail';
import { createInAppNotification } from '@/lib/notifications';
import {
  AssignmentStatus,
  CongregationRole,
  MemberStatus,
  NotificationType,
  UserRole,
} from '@/lib/roles';
import type { JoinRequest, Member } from '@/types/api';

function memberCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.congregationMembers);
}

function memberDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.congregationMembers, id);
}

export function memberFromData(id: string, data: Partial<Member>): Member {
  const now = nowIso();
  const rawStatus = data.status ?? 'active';
  const status = rawStatus === 'approved' ? 'active' : rawStatus;
  const userId = data.userId || id;
  return {
    id,
    userId,
    congregationId: data.congregationId ?? '',
    congregationRole: data.congregationRole ?? null,
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
    user: data.user ?? {
      id: userId,
      name: null,
      email: null,
      role: null,
    },
  };
}

export function joinRequestFromMember(
  member: Member & { reviewNote?: string | null; reviewedAt?: string | null }
): JoinRequest {
  return {
    id: member.id,
    userId: member.userId || member.id,
    congregationId: member.congregationId,
    status: member.status,
    joinMessage: member.joinMessage,
    reviewNote: member.reviewNote ?? null,
    joinedAt: member.joinedAt,
    reviewedAt: member.reviewedAt ?? null,
    reviewedBy: member.reviewedBy ?? null,
    reviewedByName: member.reviewedByName ?? null,
    reviewedByRole: member.reviewedByRole ?? null,
    approvedBy: member.approvedBy ?? null,
    approvedByName: member.approvedByName ?? null,
    declinedBy: member.declinedBy ?? null,
    declinedByName: member.declinedByName ?? null,
    user: member.user
      ? {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          avatarUrl: member.user.avatarUrl ?? null,
        }
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
      where('status', 'in', ['active', 'approved'])
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
    async (arg: {
      requestId: string;
      status: string;
      reviewNote?: string;
      reviewerId?: string;
      reviewerName?: string;
      reviewerRole?: string;
    }) => {
      setIsReviewing(true);
      try {
        const now = nowIso();
        const isApproved =
          arg.status === 'approved' ||
          arg.status === 'active' ||
          arg.status === MemberStatus.ACTIVE;
        const finalStatus = isApproved ? MemberStatus.ACTIVE : MemberStatus.REJECTED;

        const db = getPlannerFirestore();

        // Fetch congregation details for notifications & email
        let congregationName = 'the congregation';
        try {
          const congSnap = await getDoc(
            doc(db, FIRESTORE_COLLECTIONS.congregations, congregationId)
          );
          if (congSnap.exists()) {
            congregationName = congSnap.data()?.name || 'the congregation';
          }
        } catch {
          // fallback to default name
        }

        const memberRef = memberDocument(arg.requestId);
        const memberSnap = await getDoc(memberRef);
        const memberData = memberSnap.exists() ? (memberSnap.data() as Partial<Member>) : undefined;
        const targetUserId = memberData?.userId || arg.requestId;

        // Fetch user data from users collection to guarantee user info in member doc
        const userRef = doc(db, FIRESTORE_COLLECTIONS.users, targetUserId);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? (userSnap.data() as Record<string, any>) : undefined;

        const userName =
          userData?.name ||
          memberData?.user?.name ||
          userData?.email ||
          memberData?.user?.email ||
          'Publisher';
        const userEmail = userData?.email || memberData?.user?.email || null;
        const userAvatarUrl = userData?.avatarUrl || memberData?.user?.avatarUrl || null;
        const userRole = userData?.role || memberData?.user?.role || UserRole.PUBLISHER;

        const reviewerId = arg.reviewerId || null;
        const reviewerName = arg.reviewerName || null;
        const reviewerRole = arg.reviewerRole || null;

        await updateDoc(memberRef, {
          status: finalStatus,
          congregationRole:
            memberData?.congregationRole || (isApproved ? CongregationRole.PUBLISHER : null),
          reviewNote: arg.reviewNote ?? null,
          reviewedAt: now,
          reviewedBy: reviewerId,
          reviewedByName: reviewerName,
          reviewedByRole: reviewerRole,
          approvedBy: isApproved ? reviewerId : null,
          approvedByName: isApproved ? reviewerName : null,
          declinedBy: !isApproved ? reviewerId : null,
          declinedByName: !isApproved ? reviewerName : null,
          updatedAt: now,
          user: {
            id: targetUserId,
            name: userName,
            email: userEmail,
            avatarUrl: userAvatarUrl,
            role: userRole,
          },
        });

        if (isApproved) {
          await setDoc(
            userRef,
            {
              congregationId,
              updatedAt: now,
            },
            { merge: true }
          );

          // Queue welcome email if user email is available
          if (userEmail) {
            try {
              await queueWelcomeEmail(db, {
                toEmail: userEmail,
                userName,
                congregationName,
                congregationId,
                roleName: 'Publisher',
              });
            } catch (emailErr) {
              console.warn('[useReviewJoinRequest] Failed to queue welcome email:', emailErr);
            }
          }
        } else {
          // If rejected, ensure congregationId on user document is cleared
          await setDoc(
            userRef,
            {
              congregationId: null,
              updatedAt: now,
            },
            { merge: true }
          );
        }

        const approverDisplay = reviewerName ? ` by ${reviewerName}` : ' by the Service Overseer';
        const declinerDisplay = reviewerName ? ` by ${reviewerName}` : '';

        const notificationId = createClientId();
        await setDoc(doc(db, FIRESTORE_COLLECTIONS.notifications, notificationId), {
          id: notificationId,
          userId: targetUserId,
          type: isApproved ? NotificationType.JOIN_APPROVED : NotificationType.JOIN_REJECTED,
          title: isApproved
            ? `Welcome to ${congregationName}!`
            : 'Congregation request not approved',
          body: isApproved
            ? `Your request to join ${congregationName} has been approved${approverDisplay}.`
            : `Your request to join ${congregationName} was not approved${declinerDisplay}.${arg.reviewNote ? ` Note: ${arg.reviewNote}` : ''}`,
          data: JSON.stringify({
            congregationId,
            congregationName,
            reviewedBy: reviewerId,
            reviewedByName: reviewerName,
            reviewNote: arg.reviewNote || null,
          }),
          isRead: false,
          createdAt: now,
        });
      } finally {
        setIsReviewing(false);
      }
    },
    [congregationId]
  );
  return { review, isReviewing, isPending: isReviewing };
}

export function useUpdateMemberRole(_congregationId: string) {
  const [isUpdating, setIsUpdating] = useState(false);
  const updateRole = useCallback(
    async (arg: { userId: string; congregationRole: string | null }) => {
      setIsUpdating(true);
      try {
        const now = nowIso();
        const firestore = getPlannerFirestore();
        await updateDoc(memberDocument(arg.userId), {
          congregationRole: arg.congregationRole,
          updatedAt: now,
        });

        const formattedRole = arg.congregationRole
          ? arg.congregationRole
              .replace(/_/g, ' ')
              .toLowerCase()
              .replace(/\b\w/g, (l) => l.toUpperCase())
          : 'Publisher';

        try {
          await createInAppNotification(firestore, {
            userId: arg.userId,
            type: NotificationType.ROLE_UPDATED,
            title: 'Congregation Role Updated',
            body: `Your congregation role has been set to ${formattedRole}.`,
            data: {
              congregationId: _congregationId,
              role: arg.congregationRole,
            },
          });
        } catch (notifErr) {
          console.error('Failed to notify member of role change:', notifErr);
        }
      } finally {
        setIsUpdating(false);
      }
    },
    [_congregationId]
  );
  return { updateRole, isUpdating, isPending: isUpdating };
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
          await setDoc(
            doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.users, userId),
            {
              congregationId,
              updatedAt: nowIso(),
            },
            { merge: true }
          );
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
      const now = nowIso();
      const firestore = getPlannerFirestore();

      const [activeAssignments, territories, pendingRequests, overseenGroups, assistedGroups] =
        await Promise.all([
          getDocs(
            query(
              collection(firestore, FIRESTORE_COLLECTIONS.assignments),
              where('userId', '==', arg.userId)
            )
          ),
          getDocs(
            query(
              collection(firestore, FIRESTORE_COLLECTIONS.territories),
              where('publisherId', '==', arg.userId)
            )
          ),
          getDocs(
            query(
              collection(firestore, FIRESTORE_COLLECTIONS.territoryRequests),
              where('publisherId', '==', arg.userId)
            )
          ),
          getDocs(
            query(
              collection(firestore, FIRESTORE_COLLECTIONS.groups),
              where('overseerId', '==', arg.userId)
            )
          ),
          getDocs(
            query(
              collection(firestore, FIRESTORE_COLLECTIONS.groups),
              where('assistantOverseerId', '==', arg.userId)
            )
          ),
        ]);

      const ops: BatchOperation[] = [];

      // 1. Mark member status removed
      ops.push((b) => b.update(memberDocument(arg.userId), { status: 'removed', updatedAt: now }));

      // 2. Clear congregationId on user document
      ops.push((b) =>
        b.update(doc(firestore, FIRESTORE_COLLECTIONS.users, arg.userId), {
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
  return { removeMember, isRemoving };
}
