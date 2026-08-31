import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
import {
  getAvailableServiceYears,
  getServiceYear,
  getServiceYearRange,
  isDateInServiceYear,
} from '@/lib/service-year';
import {
  calculateMinistryTeachingMetrics,
  buildTeachingAnalyticsReport,
} from '@/lib/teaching-metrics';
import { calculateTerritoryCoverage, type TerritoryCoverageStats } from '@/lib/territory-coverage';
import type {
  ActivityReport,
  Assignment,
  CoverageReport,
  CoverageTerritory,
  DoorAnalyticsReport,
  Encounter,
  Group,
  GroupReportStats,
  Household,
  Member,
  PublishersReport,
  S13AssignmentRecord,
  TeachingAnalyticsReport,
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
    nextVisitDate: data.nextVisitDate ?? null,
    nextVisitTime: data.nextVisitTime ?? null,
    nextVisitNotes: data.nextVisitNotes ?? null,
    scheduledAppointmentType: data.scheduledAppointmentType ?? null,
    bibleStudyStatus: data.bibleStudyStatus ?? null,
    studyOffered: Boolean(data.studyOffered),
    isAppointmentMissed: Boolean(data.isAppointmentMissed),
    assignmentId: data.assignmentId ?? null,
    notes: data.notes ?? null,
    createdAt: data.createdAt ?? nowIso(),
    updatedAt: data.updatedAt ?? nowIso(),
  };
}

