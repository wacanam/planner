// mobile/src/hooks/useAssignments.ts
import {
  collection,
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
import { canApproveAssignments } from '@/lib/permissions';
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
    endorsementType: data.endorsementType ?? 'assign',
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
    if (!congregationId) {
      setAssignments([]);
      setIsLoading(false);
      return;
    }

    const q = query(assignmentCollection(), where('congregationId', '==', congregationId));

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
  if (!dateStr?.trim()) return nowIso();
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T12:00:00.000Z`);
    return !Number.isNaN(d.getTime()) ? d.toISOString() : nowIso();
  }
  const parsed = new Date(trimmed);
  return !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : nowIso();
}

export function useReturnAssignment() {
  const [isReturning, setIsReturning] = useState(false);

  const returnTerritory = useCallback(
    async (
      assignmentId: string,
      returnedAt?: string | null,
      userRole?: string | null,
      congregationRole?: string | null,
      actorUserId?: string | null,
      actorUserName?: string | null
    ) => {
      setIsReturning(true);
      try {
        const now = nowIso();
        const effectiveReturnedAt = returnedAt ? normalizeDateToIso(returnedAt) : now;
        const firestore = getPlannerFirestore();
        const isDirectApprove = canApproveAssignments(userRole, congregationRole);

        if (assignmentId.startsWith('territory-')) {
          const territoryId = assignmentId.replace('territory-', '');
          const territoryRef = doc(firestore, FIRESTORE_COLLECTIONS.territories, territoryId);
          await updateDoc(territoryRef, {
            status: isDirectApprove ? 'available' : 'pending',
            publisherId: isDirectApprove ? null : undefined,
            publisherName: isDirectApprove ? null : undefined,
            groupId: isDirectApprove ? null : undefined,
            groupName: isDirectApprove ? null : undefined,
            updatedAt: now,
          });
          return;
        }

        const snap = await getDoc(assignmentDocument(assignmentId));
        if (!snap.exists()) throw new Error('Assignment not found');
        const assignment = snap.data() as Assignment;

        if (isDirectApprove) {
          await updateDoc(assignmentDocument(assignmentId), {
            status: AssignmentStatus.COMPLETED,
            endorsementStatus: EndorsementStatus.APPROVED,
            endorsementType: 'return',
            returnedAt: effectiveReturnedAt,
            approvedBy: actorUserId ?? 'Service Overseer',
            approvedByName: actorUserName ?? null,
            approvedAt: now,
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
        } else {
          await updateDoc(assignmentDocument(assignmentId), {
            status: AssignmentStatus.PENDING_APPROVAL,
            endorsementStatus: EndorsementStatus.PENDING_APPROVAL,
            endorsementType: 'return',
            returnedAt: effectiveReturnedAt,
            endorsedBy: actorUserId ?? null,
            endorsedByName: actorUserName ?? null,
            endorsedAt: now,
            updatedAt: now,
          });

          if (assignment.territoryId) {
            const territoryRef = doc(
              firestore,
              FIRESTORE_COLLECTIONS.territories,
              assignment.territoryId
            );
            await updateDoc(territoryRef, {
              status: 'pending',
              updatedAt: now,
            });
          }
        }
      } finally {
        setIsReturning(false);
      }
    },
    []
  );

  return { returnTerritory, isReturning, isPending: isReturning };
}

export function useRevokeTerritory() {
  const [isRevoking, setIsRevoking] = useState(false);

  const revoke = useCallback(
    async (
      territoryId: string,
      revokedAt?: string | null,
      userRole?: string | null,
      congregationRole?: string | null,
      actorUserId?: string | null,
      actorUserName?: string | null
    ) => {
      setIsRevoking(true);
      try {
        const now = nowIso();
        const effectiveReturnedAt = revokedAt ? normalizeDateToIso(revokedAt) : now;
        const firestore = getPlannerFirestore();
        const isDirectApprove = canApproveAssignments(userRole, congregationRole);

        const assignmentsSnap = await getDocs(
          query(
            collection(firestore, FIRESTORE_COLLECTIONS.assignments),
            where('territoryId', '==', territoryId)
          )
        );

        const territoryRef = doc(firestore, FIRESTORE_COLLECTIONS.territories, territoryId);
        const batch = writeBatch(firestore);

        if (isDirectApprove) {
          for (const d of assignmentsSnap.docs) {
            const data = d.data() as Assignment;
            const s = data.status?.toLowerCase().trim();
            const isNotClosed =
              !s ||
              s === 'assigned' ||
              s === 'active' ||
              s === 'pending_approval' ||
              s === 'pending' ||
              s === 'approved' ||
              !data.returnedAt;

            if (isNotClosed) {
              batch.update(d.ref, {
                status: AssignmentStatus.COMPLETED,
                endorsementStatus: EndorsementStatus.APPROVED,
                endorsementType: 'revoke',
                returnedAt: effectiveReturnedAt,
                approvedBy: actorUserId ?? 'Service Overseer',
                approvedByName: actorUserName ?? null,
                approvedAt: now,
                updatedAt: now,
              });
            }
          }

          batch.update(territoryRef, {
            status: 'available',
            publisherId: null,
            publisherName: null,
            groupId: null,
            groupName: null,
            updatedAt: now,
          });

          await batch.commit();
        } else {
          for (const d of assignmentsSnap.docs) {
            const data = d.data() as Assignment;
            const s = data.status?.toLowerCase().trim();
            const isNotClosed =
              !s ||
              s === 'assigned' ||
              s === 'active' ||
              s === 'pending_approval' ||
              s === 'pending' ||
              s === 'approved' ||
              !data.returnedAt;

            if (isNotClosed) {
              batch.update(d.ref, {
                status: AssignmentStatus.PENDING_APPROVAL,
                endorsementStatus: EndorsementStatus.PENDING_APPROVAL,
                endorsementType: 'revoke',
                returnedAt: effectiveReturnedAt,
                endorsedBy: actorUserId ?? null,
                endorsedByName: actorUserName ?? null,
                endorsedAt: now,
                updatedAt: now,
              });
            }
          }

          batch.update(territoryRef, {
            status: 'pending',
            updatedAt: now,
          });

          await batch.commit();
        }
      } finally {
        setIsRevoking(false);
      }
    },
    []
  );

  return { revoke, isRevoking, isPending: isRevoking };
}

export function useUpdateAssignment() {
  const [isUpdating, setIsUpdating] = useState(false);

  const update = useCallback(async (arg: { id: string } & Record<string, unknown>) => {
    const { id, ...body } = arg;
    setIsUpdating(true);
    try {
      const now = nowIso();
      const payload: Record<string, unknown> = { ...body, updatedAt: now };
      if ('assignedAt' in payload && typeof payload.assignedAt === 'string' && payload.assignedAt) {
        payload.assignedAt = normalizeDateToIso(payload.assignedAt);
      }
      if ('returnedAt' in payload && typeof payload.returnedAt === 'string' && payload.returnedAt) {
        payload.returnedAt = normalizeDateToIso(payload.returnedAt);
      }
      if ('dueAt' in payload && typeof payload.dueAt === 'string' && payload.dueAt) {
        payload.dueAt = normalizeDateToIso(payload.dueAt);
      }

      const firestore = getPlannerFirestore();
      const assignmentRef = assignmentDocument(id);
      const snap = await getDoc(assignmentRef);
      const prevData = snap.exists() ? (snap.data() as Partial<Assignment>) : null;

      await updateDoc(assignmentRef, payload);

      // Parent territory status synchronization
      if (prevData?.territoryId && 'status' in payload && typeof payload.status === 'string') {
        const newStatus = payload.status.toLowerCase().trim();
        const territoryRef = doc(
          firestore,
          FIRESTORE_COLLECTIONS.territories,
          prevData.territoryId
        );
        const tSnap = await getDoc(territoryRef);
        if (tSnap.exists()) {
          if (
            newStatus === 'completed' ||
            newStatus === 'returned' ||
            newStatus === 'rejected'
          ) {
            await updateDoc(territoryRef, {
              status: 'available',
              publisherId: null,
              publisherName: null,
              groupId: null,
              groupName: null,
              updatedAt: now,
            });
          } else if (newStatus === 'active' || newStatus === 'assigned') {
            await updateDoc(territoryRef, {
              status: 'assigned',
              publisherId: (payload.userId as string) ?? prevData.userId ?? null,
              publisherName: (payload.assigneeName as string) ?? prevData.assigneeName ?? null,
              groupId: (payload.serviceGroupId as string) ?? prevData.serviceGroupId ?? null,
              groupName: (payload.groupName as string) ?? prevData.groupName ?? null,
              updatedAt: now,
            });
          } else if (newStatus === 'pending_approval' || newStatus === 'pending') {
            await updateDoc(territoryRef, {
              status: 'pending',
              publisherId: (payload.userId as string) ?? prevData.userId ?? null,
              publisherName: (payload.assigneeName as string) ?? prevData.assigneeName ?? null,
              groupId: (payload.serviceGroupId as string) ?? prevData.serviceGroupId ?? null,
              groupName: (payload.groupName as string) ?? prevData.groupName ?? null,
              updatedAt: now,
            });
          }
        }
      }
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return { update, isUpdating, isPending: isUpdating };
}

export function useCreateAssignment() {
  const [isCreating, setIsCreating] = useState(false);

  const create = useCallback(
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
      creatorRole?: string | null;
      creatorCongregationRole?: string | null;
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

        const isDirectApproval = canApproveAssignments(
          arg.creatorRole,
          arg.creatorCongregationRole
        );

        const assignmentDoc: Assignment = {
          id,
          territoryId: arg.territoryId,
          congregationId: arg.congregationId || null,
          userId: arg.userId ?? null,
          serviceGroupId: arg.serviceGroupId ?? null,
          status: isDirectApproval ? AssignmentStatus.ACTIVE : AssignmentStatus.PENDING_APPROVAL,
          endorsementStatus: isDirectApproval
            ? EndorsementStatus.APPROVED
            : EndorsementStatus.PENDING_APPROVAL,
          endorsementType: 'assign',
          endorsedBy: isDirectApproval ? null : (arg.endorsedByUserId ?? null),
          endorsedByName: isDirectApproval ? null : (arg.endorsedByUserName ?? null),
          endorsedAt: isDirectApproval ? null : now,
          approvedBy: isDirectApproval ? (arg.endorsedByUserId ?? 'Service Overseer') : null,
          approvedByName: isDirectApproval ? (arg.endorsedByUserName ?? 'Service Overseer') : null,
          approvedAt: isDirectApproval ? now : null,
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
          status: isDirectApproval ? 'assigned' : 'pending',
          publisherId: arg.userId ?? null,
          publisherName: arg.assigneeName ?? null,
          groupId: arg.serviceGroupId ?? null,
          groupName: arg.groupName ?? null,
          updatedAt: now,
        });

        // Auto-resolve any pending requests if direct approved
        if (isDirectApproval && arg.territoryId) {
          try {
            const pendingReqs = await getDocs(
              query(
                collection(firestore, FIRESTORE_COLLECTIONS.territoryRequests),
                where('territoryId', '==', arg.territoryId),
                where('status', '==', 'pending')
              )
            );
            for (const reqDoc of pendingReqs.docs) {
              const reqData = reqDoc.data();
              const isTargetUser = arg.userId && reqData.publisherId === arg.userId;
              await updateDoc(reqDoc.ref, {
                status: isTargetUser ? 'approved' : 'rejected',
                reviewNotes: isTargetUser ? null : 'Territory assigned to another publisher',
                reviewedAt: now,
                updatedAt: now,
              });
            }
          } catch (reqErr) {
            console.warn('Failed to auto-resolve territory requests on assignment:', reqErr);
          }
        }

        return { id, isDirectApproval };
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  return { create, endorse: create, isCreating, isPending: isCreating };
}
