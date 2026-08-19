// mobile/src/hooks/useCongregationGroups.ts
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
import {
  createClientId,
  FIRESTORE_COLLECTIONS,
  getPlannerFirestore,
  nowIso,
} from '@/lib/firebase';
import type { Group } from '@/types/api';

function groupCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.groups);
}

function groupDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.groups, id);
}

function groupFromData(id: string, data: Partial<Group>): Group {
  const now = nowIso();
  return {
    id,
    congregationId: data.congregationId ?? '',
    name: data.name ?? 'Group',
    overseerId: data.overseerId ?? null,
    overseerName: data.overseerName ?? null,
    assistantOverseerId: data.assistantOverseerId ?? null,
    assistantOverseerName: data.assistantOverseerName ?? null,
    createdAt: data.createdAt ?? now,
    members: Array.isArray(data.members) ? data.members : [],
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
    const q = query(groupCollection(), where('congregationId', '==', congregationId));
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => groupFromData(d.id, d.data() as Partial<Group>))
          .sort((a, b) => a.name.localeCompare(b.name));
        setGroups(list);
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
    async (
      name: string,
      overseerId?: string | null,
      overseerName?: string | null,
      assistantOverseerId?: string | null,
      assistantOverseerName?: string | null
    ) => {
      setIsCreating(true);
      try {
        const now = nowIso();
        const id = createClientId();
        const docData: Group = {
          id,
          congregationId,
          name: name.trim(),
          overseerId: overseerId || null,
          overseerName: overseerName || null,
          assistantOverseerId: assistantOverseerId || null,
          assistantOverseerName: assistantOverseerName || null,
          createdAt: now,
          members: [],
        };
        await setDoc(groupDocument(id), docData);
        return { id };
      } finally {
        setIsCreating(false);
      }
    },
    [congregationId]
  );

  return { create, isCreating };
}

export function useUpdateGroup() {
  const [isUpdating, setIsUpdating] = useState(false);

  const update = useCallback(
    async (
      id: string,
      updates: {
        name?: string;
        overseerId?: string | null;
        overseerName?: string | null;
        assistantOverseerId?: string | null;
        assistantOverseerName?: string | null;
      }
    ) => {
      setIsUpdating(true);
      try {
        const payload: Record<string, unknown> = {
          ...updates,
          updatedAt: nowIso(),
        };
        await updateDoc(groupDocument(id), payload);
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  return { update, isUpdating };
}

export function useDeleteGroup() {
  const [isDeleting, setIsDeleting] = useState(false);

  const remove = useCallback(async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteDoc(groupDocument(id));
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { remove, isDeleting };
}
