import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
import { calculateTerritoryCoverage } from '@/lib/territory-coverage';
import type {
  ActivityReport,
  Assignment,
  CoverageReport,
  CoverageTerritory,
  DoorAnalyticsReport,
  Group,
  GroupReportStats,
  Household,
  Member,
  PublishersReport,
  PublisherStats,
  S13AssignmentRecord,
  Territory,
  TerritoryHealthStatus,
  Visit,
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

function householdFromData(id: string, data: Partial<Household>): Household {
  return {
    id,
    address: data.address ?? '',
    houseNumber: data.houseNumber ?? null,
    unitNumber: data.unitNumber ?? null,
    streetName: data.streetName ?? '',
    city: data.city ?? '',
    postalCode: data.postalCode ?? null,
    country: data.country ?? null,
    type: data.type ?? 'house',
    status: data.status ?? 'new',
    lastVisitDate: data.lastVisitDate ?? null,
    lastVisitOutcome: data.lastVisitOutcome ?? null,
    totalVisitsCount: data.totalVisitsCount ?? 0,
    territoryId: data.territoryId ?? null,
    congregationId: data.congregationId ?? '',
    createdAt: data.createdAt ?? nowIso(),
    updatedAt: data.updatedAt ?? nowIso(),
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

function groupFromData(id: string, data: Partial<Group>): Group {
  return {
    id,
    congregationId: data.congregationId ?? '',
    name: data.name ?? 'Service Group',
    overseerId: data.overseerId ?? null,
    overseerName: data.overseerName ?? null,
    assistantOverseerId: data.assistantOverseerId ?? null,
    assistantOverseerName: data.assistantOverseerName ?? null,
    createdAt: data.createdAt ?? nowIso(),
    members: data.members ?? [],
  };
}

function visitFromData(id: string, data: Partial<Visit>): Visit {
  return {
    id,
    userId: data.userId ?? '',
    publisherName: data.publisherName ?? null,
    householdId: data.householdId ?? '',
    visitDate: data.visitDate ?? nowIso(),
    outcome: data.outcome ?? 'contacted',
    duration: data.duration ?? null,
    literaturePlaced: data.literaturePlaced ?? null,
    bibleTopicDiscussed: data.bibleTopicDiscussed ?? null,
    returnVisitPlanned: Boolean(data.returnVisitPlanned),
    assignmentId: data.assignmentId ?? null,
    notes: data.notes ?? null,
    createdAt: data.createdAt ?? nowIso(),
    updatedAt: data.updatedAt ?? nowIso(),
  };
}

function useReportSources(congregationId: string | null | undefined) {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);

  const [territoriesLoading, setTerritoriesLoading] = useState(Boolean(congregationId));
  const [assignmentsLoading, setAssignmentsLoading] = useState(Boolean(congregationId));
  const [membersLoading, setMembersLoading] = useState(Boolean(congregationId));
  const [householdsLoading, setHouseholdsLoading] = useState(Boolean(congregationId));
  const [groupsLoading, setGroupsLoading] = useState(Boolean(congregationId));
  const [visitsLoading, setVisitsLoading] = useState(Boolean(congregationId));
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
      setHouseholds([]);
      setHouseholdsLoading(false);
      return;
    }
    setHouseholdsLoading(true);
    return onSnapshot(
      query(sourceCollection('households'), where('congregationId', '==', congregationId)),
      { includeMetadataChanges: true },
      (snapshot) => {
        setHouseholds(
          snapshot.docs.map((document) =>
            householdFromData(document.id, document.data() as Partial<Household>)
          )
        );
        setHouseholdsLoading(false);
      },
      () => {
        setHouseholdsLoading(false);
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

  useEffect(() => {
    if (!congregationId) {
      setGroups([]);
      setGroupsLoading(false);
      return;
    }
    setGroupsLoading(true);
    return onSnapshot(
      query(sourceCollection('groups'), where('congregationId', '==', congregationId)),
      { includeMetadataChanges: true },
      (snapshot) => {
        setGroups(
          snapshot.docs.map((document) =>
            groupFromData(document.id, document.data() as Partial<Group>)
          )
        );
        setGroupsLoading(false);
      },
      () => {
        setGroupsLoading(false);
      }
    );
  }, [congregationId]);

  useEffect(() => {
    if (!congregationId) {
      setVisits([]);
      setVisitsLoading(false);
      return;
    }
    setVisitsLoading(true);
    return onSnapshot(
      sourceCollection('visits'),
      { includeMetadataChanges: true },
      (snapshot) => {
        setVisits(
          snapshot.docs.map((document) =>
            visitFromData(document.id, document.data() as Partial<Visit>)
          )
        );
        setVisitsLoading(false);
      },
      () => {
        setVisitsLoading(false);
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
    households,
    groups,
    visits,
    isLoading:
      territoriesLoading ||
      assignmentsLoading ||
      membersLoading ||
      householdsLoading ||
      groupsLoading ||
      visitsLoading,
    error,
  };
}

export function useCoverageReport(congregationId: string | null | undefined) {
  const { territories, assignments, households, isLoading, error } =
    useReportSources(congregationId);

  const data = useMemo<CoverageReport>(() => {
    const householdsByTerritory = new Map<string, Household[]>();
    for (const h of households) {
      if (h.territoryId) {
        if (!householdsByTerritory.has(h.territoryId)) {
          householdsByTerritory.set(h.territoryId, []);
        }
        householdsByTerritory.get(h.territoryId)!.push(h);
      }
    }

    const assignmentByTerritory = new Map<string, Assignment>();
    for (const a of assignments) {
      if (a.status === 'assigned' || a.status === 'active') {
        assignmentByTerritory.set(a.territoryId, a);
      }
    }

    const now = Date.now();
    let totalWorked = 0;
    let totalDoors = 0;

    const calculatedTerritories: CoverageTerritory[] = territories.map((territory) => {
      const terrHouseholds = householdsByTerritory.get(territory.id) || [];
      const coverageInfo =
        terrHouseholds.length > 0
          ? calculateTerritoryCoverage(terrHouseholds)
          : {
              totalDoors: territory.householdsCount || 0,
              workedDoors: Math.round(
                ((Number(territory.coveragePercent) || 0) / 100) * (territory.householdsCount || 0)
              ),
              unworkedDoors: Math.max(
                0,
                (territory.householdsCount || 0) -
                  Math.round(
                    ((Number(territory.coveragePercent) || 0) / 100) *
                      (territory.householdsCount || 0)
                  )
              ),
              coveragePercent: Number(territory.coveragePercent) || 0,
            };

      totalWorked += coverageInfo.workedDoors;
      totalDoors += coverageInfo.totalDoors;

      // Calculate last worked date from households
      let latestVisitMs = 0;
      for (const h of terrHouseholds) {
        if (h.lastVisitDate) {
          const ms = new Date(h.lastVisitDate).getTime();
          if (ms > latestVisitMs) latestVisitMs = ms;
        }
      }

      const activeAssignment = assignmentByTerritory.get(territory.id);
      const daysSinceWorked = latestVisitMs
        ? Math.floor((now - latestVisitMs) / (1000 * 60 * 60 * 24))
        : null;

      let healthStatus: TerritoryHealthStatus = 'stale';
      if (daysSinceWorked !== null) {
        if (daysSinceWorked < 30) healthStatus = 'fresh';
        else if (daysSinceWorked <= 90) healthStatus = 'active';
        else if (daysSinceWorked <= 180) healthStatus = 'dormant';
        else healthStatus = 'stale';
      }

      return {
        id: territory.id,
        number: territory.number,
        name: territory.name,
        status: territory.status,
        coveragePercent: coverageInfo.coveragePercent,
        householdsCount: coverageInfo.totalDoors,
        workedDoors: coverageInfo.workedDoors,
        unworkedDoors: coverageInfo.unworkedDoors,
        lastWorkedDate: latestVisitMs ? new Date(latestVisitMs).toISOString() : null,
        assignedAt: activeAssignment?.assignedAt ?? null,
        publisherName: activeAssignment?.assigneeName ?? territory.publisherName ?? undefined,
        groupName: activeAssignment?.groupName ?? territory.groupName ?? undefined,
        healthStatus,
        daysSinceWorked,
      };
    });

    const avgCoveragePercent = totalDoors > 0 ? Math.round((totalWorked / totalDoors) * 100) : 0;

    // Calculate completed assignments turnaround days
    const completedAssignments = assignments.filter(
      (a) => a.assignedAt && a.returnedAt && ['completed', 'returned'].includes(a.status)
    );
    const totalDurationDays = completedAssignments.reduce((sum, a) => {
      const start = new Date(a.assignedAt!).getTime();
      const end = new Date(a.returnedAt!).getTime();
      const diff = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
      return sum + diff;
    }, 0);
    const avgTurnaroundDays = completedAssignments.length
      ? Math.round(totalDurationDays / completedAssignments.length)
      : 45;

    const assignedCount = territories.filter((t) => t.status === 'assigned').length;
    const activeAssignmentRate = territories.length
      ? Math.round((assignedCount / territories.length) * 100)
      : 0;

    return {
      totalTerritories: territories.length,
      avgCoveragePercent,
      totalDoors,
      workedDoors: totalWorked,
      unworkedDoors: Math.max(0, totalDoors - totalWorked),
      activeAssignmentRate,
      avgTurnaroundDays,
      byStatus: {
        available: territories.filter((t) => t.status === 'available').length,
        assigned: assignedCount,
        completed: territories.filter((t) => t.status === 'completed').length,
        archived: territories.filter((t) => t.status === 'archived').length,
      },
      byHealth: {
        fresh: calculatedTerritories.filter((t) => t.healthStatus === 'fresh').length,
        active: calculatedTerritories.filter((t) => t.healthStatus === 'active').length,
        dormant: calculatedTerritories.filter((t) => t.healthStatus === 'dormant').length,
        stale: calculatedTerritories.filter((t) => t.healthStatus === 'stale').length,
      },
      territories: calculatedTerritories,
    };
  }, [territories, assignments, households]);

  return { data, isLoading, error };
}

export function useS13Report(congregationId: string | null | undefined) {
  const { territories, assignments, households, isLoading, error } =
    useReportSources(congregationId);

  const data = useMemo<S13AssignmentRecord[]>(() => {
    const territoryById = new Map(territories.map((t) => [t.id, t]));
    const householdsByTerritory = new Map<string, Household[]>();
    for (const h of households) {
      if (h.territoryId) {
        if (!householdsByTerritory.has(h.territoryId)) {
          householdsByTerritory.set(h.territoryId, []);
        }
        householdsByTerritory.get(h.territoryId)!.push(h);
      }
    }

    return assignments
      .map((a) => {
        const terr = territoryById.get(a.territoryId);
        const terrHouseholds = householdsByTerritory.get(a.territoryId) || [];
        const currentCoverage =
          terrHouseholds.length > 0
            ? calculateTerritoryCoverage(terrHouseholds).coveragePercent
            : Number(terr?.coveragePercent) || 0;

        let durationDays: number | null = null;
        if (a.assignedAt) {
          const start = new Date(a.assignedAt).getTime();
          const end = a.returnedAt ? new Date(a.returnedAt).getTime() : Date.now();
          durationDays = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        }

        return {
          id: a.id,
          territoryId: a.territoryId,
          territoryNumber: terr?.number || a.territoryNumber || '—',
          territoryName: terr?.name || a.territoryName || 'Territory',
          assigneeName:
            a.assigneeName || (a.serviceGroupId ? a.groupName || 'Service Group' : 'Publisher'),
          assigneeEmail: a.assigneeEmail,
          isGroupAssignment: Boolean(a.serviceGroupId),
          groupName: a.groupName,
          assignedAt: a.assignedAt,
          dueAt: a.dueAt,
          returnedAt: a.returnedAt,
          coverageAtAssignment: Number(a.coverageAtAssignment) || 0,
          coverageAtReturn: a.returnedAt
            ? Number(a.coverageAtAssignment) || currentCoverage
            : currentCoverage,
          durationDays,
          status: a.status,
        };
      })
      .sort((left, right) => {
        const dateA = left.assignedAt ? new Date(left.assignedAt).getTime() : 0;
        const dateB = right.assignedAt ? new Date(right.assignedAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [assignments, territories, households]);

  return { data, isLoading, error };
}

export function useGroupsReport(congregationId: string | null | undefined) {
  const { groups, territories, assignments, households, isLoading, error } =
    useReportSources(congregationId);

  const data = useMemo<GroupReportStats[]>(() => {
    const householdsByTerritory = new Map<string, Household[]>();
    for (const h of households) {
      if (h.territoryId) {
        if (!householdsByTerritory.has(h.territoryId)) {
          householdsByTerritory.set(h.territoryId, []);
        }
        householdsByTerritory.get(h.territoryId)!.push(h);
      }
    }

    const territoryById = new Map(territories.map((t) => [t.id, t]));

    return groups.map((group) => {
      const groupAssignments = assignments.filter(
        (a) => a.serviceGroupId === group.id && (a.status === 'assigned' || a.status === 'active')
      );

      const assignedTerritories = groupAssignments
        .map((a) => territoryById.get(a.territoryId))
        .filter((t): t is Territory => Boolean(t));

      let totalDoors = 0;
      let workedDoors = 0;

      for (const t of assignedTerritories) {
        const hList = householdsByTerritory.get(t.id) || [];
        if (hList.length > 0) {
          const stats = calculateTerritoryCoverage(hList);
          totalDoors += stats.totalDoors;
          workedDoors += stats.workedDoors;
        } else {
          const count = t.householdsCount || 0;
          totalDoors += count;
          workedDoors += Math.round(((Number(t.coveragePercent) || 0) / 100) * count);
        }
      }

      const avgCoveragePercent = totalDoors > 0 ? Math.round((workedDoors / totalDoors) * 100) : 0;

      return {
        groupId: group.id,
        name: group.name,
        overseerName: group.overseerName || null,
        assistantOverseerName: group.assistantOverseerName || null,
        memberCount: group.members?.length || 0,
        assignedTerritoriesCount: assignedTerritories.length,
        totalDoors,
        workedDoors,
        avgCoveragePercent,
        territoryNumbers: assignedTerritories.map((t) => `#${t.number}`),
      };
    });
  }, [groups, territories, assignments, households]);

  return { data, isLoading, error };
}

export function usePublishersReport(congregationId: string | null | undefined) {
  const { territories, assignments, members, groups, visits, isLoading, error } =
    useReportSources(congregationId);

  const data = useMemo<PublishersReport>(() => {
    const territoryById = new Map(territories.map((t) => [t.id, t]));

    // Map memberId -> group name
    const memberGroupMap = new Map<string, string>();
    for (const g of groups) {
      for (const gm of g.members || []) {
        if (gm.userId) memberGroupMap.set(gm.userId, g.name);
      }
    }

    // Map memberId -> total visits & last active date
    const visitStatsByUser = new Map<string, { count: number; lastDate: string | null }>();
    for (const v of visits) {
      if (v.userId) {
        const curr = visitStatsByUser.get(v.userId) || { count: 0, lastDate: null };
        curr.count += 1;
        if (!curr.lastDate || v.visitDate > curr.lastDate) {
          curr.lastDate = v.visitDate;
        }
        visitStatsByUser.set(v.userId, curr);
      }
    }

    return {
      publishers: members.map((member) => {
        const uid = member.userId || member.id;
        const memberAssignments = assignments.filter((a) => a.userId === uid);
        const activeAssignments = memberAssignments.filter(
          (a) => !['completed', 'returned'].includes(a.status)
        );

        const vStats = visitStatsByUser.get(uid);

        return {
          userId: uid,
          name: member.user?.name ?? 'Publisher',
          email: member.user?.email ?? '',
          role: member.congregationRole ?? undefined,
          groupName: memberGroupMap.get(uid) ?? undefined,
          activeAssignments: activeAssignments.length,
          totalCompleted: memberAssignments.filter((a) => a.status === 'completed').length,
          totalVisits: vStats?.count || 0,
          lastActiveDate: vStats?.lastDate || null,
          territories: activeAssignments
            .map((a) => territoryById.get(a.territoryId))
            .filter((t): t is Territory => Boolean(t))
            .map((t) => `#${t.number} ${t.name}`.trim()),
        };
      }),
    };
  }, [assignments, members, territories, groups, visits]);

  return { data, isLoading, error };
}

export function useDoorAnalyticsReport(congregationId: string | null | undefined) {
  const { households, visits, isLoading, error } = useReportSources(congregationId);

  const data = useMemo<DoorAnalyticsReport>(() => {
    let totalDoors = households.length;
    let workedDoors = 0;
    let doNotCallCount = 0;
    let returnVisitsCount = 0;
    let foreignLanguageCount = 0;
    let vacantCount = 0;
    let inaccessibleCount = 0;
    let busyCount = 0;

    const outcomeCounts = {
      notHome: 0,
      contacted: 0,
      placedLiterature: 0,
      returnVisit: 0,
      busy: 0,
      doNotCall: 0,
      studyConducted: 0,
      minorOnly: 0,
      foreignLanguage: 0,
      inaccessible: 0,
      vacant: 0,
      moved: 0,
      other: 0,
    };

    const streetCounts = new Map<string, { total: number; worked: number }>();

    for (const h of households) {
      if (
        h.status === 'visited' ||
        h.lastVisitDate ||
        (h.totalVisitsCount || 0) > 0 ||
        (h.status && h.status.trim().toLowerCase() !== 'new')
      ) {
        workedDoors += 1;
      }
      if (
        h.status === 'do_not_call' ||
        h.status === 'do_not_visit' ||
        h.lastVisitOutcome === 'do_not_call' ||
        h.lastVisitOutcome === 'do_not_visit'
      ) {
        doNotCallCount += 1;
      }
      if (h.status === 'return_visit' || h.lastVisitOutcome === 'return_visit' || (h.totalVisitsCount || 0) > 1) {
        returnVisitsCount += 1;
      }
      if (h.status === 'foreign_language' || h.lastVisitOutcome === 'foreign_language') {
        foreignLanguageCount += 1;
      }
      if (h.status === 'vacant' || h.lastVisitOutcome === 'vacant') {
        vacantCount += 1;
      }
      if (h.status === 'inaccessible' || h.lastVisitOutcome === 'inaccessible') {
        inaccessibleCount += 1;
      }
      if (h.status === 'busy' || h.lastVisitOutcome === 'busy') {
        busyCount += 1;
      }

      const street = (h.streetName || h.address || 'Other Area').trim();
      const curr = streetCounts.get(street) || { total: 0, worked: 0 };
      curr.total += 1;
      if (
        h.status === 'visited' ||
        h.lastVisitDate ||
        (h.status && h.status.trim().toLowerCase() !== 'new')
      ) {
        curr.worked += 1;
      }
      streetCounts.set(street, curr);
    }

    for (const v of visits) {
      const outcome = (v.outcome || '').toLowerCase();
      if (outcome === 'study_conducted' || outcome.includes('study')) {
        outcomeCounts.studyConducted += 1;
      } else if (outcome.includes('not_home') || outcome.includes('not home')) {
        outcomeCounts.notHome += 1;
      } else if (outcome === 'busy' || outcome.includes('busy')) {
        outcomeCounts.busy += 1;
      } else if (outcome === 'foreign_language' || outcome.includes('language')) {
        outcomeCounts.foreignLanguage += 1;
      } else if (outcome === 'minor_only' || outcome.includes('minor')) {
        outcomeCounts.minorOnly += 1;
      } else if (outcome === 'inaccessible' || outcome.includes('inaccessible') || outcome.includes('gated')) {
        outcomeCounts.inaccessible += 1;
      } else if (outcome === 'vacant' || outcome.includes('vacant')) {
        outcomeCounts.vacant += 1;
      } else if (outcome === 'moved' || outcome.includes('moved')) {
        outcomeCounts.moved += 1;
      } else if (outcome.includes('do_not') || outcome.includes('dnc') || outcome === 'do_not_visit' || outcome === 'do_not_call') {
        outcomeCounts.doNotCall += 1;
      } else if (outcome.includes('place') || outcome.includes('literature') || Boolean(v.literaturePlaced || v.literatureLeft)) {
        outcomeCounts.placedLiterature += 1;
      } else if (outcome.includes('return') || outcome.includes('revisit')) {
        outcomeCounts.returnVisit += 1;
      } else if (outcome.includes('contact') || outcome.includes('interested') || outcome === 'answered') {
        outcomeCounts.contacted += 1;
      } else {
        outcomeCounts.other += 1;
      }
    }

    const topStreets = Array.from(streetCounts.entries())
      .map(([streetName, s]) => ({
        streetName,
        doorsCount: s.total,
        workedCount: s.worked,
      }))
      .sort((a, b) => b.doorsCount - a.doorsCount)
      .slice(0, 8);

    return {
      totalDoors,
      workedDoors,
      unworkedDoors: Math.max(0, totalDoors - workedDoors),
      doNotCallCount,
      returnVisitsCount,
      foreignLanguageCount,
      vacantCount,
      inaccessibleCount,
      busyCount,
      outcomeCounts,
      topStreets,
    };
  }, [households, visits]);

  return { data, isLoading, error };
}

export function useActivityReport(congregationId: string | null | undefined) {
  const { territories, assignments, visits, isLoading, error } = useReportSources(congregationId);

  const data = useMemo<ActivityReport>(() => {
    const territoryById = new Map(territories.map((t) => [t.id, t]));
    const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000; // 60 days
    const recent = assignments.filter((a) => {
      const date = a.returnedAt ?? a.assignedAt ?? a.createdAt;
      return new Date(date).getTime() >= cutoff;
    });

    return {
      assignments: recent
        .filter((a) => a.assignedAt)
        .map((a) => {
          const territory = territoryById.get(a.territoryId);
          return {
            id: a.id,
            territoryName: territory?.name ?? 'Territory',
            territoryNumber: territory?.number ?? '',
            publisherName:
              a.assigneeName ?? (a.serviceGroupId ? a.groupName || 'Service Group' : 'Publisher'),
            assignedAt: a.assignedAt,
          };
        }),
      returns: recent
        .filter((a) => a.returnedAt)
        .map((a) => {
          const territory = territoryById.get(a.territoryId);
          return {
            id: a.id,
            territoryName: territory?.name ?? 'Territory',
            territoryNumber: territory?.number ?? '',
            publisherName:
              a.assigneeName ?? (a.serviceGroupId ? a.groupName || 'Service Group' : 'Publisher'),
            returnedAt: a.returnedAt,
            coverageAtAssignment: Number(a.coverageAtAssignment) || 0,
          };
        }),
    };
  }, [assignments, territories, visits]);

  return { data, isLoading, error };
}
