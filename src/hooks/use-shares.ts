'use client';

import { collection, doc, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { useAuthSession } from '@/lib/firebase/auth';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { createClientId, FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
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
      mode: 'collaborate' | 'transfer';
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
        mode: params.mode,
        status: ShareStatus.PENDING,
        notes: params.notes ?? null,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, FIRESTORE_COLLECTIONS.shares, shareId), shareDoc);

      // Create in-app notification for recipient
      const notifId = createClientId();
      await setDoc(doc(db, FIRESTORE_COLLECTIONS.notifications, notifId), {
        id: notifId,
        userId: params.toUserId,
        type: NotificationType.SHARE_REQUEST,
        title: 'Household Record Shared',
        body: `${userName} shared household "${params.householdAddress}" with you (${params.mode === 'transfer' ? 'Transfer Ownership' : 'Collaborate'}).`,
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

        if (shareSnap.mode === 'transfer') {
          // Transfer ownership to recipient
          await updateDoc(householdRef, {
            createdById: userId,
            creatorName: userName,
            updatedAt: now,
          });
        } else {
          // Add as collaborator
          // We read current collaborators or add to array
          await updateDoc(householdRef, {
            collaboratorIds: [userId],
            updatedAt: now,
          });
        }

        // Notify sender that share was accepted
        const notifId = createClientId();
        await setDoc(doc(db, FIRESTORE_COLLECTIONS.notifications, notifId), {
          id: notifId,
          userId: shareSnap.fromUserId,
          type: NotificationType.SHARE_ACCEPTED,
          title: 'Record Share Accepted',
          body: `${userName} accepted your ${shareSnap.mode === 'transfer' ? 'transfer' : 'collaboration'} of "${shareSnap.householdAddress}".`,
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
  };
}

export function useCreateShare(householdId: string) {
  const { sendShareRequest } = useShares();
  const [isPending, setIsPending] = useState(false);

  const create = useCallback(
    async (params: {
      toUserId: string;
      type: 'view' | 'collaborate' | 'transfer';
      notes?: string;
    }) => {
      setIsPending(true);
      try {
        await sendShareRequest({
          householdId,
          householdAddress: 'Household Record',
          toUserId: params.toUserId,
          toUserName: 'Publisher',
          mode: params.type === 'transfer' ? 'transfer' : 'collaborate',
          notes: params.notes,
        });
      } finally {
        setIsPending(false);
      }
    },
    [householdId, sendShareRequest]
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
