import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { createClientId, FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
import type { Group, GroupMember } from '@/types/api';

function groupCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.groups);
}

function groupDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.groups, id);
}

function groupFromData(id: string, data: Partial<Group>): Group {
  return {
    id,
    congregationId: data.congregationId ?? '',
    name: data.name ?? 'Unnamed group',
    createdAt: data.createdAt ?? nowIso(),
    members: data.members ?? [],
  };
}

export function useCongregationGroups(congregationId: string | null | undefined) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(congregationId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!congregationId) {
      setGroups([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const groupQuery = query(groupCollection(), where('congregationId', '==', congregationId));
    return onSnapshot(
      groupQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        setGroups(
          snapshot.docs
            .map((document) => groupFromData(document.id, document.data() as Partial<Group>))
            .sort((left, right) => left.name.localeCompare(right.name))
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

  return { groups, data: groups, isLoading, error };
}

export function useCreateGroup(congregationId: string) {
  const [isCreating, setIsCreating] = useState(false);
  const create = useCallback(
    async (arg: Record<string, unknown>) => {
      setIsCreating(true);
      try {
        const id = createClientId();
        await setDoc(groupDocument(id), {
          id,
          congregationId,
          name: String(arg.name ?? 'Unnamed group'),
          createdAt: nowIso(),
          members: [],
        } satisfies Group);
        return { id };
      } finally {
        setIsCreating(false);
      }
    },
    [congregationId]
  );
  return { create, isCreating };
}

export function useUpdateGroup(_congregationId: string) {
  const [isUpdating, setIsUpdating] = useState(false);
  const update = useCallback(async (arg: { id: string; name?: string; members?: GroupMember[] }) => {
    setIsUpdating(true);
    try {
      const updates: Record<string, unknown> = {};
      if (arg.name !== undefined) updates.name = arg.name.trim();
      if (arg.members !== undefined) updates.members = arg.members;
      await updateDoc(groupDocument(arg.id), updates);
    } finally {
      setIsUpdating(false);
    }
  }, []);
  return { update, isUpdating };
}

export function useDeleteGroup(_congregationId: string) {
  const [isDeleting, setIsDeleting] = useState(false);
  const remove = useCallback(async (id: string) => {
    setIsDeleting(true);
    try {
      const firestore = getPlannerFirestore();
      const assignments = await getDocs(
        query(collection(firestore, FIRESTORE_COLLECTIONS.assignments), where('serviceGroupId', '==', id))
      );
      const batch = writeBatch(firestore);
      for (const assignment of assignments.docs) {
        batch.update(assignment.ref, { serviceGroupId: null, groupName: null, updatedAt: nowIso() });
      }
      if (!assignments.empty) await batch.commit();
      await deleteDoc(groupDocument(id));
    } finally {
      setIsDeleting(false);
    }
  }, []);
  return { remove, isDeleting };
}
