// mobile/src/hooks/useAssignments.ts
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
  writeBatch,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { createClientId, FIRESTORE_COLLECTIONS, getPlannerFirestore, nowIso } from '@/lib/firebase';
import { AssignmentStatus, EndorsementStatus } from '@/lib/roles';
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
    congregationId: data.congregationId ?? null,
    userId: data.userId ?? null,
    serviceGroupId: data.serviceGroupId ?? null,
    status: data.status ?? AssignmentStatus.ACTIVE,
    endorsementStatus: data.endorsementStatus ?? 'approved',
    endorsedBy: data.endorsedBy ?? null,
    endorsedByName: data.endorsedByName ?? null,
    endorsedAt: data.endorsedAt ?? null,
    approvedBy: data.approvedBy ?? null,
    approvedByName: data.approvedByName ?? null,
    approvedAt: data.approvedAt ?? null,
    rejectedBy: data.rejectedBy ?? null,
    rejectedByName: data.rejectedByName ?? null,
    rejectedAt: data.rejectedAt ?? null,
    rejectionReason: data.rejectionReason ?? null,
    assignedAt: data.assignedAt ?? null,
    dueAt: data.dueAt ?? null,
    returnedAt: data.returnedAt ?? null,
    notes: data.notes ?? null,
    coverageAtAssignment: String(data.coverageAtAssignment ?? '0'),
    createdAt: data.createdAt ?? now,
    assigneeName: data.assigneeName ?? null,
    assigneeEmail: data.assigneeEmail ?? null,
    groupName: data.groupName ?? null,
    territoryName: data.territoryName ?? null,
    territoryNumber: data.territoryNumber ?? null,
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
            .map((document) =>
              assignmentFromData(document.id, document.data() as Partial<Assignment>)
            )
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

export function useMyAssignments(congregationId?: string | null) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (congregationId === undefined) {
      setAssignments([]);
      setIsLoading(false);
      return;
    }

    const q = congregationId
      ? query(assignmentCollection(), where('congregationId', '==', congregationId))
      : query(assignmentCollection());

    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((document) =>
            assignmentFromData(document.id, document.data() as Partial<Assignment>)
          )
          .sort((left, right) => (right.assignedAt ?? '').localeCompare(left.assignedAt ?? ''));
        setAssignments(list);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      }
    );
  }, [congregationId]);

  return { assignments, data: assignments, isLoading };
}

