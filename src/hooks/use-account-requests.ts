'use client';

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { createClientId, FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
import type { AccountRequest, AccountRequestType } from '@/types/api';
import { useCurrentUser } from './use-current-user';

function requestsCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.accountRequests);
}

function requestDoc(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.accountRequests, id);
}

function requestFromData(id: string, data: Partial<AccountRequest>): AccountRequest {
  return {
    id,
    userId: data.userId ?? '',
    userName: data.userName ?? null,
    userEmail: data.userEmail ?? null,
    userAvatarUrl: data.userAvatarUrl ?? null,
    type: data.type ?? 'leave_congregation',
    congregationId: data.congregationId ?? null,
    congregationName: data.congregationName ?? null,
    reason: data.reason ?? null,
    status: data.status ?? 'pending',
    requestedAt: data.requestedAt ?? nowIso(),
    reviewedAt: data.reviewedAt ?? null,
    reviewedBy: data.reviewedBy ?? null,
    reviewedByName: data.reviewedByName ?? null,
    reviewNote: data.reviewNote ?? null,
  };
}

export function useMyAccountRequests() {
  const { user } = useCurrentUser();
  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(user.id));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user.id) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query(requestsCollection(), where('userId', '==', user.id));

    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) =>
          requestFromData(d.id, d.data() as Partial<AccountRequest>)
        );
        // Sort descending by requestedAt
        list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
        setRequests(list);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [user.id]);

  const pendingLeaveRequest = useMemo(
    () => requests.find((r) => r.type === 'leave_congregation' && r.status === 'pending') || null,
    [requests]
  );

  const pendingDeleteRequest = useMemo(
    () => requests.find((r) => r.type === 'delete_account' && r.status === 'pending') || null,
    [requests]
  );

  const createRequest = useCallback(
    async (params: {
      type: AccountRequestType;
      reason?: string;
      congregationId?: string | null;
      congregationName?: string | null;
    }) => {
      if (!user.id) throw new Error('You must be signed in.');
      setIsSubmitting(true);
      try {
        const id = createClientId();
        const newReq: AccountRequest = {
          id,
          userId: user.id,
          userName: user.name || user.email || 'Publisher',
          userEmail: user.email || '',
          userAvatarUrl: user.avatarUrl || null,
          type: params.type,
          congregationId: params.congregationId ?? user.congregationId ?? null,
          congregationName: params.congregationName ?? null,
          reason: params.reason?.trim() || null,
          status: 'pending',
          requestedAt: nowIso(),
        };

        await setDoc(requestDoc(id), newReq);
        return newReq;
      } finally {
        setIsSubmitting(false);
      }
    },
    [user.id, user.name, user.email, user.avatarUrl, user.congregationId]
  );

  const cancelRequest = useCallback(async (requestId: string) => {
    setIsSubmitting(true);
    try {
      await updateDoc(requestDoc(requestId), {
        status: 'cancelled',
        reviewedAt: nowIso(),
        reviewNote: 'Cancelled by user',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    requests,
    pendingLeaveRequest,
    pendingDeleteRequest,
    isLoading,
    isSubmitting,
    error,
    createRequest,
    cancelRequest,
  };
}

export function useAdminAccountRequests() {
  const { user } = useCurrentUser();
  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(requestsCollection());

    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) =>
          requestFromData(d.id, d.data() as Partial<AccountRequest>)
        );
        list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
        setRequests(list);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, []);

  const pendingRequests = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests]);

  const approveRequest = useCallback(
    async (requestId: string, reviewNote?: string) => {
      setIsProcessing(true);
      try {
        const reqRef = requestDoc(requestId);
        const snap = await getDoc(reqRef);
        if (!snap.exists()) throw new Error('Request not found.');
        const reqData = snap.data() as AccountRequest;
        const targetUserId = reqData.userId;
        const db = getPlannerFirestore();

        // 1. Mark request approved
        await updateDoc(reqRef, {
          status: 'approved',
          reviewedAt: nowIso(),
          reviewedBy: user.id || 'admin',
          reviewedByName: user.name || 'System Admin',
          reviewNote: reviewNote?.trim() || null,
        });

        // 2. Perform membership / account changes based on request type
        if (reqData.type === 'leave_congregation') {
          // Remove congregationId from user document
          const userRef = doc(db, FIRESTORE_COLLECTIONS.users, targetUserId);
          await updateDoc(userRef, {
            congregationId: null,
            groupId: null,
            updatedAt: nowIso(),
          }).catch(() => undefined);

          // Delete member document from congregationMembers
          const memberRef = doc(db, FIRESTORE_COLLECTIONS.congregationMembers, targetUserId);
          await deleteDoc(memberRef).catch(() => undefined);

          // Remove user from service groups
          if (reqData.congregationId) {
            const groupsSnap = await getDocs(
              query(
                collection(db, FIRESTORE_COLLECTIONS.groups),
                where('congregationId', '==', reqData.congregationId)
              )
            );
            for (const gDoc of groupsSnap.docs) {
              const gData = gDoc.data();
              const members = (gData.members || []).filter(
                (m: any) => m.userId !== targetUserId && m.id !== targetUserId
              );
              const updates: Record<string, any> = { members };
              if (gData.overseerId === targetUserId) {
                updates.overseerId = null;
                updates.overseerName = null;
              }
              if (gData.assistantOverseerId === targetUserId) {
                updates.assistantOverseerId = null;
                updates.assistantOverseerName = null;
              }
              await updateDoc(gDoc.ref, updates).catch(() => undefined);
            }
          }

          // Return active assignments for this user
          const assignmentsSnap = await getDocs(
            query(
              collection(db, FIRESTORE_COLLECTIONS.assignments),
              where('userId', '==', targetUserId),
              where('status', '==', 'active')
            )
          );
          for (const aDoc of assignmentsSnap.docs) {
            await updateDoc(aDoc.ref, {
              status: 'returned',
              returnedAt: nowIso(),
            }).catch(() => undefined);
          }
        } else if (reqData.type === 'delete_account') {
          // Deactivate user account
          const userRef = doc(db, FIRESTORE_COLLECTIONS.users, targetUserId);
          await updateDoc(userRef, {
            isActive: false,
            congregationId: null,
            groupId: null,
            name: '[Deleted User]',
            updatedAt: nowIso(),
          }).catch(() => undefined);

          // Remove member document
          const memberRef = doc(db, FIRESTORE_COLLECTIONS.congregationMembers, targetUserId);
          await deleteDoc(memberRef).catch(() => undefined);

          // Remove from groups
          if (reqData.congregationId) {
            const groupsSnap = await getDocs(
              query(
                collection(db, FIRESTORE_COLLECTIONS.groups),
                where('congregationId', '==', reqData.congregationId)
              )
            );
            for (const gDoc of groupsSnap.docs) {
              const gData = gDoc.data();
              const members = (gData.members || []).filter(
                (m: any) => m.userId !== targetUserId && m.id !== targetUserId
              );
              const updates: Record<string, any> = { members };
              if (gData.overseerId === targetUserId) {
                updates.overseerId = null;
                updates.overseerName = null;
              }
              if (gData.assistantOverseerId === targetUserId) {
                updates.assistantOverseerId = null;
                updates.assistantOverseerName = null;
              }
              await updateDoc(gDoc.ref, updates).catch(() => undefined);
            }
          }

          // Return active assignments
          const assignmentsSnap = await getDocs(
            query(
              collection(db, FIRESTORE_COLLECTIONS.assignments),
              where('userId', '==', targetUserId),
              where('status', '==', 'active')
            )
          );
          for (const aDoc of assignmentsSnap.docs) {
            await updateDoc(aDoc.ref, {
              status: 'returned',
              returnedAt: nowIso(),
            }).catch(() => undefined);
          }
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [user.id, user.name]
  );

  const rejectRequest = useCallback(
    async (requestId: string, reviewNote?: string) => {
      setIsProcessing(true);
      try {
        await updateDoc(requestDoc(requestId), {
          status: 'rejected',
          reviewedAt: nowIso(),
          reviewedBy: user.id || 'admin',
          reviewedByName: user.name || 'System Admin',
          reviewNote: reviewNote?.trim() || null,
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [user.id, user.name]
  );

  return {
    requests,
    pendingRequests,
    pendingCount: pendingRequests.length,
    isLoading,
    isProcessing,
    error,
    approveRequest,
    rejectRequest,
  };
}
