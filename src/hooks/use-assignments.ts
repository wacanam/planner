import { useCallback, useEffect, useState } from 'react';
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
import { getPlannerFirestore } from '@/lib/firebase/client';
import { createClientId, FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
import type { Assignment } from '@/types/api';

function assignmentCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.assignments);
}

function assignmentDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.assignments, id);
}

function assignmentFromData(id: string, data: Partial<Assignment>): Assignment {
  const now = nowIso();
  return {
    id,
    territoryId: data.territoryId ?? '',
    userId: data.userId ?? null,
    serviceGroupId: data.serviceGroupId ?? null,
    status: data.status ?? 'assigned',
    assignedAt: data.assignedAt ?? null,
    dueAt: data.dueAt ?? null,
    returnedAt: data.returnedAt ?? null,
    notes: data.notes ?? null,
    coverageAtAssignment: String(data.coverageAtAssignment ?? '0'),
    createdAt: data.createdAt ?? now,
    assigneeName: data.assigneeName ?? null,
    assigneeEmail: data.assigneeEmail ?? null,
    groupName: data.groupName ?? null,
  };
}

export function useTerritoryAssignments(territoryId: string | null | undefined) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(territoryId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!territoryId) {
      setAssignments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const assignmentQuery = query(assignmentCollection(), where('territoryId', '==', territoryId));
    return onSnapshot(
      assignmentQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        setAssignments(
          snapshot.docs
            .map((document) => assignmentFromData(document.id, document.data() as Partial<Assignment>))
            .sort((left, right) => (right.assignedAt ?? '').localeCompare(left.assignedAt ?? ''))
        );
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [territoryId]);

  return { assignments, data: assignments, isLoading, error };
}

export function useCreateAssignment() {
  const [isCreating, setIsCreating] = useState(false);

  const create = useCallback(async (arg: Record<string, unknown>) => {
    setIsCreating(true);
    try {
      const now = nowIso();
      const id = createClientId();
      const territoryId = String(arg.territoryId ?? '');
      await setDoc(assignmentDocument(id), {
        id,
        territoryId,
        userId: arg.userId ? String(arg.userId) : null,
        serviceGroupId: arg.serviceGroupId ? String(arg.serviceGroupId) : null,
        status: String(arg.status ?? 'assigned'),
        assignedAt: (arg.assignedAt as string | null | undefined) ?? now,
        dueAt: (arg.dueAt as string | null | undefined) ?? null,
        returnedAt: null,
        notes: (arg.notes as string | null | undefined) ?? null,
        coverageAtAssignment: String(arg.coverageAtAssignment ?? '0'),
        createdAt: now,
        assigneeName: (arg.assigneeName as string | null | undefined) ?? null,
        assigneeEmail: (arg.assigneeEmail as string | null | undefined) ?? null,
        groupName: (arg.groupName as string | null | undefined) ?? null,
      } satisfies Assignment);
      if (territoryId) {
        await updateDoc(doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.territories, territoryId), {
          status: 'assigned',
          publisherId: arg.userId ? String(arg.userId) : null,
          publisherName: (arg.assigneeName as string | null | undefined) ?? null,
          groupId: arg.serviceGroupId ? String(arg.serviceGroupId) : null,
          groupName: (arg.groupName as string | null | undefined) ?? null,
          updatedAt: now,
        });
      }
      return { id };
    } finally {
      setIsCreating(false);
    }
  }, []);

  return { create, isCreating };
}

export function useUpdateAssignment() {
  const [isUpdating, setIsUpdating] = useState(false);

  const update = useCallback(async (arg: { id: string } & Record<string, unknown>) => {
    const { id, ...body } = arg;
    setIsUpdating(true);
    try {
      await updateDoc(assignmentDocument(id), { ...body, updatedAt: nowIso() });
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return { update, isUpdating };
}

export function useDeleteAssignment() {
  const [isDeleting, setIsDeleting] = useState(false);

  const remove = useCallback(async (id: string) => {
    setIsDeleting(true);
    try {
      const snapshot = await getDoc(assignmentDocument(id));
      const assignment = snapshot.exists() ? (snapshot.data() as Partial<Assignment>) : null;
      await deleteDoc(assignmentDocument(id));
      if (assignment?.territoryId) {
        await updateDoc(doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.territories, assignment.territoryId), {
          status: 'available',
          publisherId: null,
          publisherName: null,
          groupId: null,
          groupName: null,
          updatedAt: nowIso(),
        });
      }
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { remove, isDeleting };
}