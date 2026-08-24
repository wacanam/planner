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
import { createInAppNotification, notifyCongregationOverseers } from '@/lib/notifications';
import { AssignmentStatus, EndorsementStatus, NotificationType } from '@/lib/roles';
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

export function usePendingEndorsements(congregationId?: string | null) {
  const [pending, setPending] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!congregationId) {
      setPending([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      assignmentCollection(),
      where('congregationId', '==', congregationId),
      where('endorsementStatus', '==', EndorsementStatus.PENDING_APPROVAL)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        setPending(
          snapshot.docs
            .map((d) => assignmentFromData(d.id, d.data() as Partial<Assignment>))
            .sort((a, b) =>
              (b.endorsedAt || b.createdAt || '').localeCompare(a.endorsedAt || a.createdAt || '')
            )
        );
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching pending endorsements:', err);
        setIsLoading(false);
      }
    );
  }, [congregationId]);

  return { pending, endorsements: pending, count: pending.length, isLoading };
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

export function useCreateAssignment() {
  const [isCreating, setIsCreating] = useState(false);

  /**
   * Territory Servant assigns and endorses territory -> status becomes pending_approval.
   */
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
        const territoryId = arg.territoryId;
        const firestore = getPlannerFirestore();

        // Fetch territory info for notification context and update territory status
        const territoryRef = doc(firestore, FIRESTORE_COLLECTIONS.territories, territoryId);
        const territorySnap = await getDoc(territoryRef);
        const territoryData = territorySnap.exists() ? territorySnap.data() : null;
        const congId = arg.congregationId || territoryData?.congregationId || null;
        const territoryNumber = arg.territoryNumber || territoryData?.number || territoryId;
        const territoryName = arg.territoryName || territoryData?.name || '';

        const effectiveAssignedAt = arg.assignedAt ? normalizeDateToIso(arg.assignedAt) : now;
        const effectiveDueAt = arg.dueAt ? normalizeDateToIso(arg.dueAt) : null;

        const assignmentDoc: Assignment = {
          id,
          territoryId,
          congregationId: congId,
          userId: arg.userId ?? null,
          serviceGroupId: arg.serviceGroupId ?? null,
          status: AssignmentStatus.PENDING_APPROVAL,
          endorsementStatus: EndorsementStatus.PENDING_APPROVAL,
          endorsedBy: arg.endorsedByUserId ?? null,
          endorsedByName: arg.endorsedByUserName ?? null,
          endorsedAt: now,
          approvedBy: null,
          approvedByName: null,
          approvedAt: null,
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
          territoryName,
          territoryNumber,
        };

        await setDoc(assignmentDocument(id), assignmentDoc);

        // Also mark territory as pending
        await updateDoc(territoryRef, {
          status: 'pending',
          publisherId: arg.userId ?? null,
          publisherName: arg.assigneeName ?? null,
          groupId: arg.serviceGroupId ?? null,
          groupName: arg.groupName ?? null,
          updatedAt: now,
        });

        // Notify congregation service overseers
        if (congId) {
          try {
            const endorserLabel = arg.endorsedByUserName ? ` by ${arg.endorsedByUserName}` : '';
            const targetLabel = arg.assigneeName || arg.groupName || 'A publisher';
            await notifyCongregationOverseers(firestore, congId, {
              type: NotificationType.TERRITORY_ENDORSED,
              title: 'New Territory Endorsement',
              body: `${targetLabel} was endorsed for Territory #${territoryNumber}${endorserLabel}.`,
              data: {
                congregationId: congId,
                territoryId,
                assignmentId: id,
                territoryNumber,
                territoryName,
                endorsedByUserId: arg.endorsedByUserId,
                endorsedByUserName: arg.endorsedByUserName,
                assigneeName: arg.assigneeName,
                groupName: arg.groupName,
              },
              excludeUserId: arg.endorsedByUserId,
            });
          } catch (notifErr) {
            console.error('Failed to notify overseers of territory endorsement:', notifErr);
          }
        }

        return { id };
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  return { create: endorse, endorse, isCreating, isPending: isCreating };
}