function encounterFromData(id: string, data: Partial<Encounter>): Encounter {
  return {
    id,
    visitId: data.visitId ?? null,
    householdId: data.householdId ?? null,
    territoryId: data.territoryId ?? null,
    congregationId: data.congregationId ?? '',
    userId: data.userId ?? '',
    publisherName: data.publisherName ?? null,
    name: data.name ?? null,
    gender: data.gender ?? null,
    ageGroup: data.ageGroup ?? null,
    role: data.role ?? null,
    response: data.response ?? 'neutral',
    language: data.language ?? null,
    languageSpoken: data.languageSpoken ?? null,
    topicsDiscussed: data.topicsDiscussed ?? data.topicDiscussed ?? null,
    topicDiscussed: data.topicDiscussed ?? data.topicsDiscussed ?? null,
    literatureOffered: data.literatureOffered ?? null,
    literatureAccepted: data.literatureAccepted ?? null,
    bibleStudyInterest: Boolean(data.bibleStudyInterest),
    studyOffered: Boolean(data.studyOffered),
    returnVisitRequested: Boolean(data.returnVisitRequested),
    nextVisitNotes: data.nextVisitNotes ?? null,
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
  const [encounters, setEncounters] = useState<Encounter[]>([]);

  const [territoriesLoading, setTerritoriesLoading] = useState(Boolean(congregationId));
  const [assignmentsLoading, setAssignmentsLoading] = useState(Boolean(congregationId));
  const [membersLoading, setMembersLoading] = useState(Boolean(congregationId));
  const [householdsLoading, setHouseholdsLoading] = useState(Boolean(congregationId));
  const [groupsLoading, setGroupsLoading] = useState(Boolean(congregationId));
  const [visitsLoading, setVisitsLoading] = useState(Boolean(congregationId));
  const [encountersLoading, setEncountersLoading] = useState(Boolean(congregationId));
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
      query(sourceCollection('assignments'), where('congregationId', '==', congregationId)),
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
      query(sourceCollection('visits'), where('congregationId', '==', congregationId)),
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

  useEffect(() => {
    if (!congregationId) {
      setEncounters([]);
      setEncountersLoading(false);
      return;
    }
    setEncountersLoading(true);
    return onSnapshot(
      query(sourceCollection('encounters'), where('congregationId', '==', congregationId)),
      { includeMetadataChanges: true },
      (snapshot) => {
        setEncounters(
          snapshot.docs.map((document) =>
            encounterFromData(document.id, document.data() as Partial<Encounter>)
          )
        );
        setEncountersLoading(false);
      },
      () => {
        setEncountersLoading(false);
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
    encounters,
    isLoading:
      territoriesLoading ||
      assignmentsLoading ||
      membersLoading ||
      householdsLoading ||
      groupsLoading ||
      visitsLoading ||
      encountersLoading,
    error,
  };
}

export interface ReportFilterOptions {
  serviceYear?: number | 'all';
}

export function useCoverageReport(
  congregationId: string | null | undefined,
  options?: ReportFilterOptions
) {
  const { territories, assignments, households, visits, isLoading, error } =
    useReportSources(congregationId);

  const selectedServiceYear = options?.serviceYear ?? 'all';

  const data = useMemo<CoverageReport>(() => {
    const currentSY = getServiceYear(new Date());
    const syForEvaluation = selectedServiceYear === 'all' ? currentSY : selectedServiceYear;
    const syRange = getServiceYearRange(syForEvaluation);

    // Compute available service years across historical records
    const allRecordDates = [
      ...assignments.map((a) => a.assignedAt),
      ...assignments.map((a) => a.returnedAt),
      ...visits.map((v) => v.visitDate),
    ];
    const availableServiceYears = getAvailableServiceYears(allRecordDates, true);

    const householdsByTerritory = new Map<string, Household[]>();
    const householdTerritoryMap = new Map<string, string>();
    for (const h of households) {
      if (h.territoryId) {
        householdTerritoryMap.set(h.id, h.territoryId);
        if (!householdsByTerritory.has(h.territoryId)) {
          householdsByTerritory.set(h.territoryId, []);
        }
        householdsByTerritory.get(h.territoryId)?.push(h);
      }
    }

    const visitsByTerritory = new Map<string, Visit[]>();
    for (const v of visits) {
      const tId = v.householdId ? householdTerritoryMap.get(v.householdId) : null;
      if (tId) {
        if (!visitsByTerritory.has(tId)) {
          visitsByTerritory.set(tId, []);
        }
        visitsByTerritory.get(tId)?.push(v);
      }
    }

    const assignmentByTerritory = new Map<string, Assignment>();
    const completedAssignmentsByTerritory = new Map<string, Assignment[]>();
    for (const a of assignments) {
      if (a.status === 'assigned' || a.status === 'active') {
        assignmentByTerritory.set(a.territoryId, a);
      }
      if (a.status === 'completed' || a.status === 'returned' || a.returnedAt) {
        if (!completedAssignmentsByTerritory.has(a.territoryId)) {
          completedAssignmentsByTerritory.set(a.territoryId, []);
        }
        completedAssignmentsByTerritory.get(a.territoryId)?.push(a);
      }
    }

    const now = Date.now();
    let totalWorked = 0;
    let totalDoors = 0;
    let workedInCurrentSYCount = 0;

    const calculatedTerritories: CoverageTerritory[] = territories.map((territory) => {
      const terrHouseholds = householdsByTerritory.get(territory.id) || [];
      const terrVisits = visitsByTerritory.get(territory.id) || [];
      const activeAssignment = assignmentByTerritory.get(territory.id);
      const pastAssignments = completedAssignmentsByTerritory.get(territory.id) || [];
      const latestCompleted = pastAssignments.sort((a, b) =>
        (b.returnedAt || b.assignedAt || '').localeCompare(a.returnedAt || a.assignedAt || '')
      )[0];

      let coverageInfo: TerritoryCoverageStats;

      if (terrHouseholds.length > 0) {
        if (activeAssignment) {
          // Active Assignment: scope to current assignment period
          coverageInfo = calculateTerritoryCoverage(terrHouseholds, {
            assignedAt: activeAssignment.assignedAt,
            assignmentId: activeAssignment.id,
            visits: terrVisits,
          });
        } else if (territory.status === 'completed' && latestCompleted) {
          // Completed Territory: scope to latest completed assignment period
          coverageInfo = calculateTerritoryCoverage(terrHouseholds, {
            assignedAt: latestCompleted.assignedAt,
            returnedAt: latestCompleted.returnedAt,
            assignmentId: latestCompleted.id,
            visits: terrVisits,
          });
        } else if (territory.status === 'available') {
          // Available Territory in cabinet: show latest completed cycle coverage if exists, or 0%
          if (latestCompleted) {
            coverageInfo = calculateTerritoryCoverage(terrHouseholds, {
              assignedAt: latestCompleted.assignedAt,
              returnedAt: latestCompleted.returnedAt,
              assignmentId: latestCompleted.id,
              visits: terrVisits,
            });
          } else {
            coverageInfo = {
              totalDoors: terrHouseholds.length,
              workedDoors: 0,
              unworkedDoors: terrHouseholds.length,
              coveragePercent: 0,
            };
          }
        } else {
          coverageInfo = calculateTerritoryCoverage(terrHouseholds, {
            visits: terrVisits,
          });
        }
      } else {
        coverageInfo = {
          totalDoors: territory.householdsCount || 0,
          workedDoors: Math.round(
            ((Number(territory.coveragePercent) || 0) / 100) * (territory.householdsCount || 0)
          ),
          unworkedDoors: Math.max(
            0,
            (territory.householdsCount || 0) -
              Math.round(
                ((Number(territory.coveragePercent) || 0) / 100) * (territory.householdsCount || 0)
              )
          ),
          coveragePercent: Number(territory.coveragePercent) || 0,
        };
      }

      totalWorked += coverageInfo.workedDoors;
      totalDoors += coverageInfo.totalDoors;

      // Calculate last worked date from households and visits
      let latestVisitMs = 0;
      let hasVisitInTargetSY = false;

      for (const h of terrHouseholds) {
        if (h.lastVisitDate) {
          const ms = new Date(h.lastVisitDate).getTime();
          if (ms > latestVisitMs) latestVisitMs = ms;
          if (ms >= syRange.startMs && ms <= syRange.endMs) {
            hasVisitInTargetSY = true;
          }
        }
      }
      for (const v of terrVisits) {
        if (v.visitDate) {
          const ms = new Date(v.visitDate).getTime();
          if (ms > latestVisitMs) latestVisitMs = ms;
          if (ms >= syRange.startMs && ms <= syRange.endMs) {
            hasVisitInTargetSY = true;
          }
        }
      }

      const hasAssignmentInTargetSY =
        pastAssignments.some(
          (a) =>
            isDateInServiceYear(a.returnedAt, syForEvaluation) ||
            isDateInServiceYear(a.assignedAt, syForEvaluation)
        ) ||
        (activeAssignment && isDateInServiceYear(activeAssignment.assignedAt, syForEvaluation));

      const isWorkedInServiceYear = Boolean(hasVisitInTargetSY || hasAssignmentInTargetSY);
      if (isWorkedInServiceYear) {
        workedInCurrentSYCount += 1;
      }

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
        isWorkedInServiceYear,
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
      serviceYear: selectedServiceYear,
      availableServiceYears,
      workedInCurrentSYCount,
      unworkedInCurrentSYCount: Math.max(0, territories.length - workedInCurrentSYCount),
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
  }, [territories, assignments, households, visits, selectedServiceYear]);

  return { data, isLoading, error };
}

export function useS13Report(
  congregationId: string | null | undefined,
  options?: ReportFilterOptions
) {
  const { territories, assignments, households, visits, isLoading, error } =
    useReportSources(congregationId);

  const selectedServiceYear = options?.serviceYear ?? 'all';

  const data = useMemo<S13AssignmentRecord[]>(() => {
    const territoryById = new Map(territories.map((t) => [t.id, t]));
    const householdsByTerritory = new Map<string, Household[]>();
    const householdTerritoryMap = new Map<string, string>();
    for (const h of households) {
      if (h.territoryId) {
        householdTerritoryMap.set(h.id, h.territoryId);
        if (!householdsByTerritory.has(h.territoryId)) {
          householdsByTerritory.set(h.territoryId, []);
        }
        householdsByTerritory.get(h.territoryId)?.push(h);
      }
    }

    const visitsByTerritory = new Map<string, Visit[]>();
    for (const v of visits) {
      const tId = v.householdId ? householdTerritoryMap.get(v.householdId) : null;
      if (tId) {
        if (!visitsByTerritory.has(tId)) {
          visitsByTerritory.set(tId, []);
        }
        visitsByTerritory.get(tId)?.push(v);
      }
    }

    const allRecords = assignments
      .map((a) => {
        const terr = territoryById.get(a.territoryId);
        const terrHouseholds = householdsByTerritory.get(a.territoryId) || [];
        const terrVisits = visitsByTerritory.get(a.territoryId) || [];

        // Calculate exact coverage for this assignment's period [assignedAt, returnedAt]
        const periodStats = calculateTerritoryCoverage(terrHouseholds, {
          assignedAt: a.assignedAt,
          returnedAt: a.returnedAt,
          assignmentId: a.id,
          visits: terrVisits,
        });

        const periodCoverage =
          terrHouseholds.length > 0
            ? periodStats.coveragePercent
            : Number(a.coverageAtAssignment) || Number(terr?.coveragePercent) || 0;

        let durationDays: number | null = null;
        if (a.assignedAt) {
          const start = new Date(a.assignedAt).getTime();
          const end = a.returnedAt ? new Date(a.returnedAt).getTime() : Date.now();
          durationDays = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        }

        const effectiveDate = a.returnedAt || a.assignedAt || a.createdAt;
        const serviceYear = getServiceYear(effectiveDate);

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
          coverageAtReturn: periodCoverage,
          durationDays,
          status: a.status,
          serviceYear,
        };
      })
      .sort((left, right) => {
        const dateA = left.assignedAt ? new Date(left.assignedAt).getTime() : 0;
        const dateB = right.assignedAt ? new Date(right.assignedAt).getTime() : 0;
        return dateB - dateA;
      });

    if (selectedServiceYear === 'all') {
      return allRecords;
    }

    return allRecords.filter((rec) => {
      if (rec.serviceYear === selectedServiceYear) return true;
      if (!rec.returnedAt && isDateInServiceYear(rec.assignedAt, selectedServiceYear)) {
        return true;
      }
      return false;
    });
  }, [assignments, territories, households, visits, selectedServiceYear]);

  return { data, isLoading, error };
}

export function useGroupsReport(
  congregationId: string | null | undefined,
  options?: ReportFilterOptions
) {
  const { groups, territories, assignments, households, visits, isLoading, error } =
    useReportSources(congregationId);

  const selectedServiceYear = options?.serviceYear ?? 'all';

  const data = useMemo<GroupReportStats[]>(() => {
    const householdsByTerritory = new Map<string, Household[]>();
    const householdTerritoryMap = new Map<string, string>();
    for (const h of households) {
      if (h.territoryId) {
        householdTerritoryMap.set(h.id, h.territoryId);
        if (!householdsByTerritory.has(h.territoryId)) {
          householdsByTerritory.set(h.territoryId, []);
        }
        householdsByTerritory.get(h.territoryId)?.push(h);
      }
    }

    const visitsByTerritory = new Map<string, Visit[]>();
    for (const v of visits) {
      const tId = v.householdId ? householdTerritoryMap.get(v.householdId) : null;
      if (tId) {
        if (!visitsByTerritory.has(tId)) {
          visitsByTerritory.set(tId, []);
        }
        visitsByTerritory.get(tId)?.push(v);
      }
    }

    const territoryById = new Map(territories.map((t) => [t.id, t]));

    return groups.map((group) => {
      let groupAssignments = assignments.filter(
        (a) => a.serviceGroupId === group.id && (a.status === 'assigned' || a.status === 'active')
      );

      if (selectedServiceYear !== 'all') {
        groupAssignments = groupAssignments.filter((a) =>
          isDateInServiceYear(a.assignedAt || a.createdAt, selectedServiceYear)
        );
      }

      const assignedTerritories = groupAssignments
        .map((a) => territoryById.get(a.territoryId))
        .filter((t): t is Territory => Boolean(t));

      let totalDoors = 0;
      let workedDoors = 0;

      for (const t of assignedTerritories) {
        const hList = householdsByTerritory.get(t.id) || [];
        const tVisits = visitsByTerritory.get(t.id) || [];
        const activeGroupAssignment = groupAssignments.find((a) => a.territoryId === t.id);

        if (hList.length > 0) {
          const stats = calculateTerritoryCoverage(hList, {
            assignedAt: activeGroupAssignment?.assignedAt,
            assignmentId: activeGroupAssignment?.id,
            visits: tVisits,
          });
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
  }, [groups, territories, assignments, households, visits, selectedServiceYear]);

  return { data, isLoading, error };
}

export function usePublishersReport(
  congregationId: string | null | undefined,
  options?: ReportFilterOptions
) {
  const { territories, assignments, members, groups, visits, isLoading, error } =
    useReportSources(congregationId);

  const selectedServiceYear = options?.serviceYear ?? 'all';

  const data = useMemo<PublishersReport>(() => {
    const territoryById = new Map(territories.map((t) => [t.id, t]));

    // Map memberId -> group name
    const memberGroupMap = new Map<string, string>();
    for (const g of groups) {
      for (const gm of g.members || []) {
        if (gm.userId) memberGroupMap.set(gm.userId, g.name);
      }
    }

    // Filter visits if selected service year
    const relevantVisits =
      selectedServiceYear === 'all'
        ? visits
        : visits.filter((v) => isDateInServiceYear(v.visitDate, selectedServiceYear));

    // Map memberId -> total visits & last active date
    const visitStatsByUser = new Map<string, { count: number; lastDate: string | null }>();
    for (const v of relevantVisits) {
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
        let memberAssignments = assignments.filter((a) => a.userId === uid);

        if (selectedServiceYear !== 'all') {
          memberAssignments = memberAssignments.filter((a) =>
            isDateInServiceYear(a.returnedAt || a.assignedAt || a.createdAt, selectedServiceYear)
          );
        }

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
  }, [assignments, members, territories, groups, visits, selectedServiceYear]);

  return { data, isLoading, error };
}

export function useDoorAnalyticsReport(
  congregationId: string | null | undefined,
  options?: ReportFilterOptions
) {
  const { households, visits, isLoading, error } = useReportSources(congregationId);
  const selectedServiceYear = options?.serviceYear ?? 'all';

  const data = useMemo<DoorAnalyticsReport>(() => {
    const relevantVisits =
      selectedServiceYear === 'all'
        ? visits
        : visits.filter((v) => isDateInServiceYear(v.visitDate, selectedServiceYear));

    const totalDoors = households.length;
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
      returnVisitMissed: 0,
      busy: 0,
      doNotCall: 0,
      studyConducted: 0,
      studyOffered: 0,
      studyMissed: 0,
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
      if (
        h.status === 'return_visit' ||
        h.lastVisitOutcome === 'return_visit' ||
        (h.totalVisitsCount || 0) > 1
      ) {
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

    for (const v of relevantVisits) {
      const outcome = (v.outcome || '').toLowerCase();
      const isMissedFlag = Boolean(v.isAppointmentMissed);

      if (outcome === 'study_conducted' || v.bibleStudyStatus === 'conducted') {
        outcomeCounts.studyConducted += 1;
      } else if (outcome === 'study_offered' || v.studyOffered || v.bibleStudyStatus === 'offered') {
        outcomeCounts.studyOffered = (outcomeCounts.studyOffered || 0) + 1;
      } else if (
        outcome === 'study_missed' ||
        (isMissedFlag && v.scheduledAppointmentType === 'bible_study') ||
        v.bibleStudyStatus === 'missed'
      ) {
        outcomeCounts.studyMissed = (outcomeCounts.studyMissed || 0) + 1;
      } else if (
        outcome === 'return_visit_missed' ||
        (isMissedFlag && v.scheduledAppointmentType === 'return_visit')
      ) {
        outcomeCounts.returnVisitMissed = (outcomeCounts.returnVisitMissed || 0) + 1;
      } else if (outcome.includes('not_home') || outcome.includes('not home')) {
        outcomeCounts.notHome += 1;
      } else if (outcome === 'busy' || outcome.includes('busy')) {
        outcomeCounts.busy += 1;
      } else if (outcome === 'foreign_language' || outcome.includes('language')) {
        outcomeCounts.foreignLanguage += 1;
      } else if (outcome === 'minor_only' || outcome.includes('minor')) {
        outcomeCounts.minorOnly += 1;
      } else if (
        outcome === 'inaccessible' ||
        outcome.includes('inaccessible') ||
        outcome.includes('gated')
      ) {
        outcomeCounts.inaccessible += 1;
      } else if (outcome === 'vacant' || outcome.includes('vacant')) {
        outcomeCounts.vacant += 1;
      } else if (outcome === 'moved' || outcome.includes('moved')) {
        outcomeCounts.moved += 1;
      } else if (
        outcome.includes('do_not') ||
        outcome.includes('dnc') ||
        outcome === 'do_not_visit' ||
        outcome === 'do_not_call'
      ) {
        outcomeCounts.doNotCall += 1;
      } else if (
        outcome.includes('place') ||
        outcome.includes('literature') ||
        v.literaturePlaced ||
        v.literatureLeft
      ) {
        outcomeCounts.placedLiterature += 1;
      } else if (outcome.includes('return') || outcome.includes('revisit')) {
        outcomeCounts.returnVisit += 1;
      } else if (
        outcome.includes('contact') ||
        outcome.includes('interested') ||
        outcome === 'answered'
      ) {
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
      returnVisitsMissedCount: outcomeCounts.returnVisitMissed || 0,
      studyConductedCount: outcomeCounts.studyConducted,
      studyOfferedCount: outcomeCounts.studyOffered || 0,
      studyMissedCount: outcomeCounts.studyMissed || 0,
      foreignLanguageCount,
      vacantCount,
      inaccessibleCount,
      busyCount,
      outcomeCounts,
      topStreets,
    };
  }, [households, visits, selectedServiceYear]);

  return { data, isLoading, error };
}

export function useTeachingAnalyticsReport(
  congregationId: string | null | undefined,
  options?: ReportFilterOptions
) {
  const { households, visits, encounters, groups, members, isLoading, error } =
    useReportSources(congregationId);

  const selectedServiceYear = options?.serviceYear ?? 'all';

  const data = useMemo<TeachingAnalyticsReport>(() => {
    return buildTeachingAnalyticsReport(households, visits, encounters, groups, members, {
      serviceYear: selectedServiceYear,
    });
  }, [households, visits, encounters, groups, members, selectedServiceYear]);

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
