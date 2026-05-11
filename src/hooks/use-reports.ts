import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
import type {
  ActivityReport,
  Assignment,
  CoverageReport,
  Member,
  PublishersReport,
  Territory,
} from '@/types/api';

function sourceCollection(name: keyof typeof FIRESTORE_COLLECTIONS) {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS[name]);
}

function territoryFromData(id: string, data: Partial<Territory>): Territory {
  return {
    id,
    number: data.number ?? '',
    name: data.name ?? 'Unnamed territory',
    notes: data.notes ?? null,
    status: data.status ?? 'available',
    householdsCount: data.householdsCount ?? 0,
    coveragePercent: String(data.coveragePercent ?? '0'),
    congregationId: data.congregationId ?? '',
    publisherId: data.publisherId ?? null,
    groupId: data.groupId ?? null,
    createdAt: data.createdAt ?? nowIso(),
    updatedAt: data.updatedAt ?? nowIso(),
    boundary: data.boundary ?? null,
    publisherName: data.publisherName ?? null,
    groupName: data.groupName ?? null,
  };
}

function assignmentFromData(id: string, data: Partial<Assignment>): Assignment {
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
    createdAt: data.createdAt ?? nowIso(),
    assigneeName: data.assigneeName ?? null,
    assigneeEmail: data.assigneeEmail ?? null,
    groupName: data.groupName ?? null,
  };
}

function memberFromData(id: string, data: Partial<Member>): Member {
  return {
    id,
    userId: data.userId ?? id,
    congregationId: data.congregationId ?? '',
    congregationRole: data.congregationRole ?? null,
    status: data.status ?? 'active',
    joinMessage: data.joinMessage ?? null,
    joinedAt: data.joinedAt ?? nowIso(),
    user: data.user ?? null,
  };
}

function useReportSources(congregationId: string | null | undefined) {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [territoriesLoading, setTerritoriesLoading] = useState(Boolean(congregationId));
  const [assignmentsLoading, setAssignmentsLoading] = useState(Boolean(congregationId));
  const [membersLoading, setMembersLoading] = useState(Boolean(congregationId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!congregationId) {
      setTerritories([]);
      setTerritoriesLoading(false);
      return;
    }
    setTerritoriesLoading(true);
    return onSnapshot(
      query(sourceCollection('territories'), where('congregationId', '==', congregationId)),
      { includeMetadataChanges: true },
      (snapshot) => {
        setTerritories(
          snapshot.docs.map((document) =>
            territoryFromData(document.id, document.data() as Partial<Territory>)
          )
        );
        setError(null);
        setTerritoriesLoading(false);
      },
      (err) => {
        setError(err.message);
        setTerritoriesLoading(false);
      }
    );
  }, [congregationId]);

  useEffect(() => {
    if (!congregationId) {
      setAssignments([]);
      setAssignmentsLoading(false);
      return;
    }
    setAssignmentsLoading(true);
    return onSnapshot(
      sourceCollection('assignments'),
      { includeMetadataChanges: true },
      (snapshot) => {
        setAssignments(
          snapshot.docs.map((document) =>
            assignmentFromData(document.id, document.data() as Partial<Assignment>)
          )
        );
        setError(null);
        setAssignmentsLoading(false);
      },
      (err) => {
        setError(err.message);
        setAssignmentsLoading(false);
      }
    );
  }, [congregationId]);

  useEffect(() => {
    if (!congregationId) {
      setMembers([]);
      setMembersLoading(false);
      return;
    }
    setMembersLoading(true);
    return onSnapshot(
      query(
        sourceCollection('congregationMembers'),
        where('congregationId', '==', congregationId),
        where('status', '==', 'active')
      ),
      { includeMetadataChanges: true },
      (snapshot) => {
        setMembers(
          snapshot.docs.map((document) =>
            memberFromData(document.id, document.data() as Partial<Member>)
          )
        );
        setError(null);
        setMembersLoading(false);
      },
      (err) => {
        setError(err.message);
        setMembersLoading(false);
      }
    );
  }, [congregationId]);

  const territoryIds = useMemo(
    () => new Set(territories.map((territory) => territory.id)),
    [territories]
  );
  const congregationAssignments = useMemo(
    () => assignments.filter((assignment) => territoryIds.has(assignment.territoryId)),
    [assignments, territoryIds]
  );

  return {
    territories,
    assignments: congregationAssignments,
    members,
    isLoading: territoriesLoading || assignmentsLoading || membersLoading,
    error,
  };
}

