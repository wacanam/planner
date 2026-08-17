import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { useAuthSession } from '@/lib/firebase/auth';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { createClientId, FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
import type { LocalHousehold } from '@/lib/local-first/types';
import { NotificationType, ShareStatus } from '@/lib/roles';
import type { HouseholdShare } from '@/types/api';

export function useShares() {
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const userName = session?.user?.name ?? 'Fellow Publisher';

  const [incomingShares, setIncomingShares] = useState<HouseholdShare[]>([]);
  const [outgoingShares, setOutgoingShares] = useState<HouseholdShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setIncomingShares([]);
      setOutgoingShares([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const db = getPlannerFirestore();
    const sharesRef = collection(db, FIRESTORE_COLLECTIONS.shares);

    const incomingQ = query(sharesRef, where('toUserId', '==', userId));
    const outgoingQ = query(sharesRef, where('fromUserId', '==', userId));

    const unsubIncoming = onSnapshot(
      incomingQ,
      (snap) => {
        const list: HouseholdShare[] = [];
        for (const docSnap of snap.docs) {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<HouseholdShare, 'id'>) });
        }
        setIncomingShares(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching incoming shares:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    const unsubOutgoing = onSnapshot(
      outgoingQ,
      (snap) => {
        const list: HouseholdShare[] = [];
        for (const docSnap of snap.docs) {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<HouseholdShare, 'id'>) });
        }
        setOutgoingShares(list);
      },
      (err) => {
        console.error('Error fetching outgoing shares:', err);
      }
    );

    return () => {
      unsubIncoming();
      unsubOutgoing();
    };
  }, [userId]);

  const sendShareRequest = useCallback(
    async (params: {
      householdId: string;
      householdAddress: string;
      toUserId: string;
      toUserName: string;
      mode: 'collaborate' | 'transfer' | 'view' | string;
      notes?: string;
    }) => {
      if (!userId) throw new Error('Not authenticated');

      const db = getPlannerFirestore();
      const shareId = createClientId();
      const now = nowIso();

      const shareDoc: HouseholdShare = {
        id: shareId,
        householdId: params.householdId,
        householdAddress: params.householdAddress,
        fromUserId: userId,
        fromUserName: userName,
        toUserId: params.toUserId,
        toUserName: params.toUserName,
        mode: params.mode as any,
        status: ShareStatus.PENDING,
        notes: params.notes ?? null,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, FIRESTORE_COLLECTIONS.shares, shareId), shareDoc);

      // Create in-app notification for recipient
      const notifId = createClientId();
      const modeLabel =
        params.mode === 'transfer'
          ? 'Transfer Ownership'
          : params.mode === 'view'
            ? 'Read-Only View'
            : 'Collaborate';
      await setDoc(doc(db, FIRESTORE_COLLECTIONS.notifications, notifId), {
        id: notifId,
        userId: params.toUserId,
        type: NotificationType.SHARE_REQUEST,
        title: 'Household Record Shared',
        body: `${userName} shared household "${params.householdAddress}" with you (${modeLabel}).`,
        data: JSON.stringify({ shareId, householdId: params.householdId, mode: params.mode }),
        isRead: false,
        createdAt: now,
      });

      return shareId;
    },
    [userId, userName]
  );

  const respondToShare = useCallback(
    async (shareId: string, status: 'accepted' | 'declined') => {
      if (!userId) throw new Error('Not authenticated');

      const db = getPlannerFirestore();
      const shareRef = doc(db, FIRESTORE_COLLECTIONS.shares, shareId);
      const shareSnap = incomingShares.find((s) => s.id === shareId);
      if (!shareSnap) throw new Error('Share request not found');

      const now = nowIso();
      await updateDoc(shareRef, {
        status,
        updatedAt: now,
      });

      if (status === 'accepted') {
        const householdRef = doc(db, FIRESTORE_COLLECTIONS.households, shareSnap.householdId);
        const householdDocSnap = await getDoc(householdRef);
        const hData = householdDocSnap.exists()
          ? (householdDocSnap.data() as Partial<LocalHousehold>)
          : undefined;

        if (shareSnap.mode === 'transfer') {
          // Transfer ownership to recipient and attach transfer metadata
          await updateDoc(householdRef, {
            createdById: userId,
            creatorName: userName,
            transferredFrom: shareSnap.fromUserName || 'Fellow Publisher',
            transferredFromId: shareSnap.fromUserId,
            transferredAt: now,
            collaboratorIds: (hData?.collaboratorIds || []).filter((id) => id !== userId),
            readOnlyUserIds: (hData?.readOnlyUserIds || []).filter((id) => id !== userId),
            updatedById: userId,
            updatedAt: now,
          });
        } else if (shareSnap.mode === 'view') {
          // Add as read-only viewer
          const currentReadOnly = Array.isArray(hData?.readOnlyUserIds)
            ? hData.readOnlyUserIds
            : [];
          const nextReadOnly = Array.from(new Set([...currentReadOnly, userId]));
          const nextCollaborators = (hData?.collaboratorIds || []).filter((id) => id !== userId);
          await updateDoc(householdRef, {
            readOnlyUserIds: nextReadOnly,
            collaboratorIds: nextCollaborators,
            updatedById: userId,
            updatedAt: now,
          });
        } else {
          // Add as collaborator
          const currentCollaborators = Array.isArray(hData?.collaboratorIds)
            ? hData.collaboratorIds
            : [];
          const nextCollaborators = Array.from(new Set([...currentCollaborators, userId]));
          const nextReadOnly = (hData?.readOnlyUserIds || []).filter((id) => id !== userId);
          await updateDoc(householdRef, {
            collaboratorIds: nextCollaborators,
            readOnlyUserIds: nextReadOnly,
            updatedById: userId,
            updatedAt: now,
          });
        }

        // Notify sender that share was accepted
        const notifId = createClientId();
        const modeLabel =
          shareSnap.mode === 'transfer'
            ? 'transfer'
            : shareSnap.mode === 'view'
              ? 'read-only access'
              : 'collaboration';
        await setDoc(doc(db, FIRESTORE_COLLECTIONS.notifications, notifId), {
          id: notifId,
          userId: shareSnap.fromUserId,
          type: NotificationType.SHARE_ACCEPTED,
          title: 'Record Share Accepted',
          body: `${userName} accepted your ${modeLabel} of "${shareSnap.householdAddress}".`,
          data: JSON.stringify({ shareId, householdId: shareSnap.householdId }),
          isRead: false,
          createdAt: now,
        });
      } else {
        // Notify sender of decline
        const notifId = createClientId();
        await setDoc(doc(db, FIRESTORE_COLLECTIONS.notifications, notifId), {
          id: notifId,
          userId: shareSnap.fromUserId,
          type: NotificationType.SHARE_DECLINED,
          title: 'Record Share Declined',
          body: `${userName} declined the record share for "${shareSnap.householdAddress}".`,
          data: JSON.stringify({ shareId }),
          isRead: false,
          createdAt: now,
        });
      }
    },
    [userId, userName, incomingShares]
  );

  const revokeShareAccess = useCallback(
    async (householdId: string, targetUserId: string, shareId?: string) => {
      if (!userId) throw new Error('Not authenticated');

      const db = getPlannerFirestore();
      const now = nowIso();
      const householdRef = doc(db, FIRESTORE_COLLECTIONS.households, householdId);
      const snap = await getDoc(householdRef);
      if (snap.exists()) {
        const data = snap.data() as LocalHousehold;
        const nextCollaborators = (data.collaboratorIds || []).filter((id) => id !== targetUserId);
        const nextReadOnly = (data.readOnlyUserIds || []).filter((id) => id !== targetUserId);
        await updateDoc(householdRef, {
          collaboratorIds: nextCollaborators,
          readOnlyUserIds: nextReadOnly,
          updatedById: userId,
          updatedAt: now,
        });
      }

      if (shareId) {
        await updateDoc(doc(db, FIRESTORE_COLLECTIONS.shares, shareId), {
          status: 'cancelled',
          updatedAt: now,
        });
      }
    },
    [userId]
  );

  const updateSharePermission = useCallback(
    async (
      householdId: string,
      targetUserId: string,
      newMode: 'collaborate' | 'view',
      shareId?: string
    ) => {
      if (!userId) throw new Error('Not authenticated');

      const db = getPlannerFirestore();
      const now = nowIso();
      const householdRef = doc(db, FIRESTORE_COLLECTIONS.households, householdId);
      const snap = await getDoc(householdRef);
      if (snap.exists()) {
        const data = snap.data() as LocalHousehold;
        let nextCollaborators = (data.collaboratorIds || []).filter((id) => id !== targetUserId);
        let nextReadOnly = (data.readOnlyUserIds || []).filter((id) => id !== targetUserId);

        if (newMode === 'collaborate') {
          nextCollaborators = Array.from(new Set([...nextCollaborators, targetUserId]));
        } else {
          nextReadOnly = Array.from(new Set([...nextReadOnly, targetUserId]));
        }

        await updateDoc(householdRef, {
          collaboratorIds: nextCollaborators,
          readOnlyUserIds: nextReadOnly,
          updatedById: userId,
          updatedAt: now,
        });
      }

      if (shareId) {
        await updateDoc(doc(db, FIRESTORE_COLLECTIONS.shares, shareId), {
          mode: newMode,
          updatedAt: now,
        });
      }
    },
    [userId]
  );

  const cancelOutgoingShare = useCallback(
    async (shareId: string) => {
      if (!userId) throw new Error('Not authenticated');
      const db = getPlannerFirestore();
      const shareRef = doc(db, FIRESTORE_COLLECTIONS.shares, shareId);
      const snap = await getDoc(shareRef);
      if (snap.exists()) {
        const shareData = snap.data() as HouseholdShare;
        const now = nowIso();
        await updateDoc(shareRef, {
          status: 'cancelled',
          updatedAt: now,
        });

        if (shareData.householdId && shareData.toUserId) {
          const householdRef = doc(db, FIRESTORE_COLLECTIONS.households, shareData.householdId);
          const hSnap = await getDoc(householdRef);
          if (hSnap.exists()) {
            const hData = hSnap.data() as LocalHousehold;
            const nextCollaborators = (hData.collaboratorIds || []).filter(
              (id) => id !== shareData.toUserId
            );
            const nextReadOnly = (hData.readOnlyUserIds || []).filter(
              (id) => id !== shareData.toUserId
            );
            await updateDoc(householdRef, {
              collaboratorIds: nextCollaborators,
              readOnlyUserIds: nextReadOnly,
              updatedById: userId,
              updatedAt: now,
            });
          }
        }
      }
    },
    [userId]
  );

  const deleteShareRecord = useCallback(
    async (shareId: string) => {
      if (!userId) throw new Error('Not authenticated');
      const db = getPlannerFirestore();
      await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.shares, shareId));
    },
    [userId]
  );

  const combinedShares = [
    ...incomingShares.map((s) => ({ ...s, direction: 'incoming' as const })),
    ...outgoingShares.map((s) => ({ ...s, direction: 'outgoing' as const })),
  ];

  return {
    shares: combinedShares,
    incomingShares,
    outgoingShares,
    loading,
    isLoading: loading,
    error,
    sendShareRequest,
    respondToShare,
    pendingIncomingCount: incomingShares.filter(
      (s) => s.status === ShareStatus.PENDING
    ).length,
    revokeShareAccess,
    updateSharePermission,
    cancelOutgoingShare,
    deleteShareRecord,
  };
}

