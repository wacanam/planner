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
import { canApproveAssignments } from '@/lib/permissions';
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
              (a.endorsedAt || a.createdAt || '').localeCompare(b.endorsedAt || b.createdAt || '')
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
  if (!dateStr?.trim()) return nowIso();
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T12:00:00.000Z`);
    return !Number.isNaN(d.getTime()) ? d.toISOString() : nowIso();
  }
  const parsed = new Date(trimmed);
  return !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : nowIso();
}

export function useCreateAssignment() {
  const [isCreating, setIsCreating] = useState(false);

  /**
   * Territory Servant assigns and endorses territory -> status becomes pending_approval.
   * Service Overseer / Admin assigns directly -> status becomes active and endorsementStatus approved immediately.
   */
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

        const isDirectApproval = canApproveAssignments(
          arg.creatorRole,
          arg.creatorCongregationRole
        );

        const assignmentDoc: Assignment = {
          id,
          territoryId,
          congregationId: congId,
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
          territoryName,
          territoryNumber,
        };

        await setDoc(assignmentDocument(id), assignmentDoc);

        // Update territory status
        await updateDoc(territoryRef, {
          status: isDirectApproval ? 'assigned' : 'pending',
          publisherId: arg.userId ?? null,
          publisherName: arg.assigneeName ?? null,
          groupId: arg.serviceGroupId ?? null,
          groupName: arg.groupName ?? null,
          updatedAt: now,
        });

        // If direct approved, auto-resolve any pending territory requests for this territory
        if (isDirectApproval && territoryId) {
          try {
            const pendingReqs = await getDocs(
              query(
                collection(firestore, FIRESTORE_COLLECTIONS.territoryRequests),
                where('territoryId', '==', territoryId),
                where('status', '==', 'pending')
              )
            );
            for (const reqDoc of pendingReqs.docs) {
              const reqData = reqDoc.data();
              const isTargetUser = arg.userId && reqData.publisherId === arg.userId;
              await updateDoc(reqDoc.ref, {
                status: isTargetUser ? 'approved' : 'rejected',
                responseMessage: isTargetUser ? null : 'Territory assigned to another publisher',
                reviewedAt: now,
                updatedAt: now,
              });
            }
          } catch (reqErr) {
            console.warn('Failed to auto-resolve territory requests on assignment:', reqErr);
          }
        }

        // Notify congregation service overseers if endorsement
        if (!isDirectApproval && congId) {
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

        return { id, isDirectApproval };
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  return { create, endorse: create, isCreating, isPending: isCreating };
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
        const isRevokeOrReturn =
          assignment.endorsementType === 'revoke' || assignment.endorsementType === 'return';

        let territoryNumber = assignment.territoryNumber || '';
        let congId = assignment.congregationId || congregationId;

        if (isApproved) {
          if (isRevokeOrReturn) {
            // Approving a Return or Revocation: complete assignment and mark territory available
            const effectiveReturnedAt = assignment.returnedAt || now;
            await updateDoc(assignmentDocument(assignmentId), {
              status: AssignmentStatus.COMPLETED,
              endorsementStatus: EndorsementStatus.APPROVED,
              returnedAt: effectiveReturnedAt,
              approvedBy: approvedByUserId ?? 'Service Overseer',
              approvedByName: approvedByUserName ?? null,
              approvedAt: now,
              updatedAt: now,
            });

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
          } else {
            // Approving a New Assignment Endorsement
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

            await updateDoc(assignmentDocument(assignmentId), {
              status: AssignmentStatus.ACTIVE,
              endorsementStatus: EndorsementStatus.APPROVED,
              approvedBy: approvedByUserId ?? 'Service Overseer',
              approvedByName: approvedByUserName ?? null,
              approvedAt: now,
              updatedAt: now,
            });

            // Auto-resolve any pending territory requests for this territory
            if (assignment.territoryId) {
              try {
                const pendingReqs = await getDocs(
                  query(
                    collection(firestore, FIRESTORE_COLLECTIONS.territoryRequests),
                    where('territoryId', '==', assignment.territoryId),
                    where('status', '==', 'pending')
                  )
                );
                for (const reqDoc of pendingReqs.docs) {
                  const reqData = reqDoc.data();
                  const isTargetUser = assignment.userId && reqData.publisherId === assignment.userId;
                  await updateDoc(reqDoc.ref, {
                    status: isTargetUser ? 'approved' : 'rejected',
                    responseMessage: isTargetUser ? null : 'Territory assigned to another publisher',
                    reviewedAt: now,
                    updatedAt: now,
                  });
                }
              } catch (reqErr) {
                console.warn('Failed to auto-resolve territory requests on approval:', reqErr);
              }
            }
          }

          // Notify the assigned publisher
          if (assignment.userId) {
            try {
              const notifTitle = isRevokeOrReturn
                ? 'Territory Return Approved'
                : 'Territory Assignment Approved';
              const notifBody = isRevokeOrReturn
                ? `Your return for Territory #${territoryNumber || ''} has been approved.`
                : `Your assignment for Territory #${territoryNumber || ''} has been approved${approvedByUserName ? ` by ${approvedByUserName}` : ''}.`;
              await createInAppNotification(firestore, {
                userId: assignment.userId,
                type: isRevokeOrReturn
                  ? NotificationType.TERRITORY_RETURNED
                  : NotificationType.TERRITORY_APPROVED,
                title: notifTitle,
                body: notifBody,
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
        const isRevokeOrReturn =
          assignment.endorsementType === 'revoke' || assignment.endorsementType === 'return';

        const trimmedReason = reason?.trim() || null;
        let territoryNumber = assignment.territoryNumber || '';
        let congId = assignment.congregationId || congregationId;

        if (isRevokeOrReturn) {
          // Declining a Return/Revocation: keep assignment active and territory assigned
          await updateDoc(assignmentDocument(assignmentId), {
            status: AssignmentStatus.ACTIVE,
            endorsementStatus: EndorsementStatus.REJECTED,
            returnedAt: null,
            rejectionReason: trimmedReason,
            rejectedBy: rejectedByUserId ?? null,
            rejectedByName: rejectedByUserName ?? null,
            rejectedAt: now,
            updatedAt: now,
          });

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
        } else {
          // Declining a New Assignment Endorsement: mark assignment rejected and territory available
          await updateDoc(assignmentDocument(assignmentId), {
            status: AssignmentStatus.REJECTED,
            endorsementStatus: EndorsementStatus.REJECTED,
            rejectionReason: trimmedReason,
            rejectedBy: rejectedByUserId ?? null,
            rejectedByName: rejectedByUserName ?? null,
            rejectedAt: now,
            updatedAt: now,
          });

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
              title: isRevokeOrReturn
                ? 'Territory Return Declined'
                : 'Territory Endorsement Declined',
              body: `Territory #${territoryNumber || ''} ${isRevokeOrReturn ? 'return' : 'endorsement'} for ${assignment.assigneeName || assignment.groupName || 'publisher'} was declined${declinerLabel}.${reasonText}`,
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

export function useDeleteAssignment() {
  const [isDeleting, setIsDeleting] = useState(false);

  const remove = useCallback(async (id: string) => {
    setIsDeleting(true);
    try {
      const firestore = getPlannerFirestore();
      const snapshot = await getDoc(assignmentDocument(id));
      const assignment = snapshot.exists() ? (snapshot.data() as Partial<Assignment>) : null;

      await deleteDoc(assignmentDocument(id));

      if (assignment?.territoryId) {
        const territoryRef = doc(firestore, FIRESTORE_COLLECTIONS.territories, assignment.territoryId);
        const territorySnap = await getDoc(territoryRef);

        if (territorySnap.exists()) {
          const tData = territorySnap.data();
          const isCurrentActiveHolder =
            (assignment.userId && tData.publisherId === assignment.userId) ||
            (assignment.serviceGroupId && tData.groupId === assignment.serviceGroupId) ||
            assignment.status === AssignmentStatus.ACTIVE ||
            assignment.status === 'assigned';

          if (isCurrentActiveHolder) {
            // Check if another active assignment exists for this territory
            const otherActiveSnap = await getDocs(
              query(
                collection(firestore, FIRESTORE_COLLECTIONS.assignments),
                where('territoryId', '==', assignment.territoryId),
                where('status', '==', AssignmentStatus.ACTIVE)
              )
            );
            const remainingActive = otherActiveSnap.docs.filter((d) => d.id !== id);

            if (remainingActive.length === 0) {
              await updateDoc(territoryRef, {
                status: 'available',
                publisherId: null,
                publisherName: null,
                groupId: null,
                groupName: null,
                updatedAt: nowIso(),
              });
            }
          }
        }
      }
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { remove, deleteAssignment: remove, isDeleting, isPending: isDeleting };
}

/**
 * Assignee or Group member checks in / returns the assigned territory.
 * Direct approved for Service Overseer / Admin; submitted as endorsement for Publisher / Group Overseer.
 */
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

        // Handle synthesized territory assignment (when assignment only exists on territory doc)
        if (assignmentId.startsWith('territory-')) {
          const territoryId = assignmentId.replace('territory-', '');
          const territoryRef = doc(firestore, FIRESTORE_COLLECTIONS.territories, territoryId);
          const territorySnap = await getDoc(territoryRef);
          if (territorySnap.exists()) {
            const tData = territorySnap.data();
            await updateDoc(territoryRef, {
              status: isDirectApprove ? 'available' : 'pending',
              publisherId: isDirectApprove ? null : (tData.publisherId ?? null),
              publisherName: isDirectApprove ? null : (tData.publisherName ?? null),
              groupId: isDirectApprove ? null : (tData.groupId ?? null),
              groupName: isDirectApprove ? null : (tData.groupName ?? null),
              updatedAt: now,
            });
            if (isDirectApprove && tData.congregationId) {
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

        let territoryNumber = assignment.territoryNumber || '';
        let congId: string | undefined = assignment.congregationId ?? undefined;

        if (isDirectApprove) {
          // Direct approved completion
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
        } else {
          // Submitted for Service Overseer approval
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
            const territorySnap = await getDoc(territoryRef);
            if (territorySnap.exists()) {
              const tData = territorySnap.data();
              territoryNumber = tData.number || territoryNumber;
              congId = tData.congregationId || congId;
            }

            await updateDoc(territoryRef, {
              status: 'pending',
              updatedAt: now,
            });
          }

          if (congId) {
            try {
              await notifyCongregationOverseers(firestore, congId, {
                type: NotificationType.TERRITORY_RETURNED,
                title: 'Territory Return Submitted',
                body: `Territory #${territoryNumber} return was submitted by ${assignment.assigneeName || actorUserName || 'publisher'} for approval.`,
                data: {
                  congregationId: congId,
                  territoryId: assignment.territoryId,
                  assignmentId,
                  territoryNumber,
                },
                excludeUserId: actorUserId ?? assignment.userId,
              });
            } catch (notifErr) {
              console.error('Failed to notify overseers:', notifErr);
            }
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

/**
 * Revokes the active/pending territory assignment.
 * Direct approved for Service Overseer / Admin; submitted as endorsement for Territory Servant.
 */
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
        const territorySnap = await getDoc(territoryRef);
        const tData = territorySnap.exists() ? territorySnap.data() : null;
        const congId = tData?.congregationId;
        const territoryNumber = tData?.number || territoryId;

        const batch = writeBatch(firestore);

        if (isDirectApprove) {
          // Direct approved: Mark all active/pending/unreturned assignments as COMPLETED
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
          // Territory Servant revoking -> Submits for Service Overseer approval
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

          if (congId) {
            try {
              await notifyCongregationOverseers(firestore, congId, {
                type: NotificationType.TERRITORY_ENDORSED,
                title: 'Territory Revocation Endorsement',
                body: `Territory #${territoryNumber} revocation was submitted by ${actorUserName || 'Territory Servant'} for approval.`,
                data: {
                  congregationId: congId,
                  territoryId,
                  territoryNumber,
                },
                excludeUserId: actorUserId,
              });
            } catch (notifErr) {
              console.error('Failed to notify overseers of revocation endorsement:', notifErr);
            }
          }
        }
      } finally {
        setIsRevoking(false);
      }
    },
    []
  );

  return { revoke, isRevoking, isPending: isRevoking };
}