export function useCoverageReport(congregationId: string | null | undefined) {
  const { territories, isLoading, error } = useReportSources(congregationId);
  const data = useMemo<CoverageReport>(() => {
    const coverageValues = territories.map((territory) => Number(territory.coveragePercent) || 0);
    const totalCoverage = coverageValues.reduce((sum, value) => sum + value, 0);
    return {
      totalTerritories: territories.length,
      avgCoveragePercent: territories.length ? Math.round(totalCoverage / territories.length) : 0,
      byStatus: {
        available: territories.filter((territory) => territory.status === 'available').length,
        assigned: territories.filter((territory) => territory.status === 'assigned').length,
        completed: territories.filter((territory) => territory.status === 'completed').length,
        archived: territories.filter((territory) => territory.status === 'archived').length,
      },
      territories: territories.map((territory) => ({
        id: territory.id,
        number: territory.number,
        name: territory.name,
        status: territory.status,
        coveragePercent: Number(territory.coveragePercent) || 0,
        publisherName: territory.publisherName ?? undefined,
      })),
    };
  }, [territories]);

  return { data, isLoading, error };
}

export function usePublishersReport(congregationId: string | null | undefined) {
  const { territories, assignments, members, isLoading, error } = useReportSources(congregationId);
  const data = useMemo<PublishersReport>(() => {
    const territoryById = new Map(territories.map((territory) => [territory.id, territory]));
    return {
      publishers: members.map((member) => {
        const memberAssignments = assignments.filter(
          (assignment) => assignment.userId === member.userId
        );
        const activeAssignments = memberAssignments.filter(
          (assignment) => !['completed', 'returned'].includes(assignment.status)
        );
        return {
          userId: member.userId,
          name: member.user?.name ?? 'Publisher',
          email: member.user?.email ?? '',
          activeAssignments: activeAssignments.length,
          totalCompleted: memberAssignments.filter(
            (assignment) => assignment.status === 'completed'
          ).length,
          territories: activeAssignments
            .map((assignment) => territoryById.get(assignment.territoryId))
            .filter((territory): territory is Territory => Boolean(territory))
            .map((territory) => `${territory.number} ${territory.name}`.trim()),
        };
      }),
    };
  }, [assignments, members, territories]);

  return { data, isLoading, error };
}

export function useActivityReport(congregationId: string | null | undefined) {
  const { territories, assignments, isLoading, error } = useReportSources(congregationId);
  const data = useMemo<ActivityReport>(() => {
    const territoryById = new Map(territories.map((territory) => [territory.id, territory]));
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = assignments.filter((assignment) => {
      const date = assignment.returnedAt ?? assignment.assignedAt ?? assignment.createdAt;
      return new Date(date).getTime() >= cutoff;
    });
    return {
      assignments: recent
        .filter((assignment) => assignment.assignedAt)
        .map((assignment) => {
          const territory = territoryById.get(assignment.territoryId);
          return {
            id: assignment.id,
            territoryName: territory?.name ?? 'Unknown territory',
            territoryNumber: territory?.number ?? '',
            publisherName: assignment.assigneeName ?? 'Publisher',
            assignedAt: assignment.assignedAt,
          };
        }),
      returns: recent
        .filter((assignment) => assignment.returnedAt)
        .map((assignment) => {
          const territory = territoryById.get(assignment.territoryId);
          return {
            id: assignment.id,
            territoryName: territory?.name ?? 'Unknown territory',
            territoryNumber: territory?.number ?? '',
            publisherName: assignment.assigneeName ?? 'Publisher',
            returnedAt: assignment.returnedAt,
            coverageAtAssignment: Number(assignment.coverageAtAssignment) || 0,
          };
        }),
    };
  }, [assignments, territories]);

  return { data, isLoading, error };
}
