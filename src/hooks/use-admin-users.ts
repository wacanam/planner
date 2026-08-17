'use client';

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
import type { User } from '@/types/api';

function usersCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.users);
}

function userDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.users, id);
}

function userFromData(id: string, data: Partial<User>): User {
  const now = nowIso();
  return {
    id,
    name: data.name ?? 'Unknown User',
    email: data.email ?? '',
    role: data.role ?? 'USER',
    congregationId: data.congregationId ?? null,
    groupId: data.groupId ?? null,
    isActive: data.isActive !== false,
    avatarUrl: data.avatarUrl ?? data.image ?? null,
    image: data.image ?? data.avatarUrl ?? null,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  };
}

export function useAdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    return onSnapshot(
      usersCollection(),
      { includeMetadataChanges: true },
      (snapshot) => {
        const list = snapshot.docs.map((d) =>
          userFromData(d.id, d.data() as Partial<User>)
        );
        list.sort((a, b) => a.name.localeCompare(b.name));
        setUsers(list);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, []);

  const updateUserRole = useCallback(async (userId: string, newRole: string) => {
    setIsProcessing(true);
    try {
      const db = getPlannerFirestore();
      await updateDoc(userDocument(userId), {
        role: newRole,
        updatedAt: nowIso(),
      });

      // If user has a congregation member record, sync system role if applicable
      const memberRef = doc(db, FIRESTORE_COLLECTIONS.congregationMembers, userId);
      const memberSnap = await getDoc(memberRef);
      if (memberSnap.exists()) {
        await updateDoc(memberRef, {
          role: newRole,
          updatedAt: nowIso(),
        }).catch(() => undefined);
      }
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const toggleUserStatus = useCallback(async (userId: string, isActive: boolean) => {
    setIsProcessing(true);
    try {
      const db = getPlannerFirestore();
      await updateDoc(userDocument(userId), {
        isActive,
        updatedAt: nowIso(),
      });

      const memberRef = doc(db, FIRESTORE_COLLECTIONS.congregationMembers, userId);
      const memberSnap = await getDoc(memberRef);
      if (memberSnap.exists()) {
        await updateDoc(memberRef, {
          status: isActive ? 'active' : 'inactive',
          updatedAt: nowIso(),
        }).catch(() => undefined);
      }
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const unlinkUserCongregation = useCallback(async (userId: string, congregationId?: string | null) => {
    setIsProcessing(true);
    try {
      const db = getPlannerFirestore();
      await updateDoc(userDocument(userId), {
        congregationId: null,
        groupId: null,
        updatedAt: nowIso(),
      });

      const memberRef = doc(db, FIRESTORE_COLLECTIONS.congregationMembers, userId);
      await deleteDoc(memberRef).catch(() => undefined);

      if (congregationId) {
        const groupsSnap = await getDocs(
          query(
            collection(db, FIRESTORE_COLLECTIONS.groups),
            where('congregationId', '==', congregationId)
          )
        );
        for (const gDoc of groupsSnap.docs) {
          const gData = gDoc.data();
          const members = (gData.members || []).filter(
            (m: any) => m.userId !== userId && m.id !== userId
          );
          await updateDoc(gDoc.ref, { members }).catch(() => undefined);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const deleteUserRecord = useCallback(async (userId: string) => {
    setIsProcessing(true);
    try {
      const db = getPlannerFirestore();
      await deleteDoc(userDocument(userId));
      const memberRef = doc(db, FIRESTORE_COLLECTIONS.congregationMembers, userId);
      await deleteDoc(memberRef).catch(() => undefined);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    users,
    isLoading,
    isProcessing,
    error,
    updateUserRole,
    toggleUserStatus,
    unlinkUserCongregation,
    deleteUserRecord,
  };
}