export function useApproveAssignment(congregationId?: string) {
  const [isApproving, setIsApproving] = useState(false);

  const approve = useCallback(
    async (
      arg: string | { assignmentId: string; approved?: boolean },
      approvedByUserId?: string,
      approvedByUserName?: string
    ) => {
      const assignmentId = typeof arg === 'string' ? arg : arg.assignmentId;
      const isApproved = typeof arg === 'string' ? true : (arg.approved ?? true);
      setIsApproving(true);
      try {
        const now = nowIso();
        const firestore = getPlannerFirestore();
        const snap = await getDoc(assignmentDocument(assignmentId));
        if (!snap.exists()) throw new Error('Assignment not found');
        const assignment = snap.data() as Assignment;

        if (isApproved) {
          await updateDoc(assignmentDocument(assignmentId), {
            status: AssignmentStatus.ACTIVE,
            endorsementStatus: EndorsementStatus.APPROVED,
            approvedBy: approvedByUserId ?? 'Overseer',
            approvedByName: approvedByUserName ?? null,
            approvedAt: now,
            updatedAt: now,
          });

          let territoryNumber = assignment.territoryNumber || '';
          let congId = assignment.congregationId || congregationId;

          if (assignment.territoryId) {
            const territoryRef = doc(
              firestore,
              FIRESTORE_COLLECTIONS.territories,
              assignment.territoryId
            );
            const territorySnap = await getDoc(territoryRef);
            if (territorySnap.exists()) {
              const tData = territorySnap.data();
              territoryNumber = tData.number || territoryNumber;
              congId = tData.congregationId || congId;
            }

            await updateDoc(territoryRef, {
              status: 'assigned',
              publisherId: assignment.userId,
              publisherName: assignment.assigneeName,
              groupId: assignment.serviceGroupId,
              groupName: assignment.groupName,
              updatedAt: now,
            });
          }

          // Notify the assigned publisher
          if (assignment.userId) {
            try {
              await createInAppNotification(firestore, {
                userId: assignment.userId,
                type: NotificationType.TERRITORY_APPROVED,
                title: 'Territory Assignment Approved',
                body: `Your assignment for Territory #${territoryNumber || ''} has been approved${approvedByUserName ? ` by ${approvedByUserName}` : ''}.`,
                data: {
                  congregationId: congId,
                  territoryId: assignment.territoryId,
                  assignmentId,
                  territoryNumber,
                  approvedBy: approvedByUserId,
                  approvedByName: approvedByUserName,
                },
              });
            } catch (notifErr) {
              console.error('Failed to notify publisher of approval:', notifErr);
            }
          }

          // Also notify the endorser if different from the assigned publisher and overseer
          if (
            assignment.endorsedBy &&
            assignment.endorsedBy !== assignment.userId &&
            assignment.endorsedBy !== approvedByUserId
          ) {
            try {
              await createInAppNotification(firestore, {
                userId: assignment.endorsedBy,
                type: NotificationType.TERRITORY_APPROVED,
                title: 'Endorsement Approved',
                body: `Your endorsement of Territory #${territoryNumber || ''} for ${assignment.assigneeName || assignment.groupName || 'publisher'} was approved${approvedByUserName ? ` by ${approvedByUserName}` : ''}.`,
                data: {
                  congregationId: congId,
                  territoryId: assignment.territoryId,
                  assignmentId,
                  territoryNumber,
                  approvedBy: approvedByUserId,
                  approvedByName: approvedByUserName,
                },
              });
            } catch (notifErr) {
              console.error('Failed to notify endorser of approval:', notifErr);
            }
          }
        }
      } finally {
        setIsApproving(false);
      }
    },
    [congregationId]
  );

  const reject = useCallback(
    async (
      assignmentId: string,
      reason?: string,
      rejectedByUserId?: string,
      rejectedByUserName?: string
    ) => {
      setIsApproving(true);
      try {
        const now = nowIso();
        const firestore = getPlannerFirestore();
        const snap = await getDoc(assignmentDocument(assignmentId));
        if (!snap.exists()) throw new Error('Assignment not found');
        const assignment = snap.data() as Assignment;

        const trimmedReason = reason?.trim() || null;

        await updateDoc(assignmentDocument(assignmentId), {
          status: AssignmentStatus.REJECTED,
          endorsementStatus: EndorsementStatus.REJECTED,
          rejectionReason: trimmedReason,
          rejectedBy: rejectedByUserId ?? null,
          rejectedByName: rejectedByUserName ?? null,
          rejectedAt: now,
          updatedAt: now,
        });

        let territoryNumber = assignment.territoryNumber || '';
        let congId = assignment.congregationId || congregationId;

        if (assignment.territoryId) {
          const territoryRef = doc(
            firestore,
            FIRESTORE_COLLECTIONS.territories,
            assignment.territoryId
          );
          const territorySnap = await getDoc(territoryRef);
          if (territorySnap.exists()) {
            const tData = territorySnap.data();
            territoryNumber = tData.number || territoryNumber;
            congId = tData.congregationId || congId;
          }

          await updateDoc(territoryRef, {
            status: 'available',
            publisherId: null,
            publisherName: null,
            groupId: null,
            groupName: null,
            updatedAt: now,
          });
        }

        // Notify the assigned publisher and/or the servant who endorsed
        const declinerLabel = rejectedByUserName ? ` by ${rejectedByUserName}` : '';
        const reasonText = trimmedReason ? ` Reason: "${trimmedReason}"` : '';

        const recipientIds = new Set<string>();
        if (assignment.userId && assignment.userId !== rejectedByUserId) {
          recipientIds.add(assignment.userId);
        }
        if (assignment.endorsedBy && assignment.endorsedBy !== rejectedByUserId) {
          recipientIds.add(assignment.endorsedBy);
        }

        for (const recipientId of recipientIds) {
          try {
            await createInAppNotification(firestore, {
              userId: recipientId,
              type: NotificationType.TERRITORY_REJECTED,
              title: 'Territory Endorsement Declined',
              body: `Territory #${territoryNumber || ''} endorsement for ${assignment.assigneeName || assignment.groupName || 'publisher'} was declined${declinerLabel}.${reasonText}`,
              data: {
                congregationId: congId,
                territoryId: assignment.territoryId,
                assignmentId,
                territoryNumber,
                rejectionReason: trimmedReason,
                rejectedBy: rejectedByUserId,
                rejectedByName: rejectedByUserName,
              },
            });
          } catch (notifErr) {
            console.error('Failed to notify rejection:', notifErr);
          }
        }
      } finally {
        setIsApproving(false);
      }
    },
    [congregationId]
  );

  return { approve, reject, isApproving, isPending: isApproving };
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
 * Allows custom returnedAt date for Service Overseer and Territory Servant adjustments.
 */
export function useReturnAssignment() {
  const [isReturning, setIsReturning] = useState(false);

  const returnTerritory = useCallback(async (assignmentId: string, returnedAt?: string | null) => {
    setIsReturning(true);
    try {
      const now = nowIso();
      const effectiveReturnedAt = returnedAt ? normalizeDateToIso(returnedAt) : now;
      const firestore = getPlannerFirestore();

      // Handle synthesized territory assignment (when assignment only exists on territory doc)
      if (assignmentId.startsWith('territory-')) {
        const territoryId = assignmentId.replace('territory-', '');
        const territoryRef = doc(firestore, FIRESTORE_COLLECTIONS.territories, territoryId);
        const territorySnap = await getDoc(territoryRef);
        if (territorySnap.exists()) {
          const tData = territorySnap.data();
          await updateDoc(territoryRef, {
            status: 'available',
            publisherId: null,
            publisherName: null,
            groupId: null,
            groupName: null,
            updatedAt: now,
          });
          if (tData.congregationId) {
            try {
              await notifyCongregationOverseers(firestore, tData.congregationId, {
                type: NotificationType.TERRITORY_RETURNED,
                title: 'Territory Returned',
                body: `Territory #${tData.number || ''} was returned.`,
                data: {
                  congregationId: tData.congregationId,
                  territoryId,
                  territoryNumber: tData.number,
                },
              });
            } catch (notifErr) {
              console.error('Failed to notify overseers:', notifErr);
            }
          }
        }
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

      let territoryNumber = assignment.territoryNumber || '';
      let congId: string | undefined;

      if (assignment.territoryId) {
        const territoryRef = doc(
          firestore,
          FIRESTORE_COLLECTIONS.territories,
          assignment.territoryId
        );
        const territorySnap = await getDoc(territoryRef);
        if (territorySnap.exists()) {
          const tData = territorySnap.data();
          territoryNumber = tData.number || territoryNumber;
          congId = tData.congregationId;
        }

        await updateDoc(territoryRef, {
          status: 'available',
          publisherId: null,
          publisherName: null,
          groupId: null,
          groupName: null,
          updatedAt: now,
        });
      }

      // Notify overseers that territory has been returned
      if (congId) {
        try {
          await notifyCongregationOverseers(firestore, congId, {
            type: NotificationType.TERRITORY_RETURNED,
            title: 'Territory Returned',
            body: `Territory #${territoryNumber} was returned by ${assignment.assigneeName || 'a publisher'}.`,
            data: {
              congregationId: congId,
              territoryId: assignment.territoryId,
              assignmentId,
              territoryNumber,
            },
            excludeUserId: assignment.userId,
          });
        } catch (notifErr) {
          console.error('Failed to notify overseers of territory return:', notifErr);
        }
      }
    } finally {
      setIsReturning(false);
    }
  }, []);

  return { returnTerritory, isReturning, isPending: isReturning };
}

/**
 * Service Overseer / Territory Servant revokes the active/pending territory assignment.
 * Allows specifying custom revokedAt/returnedAt date.
 */
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
