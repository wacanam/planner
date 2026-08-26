import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { createClientId, FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
import { commitChunkedBatch, type BatchOperation } from '@/lib/firebase/batch-utils';
import { getOverseenGroupMateIds, getUserGroupIds, getUserGroupMateIds } from '@/lib/permissions';
import { AssignmentStatus } from '@/lib/roles';
import type { Group, GroupMember, Member } from '@/types/api';

function groupCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.groups);
}

function groupDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.groups, id);
}

function groupFromData(id: string, data: Partial<Group>): Group {
  const overseerId = data.overseerId ?? null;
  const assistantOverseerId = data.assistantOverseerId ?? null;
  return {
    id,
    congregationId: data.congregationId ?? '',
    name: data.name ?? 'Unnamed group',
    overseerId,
    overseerName: data.overseerName ?? null,
    assistantOverseerId,
    assistantOverseerName: data.assistantOverseerName ?? null,
    createdAt: data.createdAt ?? nowIso(),
    members: (data.members ?? []).map((m) => {
      const uid = m.userId ?? m.id;
      let role = m.role;
      if (!role) {
        if (uid === overseerId) role = 'group_overseer';
        else if (uid === assistantOverseerId) role = 'assistant_overseer';
        else role = 'member';
      }
      return {
        id: uid,
        userId: uid,
        role,
        user: {
          name: m.user?.name ?? null,
          email: m.user?.email ?? null,
        },
      };
    }),
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

/**
 * Returns a Set of member user IDs across all groups where userId is a Group Overseer or Assistant.
 */
export function useOverseenGroupMates(
  congregationId: string | null | undefined,
  userId: string | null | undefined,
  userRole?: string | null,
  congregationRole?: string | null
): Set<string> {
  const { groups = [] } = useCongregationGroups(congregationId);
  return useMemo(
    () => getOverseenGroupMateIds(userId, groups, userRole, congregationRole),
    [userId, groups, userRole, congregationRole]
  );
}

/**
 * Returns a Set of all member user IDs across all groups the user belongs to (as member, overseer, assistant) or oversees.
 */
export function useGroupMateUserIds(
  congregationId: string | null | undefined,
  user:
    | {
        id?: string | null;
        email?: string | null;
        groupId?: string | null;
        role?: string | null;
        congregationRole?: string | null;
      }
    | string
    | null
    | undefined,
  userRole?: string | null,
  congregationRole?: string | null,
  congregationMembers?: Member[]
): Set<string> {
  const { groups = [] } = useCongregationGroups(congregationId);
  return useMemo(
    () => getUserGroupMateIds(user, groups, congregationMembers, userRole, congregationRole),
    [user, groups, congregationMembers, userRole, congregationRole]
  );
}

/**
 * Returns a Set of group IDs that the user belongs to (as overseer, assistant overseer, or member).
 */
export function useUserGroupIds(
  congregationId: string | null | undefined,
  user: { id?: string | null; email?: string | null } | null | undefined
): Set<string> {
  const { groups = [] } = useCongregationGroups(congregationId);
  return useMemo(() => getUserGroupIds(user, groups), [user, groups]);
}

export function useCreateGroup(congregationId: string) {
  const [isCreating, setIsCreating] = useState(false);
  const create = useCallback(
    async (arg: {
      name: string;
      overseerId?: string | null;
      overseerName?: string | null;
      assistantOverseerId?: string | null;
      assistantOverseerName?: string | null;
      members?: GroupMember[];
    }) => {
      setIsCreating(true);
      try {
        const id = createClientId();
        await setDoc(groupDocument(id), {
          id,
          congregationId,
          name: String(arg.name ?? 'Unnamed group').trim(),
          overseerId: arg.overseerId ?? null,
          overseerName: arg.overseerName ?? null,
          assistantOverseerId: arg.assistantOverseerId ?? null,
          assistantOverseerName: arg.assistantOverseerName ?? null,
          createdAt: nowIso(),
          members: arg.members ?? [],
        } satisfies Group);
        return { id };
      } finally {
        setIsCreating(false);
      }
    },
    [congregationId]
  );
  return { create, isCreating, isPending: isCreating };
}

export function useUpdateGroup(congregationId: string) {
  const [isUpdating, setIsUpdating] = useState(false);
  const update = useCallback(
    async (arg: {
      id: string;
      name?: string;
      overseerId?: string | null;
      overseerName?: string | null;
      assistantOverseerId?: string | null;
      assistantOverseerName?: string | null;
      members?: GroupMember[];
    }) => {
      setIsUpdating(true);
      try {
        const updates: Record<string, unknown> = {};
        if (arg.name !== undefined) updates.name = arg.name.trim();
        if (arg.overseerId !== undefined) updates.overseerId = arg.overseerId;
        if (arg.overseerName !== undefined) updates.overseerName = arg.overseerName;
        if (arg.assistantOverseerId !== undefined)
          updates.assistantOverseerId = arg.assistantOverseerId;
        if (arg.assistantOverseerName !== undefined)
          updates.assistantOverseerName = arg.assistantOverseerName;
        if (arg.members !== undefined) updates.members = arg.members;
        if (Object.keys(updates).length === 0) return;

        if (arg.members === undefined) {
          await updateDoc(groupDocument(arg.id), updates);
          return;
        }

        const firestore = getPlannerFirestore();
        const selectedUserIds = new Set(arg.members.map((member) => member.userId));
        const groupSnapshot = await getDocs(
          query(groupCollection(), where('congregationId', '==', congregationId))
        );
        const batch = writeBatch(firestore);
        let targetFound = false;

        for (const document of groupSnapshot.docs) {
          if (document.id === arg.id) {
            targetFound = true;
            batch.update(document.ref, updates);
            continue;
          }

          const group = groupFromData(document.id, document.data() as Partial<Group>);
          const filteredMembers = group.members.filter(
            (member) => !selectedUserIds.has(member.userId)
          );
          if (filteredMembers.length !== group.members.length) {
            batch.update(document.ref, { members: filteredMembers });
          }
        }

        if (!targetFound) batch.update(groupDocument(arg.id), updates);
        await batch.commit();
      } finally {
        setIsUpdating(false);
      }
    },
    [congregationId]
  );
  return { update, isUpdating, isPending: isUpdating };
}

export function useDeleteGroup(_congregationId: string) {
  const [isDeleting, setIsDeleting] = useState(false);
  const remove = useCallback(async (id: string) => {
    setIsDeleting(true);
    try {
      const now = nowIso();
      const firestore = getPlannerFirestore();

      // 1. Find all assignments for this group
      const assignmentsSnap = await getDocs(
        query(
          collection(firestore, FIRESTORE_COLLECTIONS.assignments),
          where('serviceGroupId', '==', id)
        )
      );

      // 2. Find all territories assigned to this group
      const territoriesSnap = await getDocs(
        query(
          collection(firestore, FIRESTORE_COLLECTIONS.territories),
          where('groupId', '==', id)
        )
      );

      // 3. Find congregation members assigned to this group
      const membersSnap = await getDocs(
        query(
          collection(firestore, FIRESTORE_COLLECTIONS.congregationMembers),
          where('groupId', '==', id)
        )
      );

      const ops: BatchOperation[] = [];

      // Reset assigned territories to available
      for (const t of territoriesSnap.docs) {
        ops.push((b) =>
          b.update(t.ref, {
            status: 'available',
            groupId: null,
            groupName: null,
            publisherId: null,
            publisherName: null,
            updatedAt: now,
          })
        );
      }

      // Close or delete assignments
      for (const a of assignmentsSnap.docs) {
        ops.push((b) =>
          b.update(a.ref, {
            status: AssignmentStatus.COMPLETED,
            returnedAt: now,
            updatedAt: now,
          })
        );
      }

      // Clear group membership
      for (const m of membersSnap.docs) {
        ops.push((b) =>
          b.update(m.ref, {
            groupId: null,
            updatedAt: now,
          })
        );
      }

      // Delete the group document
      ops.push((b) => b.delete(groupDocument(id)));

      await commitChunkedBatch(firestore, ops);
    } finally {
      setIsDeleting(false);
    }
  }, []);
  return { remove, isDeleting, isPending: isDeleting };
}