export function normalizeDateToIso(dateStr?: string | null): string {
  if (!dateStr || !dateStr.trim()) return nowIso();
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T12:00:00.000Z`);
    return !isNaN(d.getTime()) ? d.toISOString() : nowIso();
  }
  const parsed = new Date(trimmed);
  return !isNaN(parsed.getTime()) ? parsed.toISOString() : nowIso();
}

export function useReturnAssignment() {
  const [isReturning, setIsReturning] = useState(false);

  const returnTerritory = useCallback(async (assignmentId: string, returnedAt?: string | null) => {
    setIsReturning(true);
    try {
      const now = nowIso();
      const effectiveReturnedAt = returnedAt ? normalizeDateToIso(returnedAt) : now;
      const firestore = getPlannerFirestore();

      if (assignmentId.startsWith('territory-')) {
        const territoryId = assignmentId.replace('territory-', '');
        const territoryRef = doc(firestore, FIRESTORE_COLLECTIONS.territories, territoryId);
        await updateDoc(territoryRef, {
          status: 'available',
          publisherId: null,
          publisherName: null,
          groupId: null,
          groupName: null,
          updatedAt: now,
        });
        return;
      }

      const snap = await getDoc(assignmentDocument(assignmentId));
      if (!snap.exists()) throw new Error('Assignment not found');
      const assignment = snap.data() as Assignment;

      await updateDoc(assignmentDocument(assignmentId), {
        status: AssignmentStatus.COMPLETED,
        returnedAt: effectiveReturnedAt,
        updatedAt: now,
      });

      if (assignment.territoryId) {
        const territoryRef = doc(
          firestore,
          FIRESTORE_COLLECTIONS.territories,
          assignment.territoryId
        );
        await updateDoc(territoryRef, {
          status: 'available',
          publisherId: null,
          publisherName: null,
          groupId: null,
          groupName: null,
          updatedAt: now,
        });
      }
    } finally {
      setIsReturning(false);
    }
  }, []);

  return { returnTerritory, isReturning, isPending: isReturning };
}

export function useRevokeTerritory() {
  const [isRevoking, setIsRevoking] = useState(false);

  const revoke = useCallback(async (territoryId: string, revokedAt?: string | null) => {
    setIsRevoking(true);
    try {
      const now = nowIso();
      const effectiveReturnedAt = revokedAt ? normalizeDateToIso(revokedAt) : now;
      const firestore = getPlannerFirestore();

      const assignmentsSnap = await getDocs(
        query(
          collection(firestore, FIRESTORE_COLLECTIONS.assignments),
          where('territoryId', '==', territoryId)
        )
      );

      const batch = writeBatch(firestore);
      for (const d of assignmentsSnap.docs) {
        const data = d.data() as Assignment;
        if (
          data.status === 'assigned' ||
          data.status === 'active' ||
          data.status === 'pending_approval' ||
          data.status === AssignmentStatus.PENDING_APPROVAL ||
          data.status === AssignmentStatus.ACTIVE
        ) {
          batch.update(d.ref, {
            status: AssignmentStatus.COMPLETED,
            returnedAt: effectiveReturnedAt,
            updatedAt: now,
          });
        }
      }

      batch.update(doc(firestore, FIRESTORE_COLLECTIONS.territories, territoryId), {
        status: 'available',
        publisherId: null,
        publisherName: null,
        groupId: null,
        groupName: null,
        updatedAt: now,
      });

      await batch.commit();
    } finally {
      setIsRevoking(false);
    }
  }, []);

  return { revoke, isRevoking, isPending: isRevoking };
}

export function useUpdateAssignment() {
  const [isUpdating, setIsUpdating] = useState(false);

  const update = useCallback(async (arg: { id: string } & Record<string, unknown>) => {
    const { id, ...body } = arg;
    setIsUpdating(true);
    try {
      const payload: Record<string, unknown> = { ...body, updatedAt: nowIso() };
      if ('assignedAt' in payload && typeof payload.assignedAt === 'string') {
        payload.assignedAt = normalizeDateToIso(payload.assignedAt);
      }
      if ('returnedAt' in payload && typeof payload.returnedAt === 'string' && payload.returnedAt) {
        payload.returnedAt = normalizeDateToIso(payload.returnedAt);
      }
      if ('dueAt' in payload && typeof payload.dueAt === 'string' && payload.dueAt) {
        payload.dueAt = normalizeDateToIso(payload.dueAt);
      }
      await updateDoc(assignmentDocument(id), payload);
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return { update, isUpdating, isPending: isUpdating };
}

export function useCreateAssignment() {
  const [isCreating, setIsCreating] = useState(false);

  const endorse = useCallback(
    async (arg: {
      territoryId: string;
      congregationId?: string | null;
      userId?: string | null;
      serviceGroupId?: string | null;
      assigneeName?: string | null;
      assigneeEmail?: string | null;
      groupName?: string | null;
      assignedAt?: string | null;
      dueAt?: string | null;
      notes?: string | null;
      endorsedByUserId?: string | null;
      endorsedByUserName?: string | null;
      territoryName?: string | null;
      territoryNumber?: string | null;
    }) => {
      setIsCreating(true);
      try {
        const now = nowIso();
        const id = createClientId();
        const firestore = getPlannerFirestore();

        const effectiveAssignedAt = arg.assignedAt ? normalizeDateToIso(arg.assignedAt) : now;
        const effectiveDueAt = arg.dueAt ? normalizeDateToIso(arg.dueAt) : null;

        const assignmentDoc: Assignment = {
          id,
          territoryId: arg.territoryId,
          congregationId: arg.congregationId || null,
          userId: arg.userId ?? null,
          serviceGroupId: arg.serviceGroupId ?? null,
          status: AssignmentStatus.ACTIVE,
          endorsementStatus: EndorsementStatus.APPROVED,
          endorsedBy: arg.endorsedByUserId ?? null,
          endorsedByName: arg.endorsedByUserName ?? null,
          endorsedAt: now,
          approvedBy: arg.endorsedByUserId ?? null,
          approvedByName: arg.endorsedByUserName ?? null,
          approvedAt: now,
          rejectedBy: null,
          rejectedByName: null,
          rejectedAt: null,
          rejectionReason: null,
          assignedAt: effectiveAssignedAt,
          dueAt: effectiveDueAt,
          returnedAt: null,
          notes: arg.notes ?? null,
          coverageAtAssignment: '0',
          createdAt: now,
          assigneeName: arg.assigneeName ?? null,
          assigneeEmail: arg.assigneeEmail ?? null,
          groupName: arg.groupName ?? null,
          territoryName: arg.territoryName || '',
          territoryNumber: arg.territoryNumber || '',
        };

        await setDoc(assignmentDocument(id), assignmentDoc);

        const territoryRef = doc(firestore, FIRESTORE_COLLECTIONS.territories, arg.territoryId);
        await updateDoc(territoryRef, {
          status: 'assigned',
          publisherId: arg.userId ?? null,
          publisherName: arg.assigneeName ?? null,
          groupId: arg.serviceGroupId ?? null,
          groupName: arg.groupName ?? null,
          updatedAt: now,
        });

        return { id };
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  return { create: endorse, endorse, isCreating, isPending: isCreating };
}
