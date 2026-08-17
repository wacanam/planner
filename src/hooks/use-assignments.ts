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
import { getPlannerFirestore } from '@/lib/firebase/client';
import { createClientId, FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
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
    userId: data.userId ?? null,
    serviceGroupId: data.serviceGroupId ?? null,
    status: data.status ?? AssignmentStatus.ACTIVE,
    endorsementStatus: data.endorsementStatus ?? 'approved',
    endorsedBy: data.endorsedBy ?? null,
    endorsedAt: data.endorsedAt ?? null,
    approvedBy: data.approvedBy ?? null,
    approvedAt: data.approvedAt ?? null,
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

export function useMyAssignments(_congregationId?: string) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(assignmentCollection());
    return onSnapshot(
      q,
      (snapshot) => {
        setAssignments(
          snapshot.docs
            .map((document) =>
              assignmentFromData(document.id, document.data() as Partial<Assignment>)
            )
            .sort((left, right) => (right.assignedAt ?? '').localeCompare(left.assignedAt ?? ''))
        );
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      }
    );
  }, []);

  return { assignments, data: assignments, isLoading };
}

export function usePendingEndorsements(_congregationId?: string) {
  const [pending, setPending] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(
      assignmentCollection(),
      where('endorsementStatus', '==', EndorsementStatus.PENDING_APPROVAL)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        setPending(
          snapshot.docs.map((d) => assignmentFromData(d.id, d.data() as Partial<Assignment>))
        );
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching pending endorsements:', err);
        setIsLoading(false);
      }
    );
  }, []);

  return { pending, endorsements: pending, count: pending.length, isLoading };
}

export function useCreateAssignment() {
  const [isCreating, setIsCreating] = useState(false);

  /**
   * Territory Servant assigns and endorses territory -> status becomes pending_approval.
   */
  const endorse = useCallback(
    async (arg: {
      territoryId: string;
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
    }) => {
      setIsCreating(true);
      try {
        const now = nowIso();
        const id = createClientId();
        const territoryId = arg.territoryId;

        const assignmentDoc: Assignment = {
          id,
          territoryId,
          userId: arg.userId ?? null,
          serviceGroupId: arg.serviceGroupId ?? null,
          status: AssignmentStatus.PENDING_APPROVAL,
          endorsementStatus: EndorsementStatus.PENDING_APPROVAL,
          endorsedBy: arg.endorsedByUserId ?? null,
          endorsedAt: now,
          approvedBy: null,
          approvedAt: null,
          assignedAt: arg.assignedAt ?? now,
          dueAt: arg.dueAt ?? null,
          returnedAt: null,
          notes: arg.notes ?? null,
          coverageAtAssignment: '0',
          createdAt: now,
          assigneeName: arg.assigneeName ?? null,
          assigneeEmail: arg.assigneeEmail ?? null,
          groupName: arg.groupName ?? null,
        };

        await setDoc(assignmentDocument(id), assignmentDoc);

        // Also mark territory as pending
        await updateDoc(
          doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.territories, territoryId),
          {
            status: 'pending',
            publisherId: arg.userId ?? null,
            publisherName: arg.assigneeName ?? null,
            groupId: arg.serviceGroupId ?? null,
            groupName: arg.groupName ?? null,
            updatedAt: now,
          }
        );

        return { id };
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  return { create: endorse, endorse, isCreating, isPending: isCreating };
}

export function useApproveAssignment(_congregationId?: string) {
  const [isApproving, setIsApproving] = useState(false);

  const approve = useCallback(
    async (
      arg: string | { assignmentId: string; approved?: boolean },
      approvedByUserId?: string,
      _approvedByUserName?: string
    ) => {
      const assignmentId = typeof arg === 'string' ? arg : arg.assignmentId;
      const isApproved = typeof arg === 'string' ? true : (arg.approved ?? true);
      setIsApproving(true);
      try {
        const now = nowIso();
        const snap = await getDoc(assignmentDocument(assignmentId));
        if (!snap.exists()) throw new Error('Assignment not found');
        const assignment = snap.data() as Assignment;

        if (isApproved) {
          await updateDoc(assignmentDocument(assignmentId), {
            status: AssignmentStatus.ACTIVE,
            endorsementStatus: EndorsementStatus.APPROVED,
            approvedBy: approvedByUserId ?? 'Overseer',
            approvedAt: now,
            updatedAt: now,
          });

          if (assignment.territoryId) {
            await updateDoc(
              doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.territories, assignment.territoryId),
              {
                status: 'assigned',
                publisherId: assignment.userId,
                publisherName: assignment.assigneeName,
                groupId: assignment.serviceGroupId,
                groupName: assignment.groupName,
                updatedAt: now,
              }
            );
          }
        }
      } finally {
        setIsApproving(false);
      }
    },
    []
  );

  const reject = useCallback(async (assignmentId: string, reason?: string) => {
    setIsApproving(true);
    try {
      const now = nowIso();
      const snap = await getDoc(assignmentDocument(assignmentId));
      if (!snap.exists()) throw new Error('Assignment not found');
      const assignment = snap.data() as Assignment;

      await updateDoc(assignmentDocument(assignmentId), {
        status: AssignmentStatus.REJECTED,
        endorsementStatus: EndorsementStatus.REJECTED,
        rejectionReason: reason ?? null,
        updatedAt: now,
      });

      if (assignment.territoryId) {
        await updateDoc(
          doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.territories, assignment.territoryId),
          {
            status: 'available',
            publisherId: null,
            publisherName: null,
            groupId: null,
            groupName: null,
            updatedAt: now,
          }
        );
      }
    } finally {
      setIsApproving(false);
    }
  }, []);

  return { approve, reject, isApproving, isPending: isApproving };
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
        await updateDoc(
          doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.territories, assignment.territoryId),
          {
            status: 'available',
            publisherId: null,
            publisherName: null,
            groupId: null,
            groupName: null,
            updatedAt: nowIso(),
          }
        );
      }
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { remove, isDeleting };
}

/**
 * Assignee or Group member checks in / returns the assigned territory.
 */
export function useReturnAssignment() {
  const [isReturning, setIsReturning] = useState(false);

  const returnTerritory = useCallback(async (assignmentId: string) => {
    setIsReturning(true);
    try {
      const now = nowIso();
      const snap = await getDoc(assignmentDocument(assignmentId));
      if (!snap.exists()) throw new Error('Assignment not found');
      const assignment = snap.data() as Assignment;

      await updateDoc(assignmentDocument(assignmentId), {
        status: AssignmentStatus.COMPLETED,
        returnedAt: now,
        updatedAt: now,
      });

      if (assignment.territoryId) {
        await updateDoc(
          doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.territories, assignment.territoryId),
          {
            status: 'available',
            publisherId: null,
            publisherName: null,
            groupId: null,
            groupName: null,
            updatedAt: now,
          }
        );
      }
    } finally {
      setIsReturning(false);
    }
  }, []);

  return { returnTerritory, isReturning, isPending: isReturning };
}

/**
 * Service Overseer / Territory Servant revokes the active/pending territory assignment.
 */
export function useRevokeTerritory() {
  const [isRevoking, setIsRevoking] = useState(false);

  const revoke = useCallback(async (territoryId: string) => {
    setIsRevoking(true);
    try {
      const now = nowIso();
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
            returnedAt: now,
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