export function usePendingSharesCount() {
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }

    const db = getPlannerFirestore();
    const sharesRef = collection(db, FIRESTORE_COLLECTIONS.shares);
    const incomingQ = query(
      sharesRef,
      where('toUserId', '==', userId),
      where('status', '==', ShareStatus.PENDING)
    );

    const unsubscribe = onSnapshot(
      incomingQ,
      (snap) => {
        setCount(snap.docs.length);
      },
      (err) => {
        console.error('Error listening to pending shares count:', err);
      }
    );

    return unsubscribe;
  }, [userId]);

  return { count };
}

export function useCreateShare(householdId: string, householdAddress?: string | null) {
  const { sendShareRequest } = useShares();
  const [isPending, setIsPending] = useState(false);

  const create = useCallback(
    async (params: {
      toUserId: string;
      toUserName?: string;
      type: 'view' | 'collaborate' | 'transfer';
      notes?: string;
    }) => {
      setIsPending(true);
      try {
        await sendShareRequest({
          householdId,
          householdAddress: householdAddress || 'Household Record',
          toUserId: params.toUserId,
          toUserName: params.toUserName || 'Publisher',
          mode: params.type,
          notes: params.notes,
        });
      } finally {
        setIsPending(false);
      }
    },
    [householdId, householdAddress, sendShareRequest]
  );

  return { create, isPending };
}

export function useRespondToShare() {
  const { respondToShare } = useShares();
  const [isPending, setIsPending] = useState(false);

  const respond = useCallback(
    async (params: { shareId: string; status: 'accepted' | 'rejected' }) => {
      setIsPending(true);
      try {
        await respondToShare(
          params.shareId,
          params.status === 'accepted' ? 'accepted' : 'declined'
        );
      } finally {
        setIsPending(false);
      }
    },
    [respondToShare]
  );

  return { respond, isPending };
}
