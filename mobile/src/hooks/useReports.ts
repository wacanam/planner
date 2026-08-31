// mobile/src/hooks/useReports.ts
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { FIRESTORE_COLLECTIONS, getPlannerFirestore } from '@/lib/firebase';
import {
  getAvailableServiceYears,
  getServiceYear,
  getServiceYearRange,
  isDateInServiceYear,
} from '@/lib/service-year';
import { calculateTerritoryCoverage } from '@/lib/territory-coverage';
import type {
  Assignment,
  CoverageReport,
  CoverageTerritory,
  Household,
  S13AssignmentRecord,
  Territory,
  TerritoryHealthStatus,
  Visit,
} from '@/types/api';

export interface ReportFilterOptions {
  serviceYear?: number | 'all';
}

export function useCoverageReport(
  congregationId: string | null | undefined,
  options?: ReportFilterOptions
) {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const selectedServiceYear = options?.serviceYear ?? 'all';

  useEffect(() => {
    if (!congregationId) {
      setTerritories([]);
      setHouseholds([]);
      setAssignments([]);
      setVisits([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const firestore = getPlannerFirestore();

    const unsubTerritories = onSnapshot(
      query(
        collection(firestore, FIRESTORE_COLLECTIONS.territories),
        where('congregationId', '==', congregationId)
      ),
      (snap) => {
        setTerritories(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Territory));
      }
    );

    const unsubHouseholds = onSnapshot(
      query(
        collection(firestore, FIRESTORE_COLLECTIONS.households),
        where('congregationId', '==', congregationId)
      ),
      (snap) => {
        setHouseholds(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Household));
      }
    );

    const unsubAssignments = onSnapshot(
      query(
        collection(firestore, FIRESTORE_COLLECTIONS.assignments),
        where('congregationId', '==', congregationId)
      ),
      (snap) => {
        setAssignments(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Assignment));
      }
    );

    const unsubVisits = onSnapshot(
      query(
        collection(firestore, FIRESTORE_COLLECTIONS.visits),
        where('congregationId', '==', congregationId)
      ),
      (snap) => {
        setVisits(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Visit));
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      }
    );

    return () => {
      unsubTerritories();
      unsubHouseholds();
      unsubAssignments();
      unsubVisits();
    };
  }, [congregationId]);

  const report: CoverageReport = useMemo(() => {
    const currentSY = getServiceYear(new Date());
    const syForEvaluation = selectedServiceYear === 'all' ? currentSY : selectedServiceYear;
    const syRange = getServiceYearRange(syForEvaluation);

    const allRecordDates = [
      ...assignments.map((a) => a.assignedAt),
      ...assignments.map((a) => a.returnedAt),
      ...visits.map((v) => v.visitDate),
    ];
    const availableServiceYears = getAvailableServiceYears(allRecordDates, true);

    const totalTerritories = territories.length;
    let totalDoors = 0;
    let workedDoors = 0;
    let workedInCurrentSYCount = 0;

    const householdTerritoryMap = new Map<string, string>();
    for (const h of households) {
      if (h.territoryId) householdTerritoryMap.set(h.id, h.territoryId);
    }

    const visitsByTerritory = new Map<string, Visit[]>();
    for (const v of visits) {
      const tId = v.householdId ? householdTerritoryMap.get(v.householdId) : null;
      if (tId) {
        if (!visitsByTerritory.has(tId)) visitsByTerritory.set(tId, []);
        visitsByTerritory.get(tId)?.push(v);
      }
    }

    const activeAssignmentsByTerritory = new Map<string, Assignment>();
    const completedAssignmentsByTerritory = new Map<string, Assignment[]>();
    for (const a of assignments) {
      if (a.status === 'assigned' || a.status === 'active') {
        activeAssignmentsByTerritory.set(a.territoryId, a);
      }
      if (a.status === 'completed' || a.status === 'returned' || a.returnedAt) {
        if (!completedAssignmentsByTerritory.has(a.territoryId)) {
          completedAssignmentsByTerritory.set(a.territoryId, []);
        }
        completedAssignmentsByTerritory.get(a.territoryId)?.push(a);
      }
    }

    const mappedTerritories: CoverageTerritory[] = territories.map((t) => {
      const tHouseholds = households.filter((h) => h.territoryId === t.id);
      const tVisits = visitsByTerritory.get(t.id) || [];
      const activeAssignment = activeAssignmentsByTerritory.get(t.id);
      const pastAssignments = completedAssignmentsByTerritory.get(t.id) || [];
      const latestCompleted = pastAssignments.sort((a, b) =>
        (b.returnedAt || b.assignedAt || '').localeCompare(a.returnedAt || a.assignedAt || '')
      )[0];

      let stats = {
        totalDoors: tHouseholds.length || t.householdsCount || 0,
        workedDoors: 0,
        unworkedDoors: tHouseholds.length || t.householdsCount || 0,
        coveragePercent: 0,
      };

      if (tHouseholds.length > 0) {
        if (activeAssignment) {
          stats = calculateTerritoryCoverage(tHouseholds, {
            assignedAt: activeAssignment.assignedAt,
            assignmentId: activeAssignment.id,
            visits: tVisits,
          });
        } else if (t.status === 'completed' && latestCompleted) {
          stats = calculateTerritoryCoverage(tHouseholds, {
            assignedAt: latestCompleted.assignedAt,
            returnedAt: latestCompleted.returnedAt,
            assignmentId: latestCompleted.id,
            visits: tVisits,
          });
        } else if (t.status === 'available') {
          if (latestCompleted) {
            stats = calculateTerritoryCoverage(tHouseholds, {
              assignedAt: latestCompleted.assignedAt,
              returnedAt: latestCompleted.returnedAt,
              assignmentId: latestCompleted.id,
              visits: tVisits,
            });
          } else {
            stats = {
              totalDoors: tHouseholds.length,
              workedDoors: 0,
              unworkedDoors: tHouseholds.length,
              coveragePercent: 0,
            };
          }
        } else {
          stats = calculateTerritoryCoverage(tHouseholds, { visits: tVisits });
        }
      } else if (t.householdsCount) {
        const percent = parseFloat(t.coveragePercent || '0');
        stats = {
          totalDoors: t.householdsCount,
          workedDoors: Math.round((percent / 100) * t.householdsCount),
          unworkedDoors: Math.max(
            0,
            t.householdsCount - Math.round((percent / 100) * t.householdsCount)
          ),
          coveragePercent: percent,
        };
      }

      totalDoors += stats.totalDoors;
      workedDoors += stats.workedDoors;

      let healthStatus: TerritoryHealthStatus = 'fresh';
      let daysSinceWorked: number | null = null;

      // Calculate days since worked from households and visits
      let latestVisitMs = 0;
      let hasVisitInTargetSY = false;

      for (const h of tHouseholds) {
        if (h.lastVisitDate) {
          const ms = new Date(h.lastVisitDate).getTime();
          if (ms > latestVisitMs) latestVisitMs = ms;
          if (ms >= syRange.startMs && ms <= syRange.endMs) {
            hasVisitInTargetSY = true;
          }
        }
      }
      for (const v of tVisits) {
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

      if (latestVisitMs > 0) {
        daysSinceWorked = Math.max(
          0,
          Math.floor((Date.now() - latestVisitMs) / (1000 * 60 * 60 * 24))
        );
        if (daysSinceWorked > 180) healthStatus = 'stale';
        else if (daysSinceWorked > 90) healthStatus = 'dormant';
        else if (daysSinceWorked > 30) healthStatus = 'active';
        else healthStatus = 'fresh';
      } else {
        healthStatus = 'stale';
      }

      return {
        id: t.id,
        number: t.number,
        name: t.name,
        status: t.status,
        coveragePercent: stats.coveragePercent,
        householdsCount: stats.totalDoors,
        workedDoors: stats.workedDoors,
        unworkedDoors: stats.unworkedDoors,
        healthStatus,
        daysSinceWorked,
        isWorkedInServiceYear,
        publisherName: activeAssignment?.assigneeName || t.publisherName || undefined,
        groupName: activeAssignment?.groupName || t.groupName || undefined,
      };
    });

    const avgCoveragePercent = totalDoors > 0 ? (workedDoors / totalDoors) * 100 : 0;

    return {
      totalTerritories,
      avgCoveragePercent: Math.round(avgCoveragePercent),
      totalDoors,
      workedDoors,
      unworkedDoors: Math.max(0, totalDoors - workedDoors),
      activeAssignmentRate: 0,
      avgTurnaroundDays: 0,
      serviceYear: selectedServiceYear,
      availableServiceYears,
      workedInCurrentSYCount,
      unworkedInCurrentSYCount: Math.max(0, territories.length - workedInCurrentSYCount),
      byStatus: {
        available: territories.filter((t) => t.status === 'available').length,
        assigned: territories.filter((t) => t.status === 'assigned').length,
        completed: territories.filter((t) => t.status === 'completed').length,
        archived: territories.filter((t) => t.status === 'archived').length,
      },
      byHealth: {
        fresh: mappedTerritories.filter((t) => t.healthStatus === 'fresh').length,
        active: mappedTerritories.filter((t) => t.healthStatus === 'active').length,
        dormant: mappedTerritories.filter((t) => t.healthStatus === 'dormant').length,
        stale: mappedTerritories.filter((t) => t.healthStatus === 'stale').length,
      },
      territories: mappedTerritories,
    };
  }, [territories, households, assignments, visits, selectedServiceYear]);

  return { data: report, isLoading };
}

export function useS13Report(
  congregationId: string | null | undefined,
  options?: ReportFilterOptions
) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const selectedServiceYear = options?.serviceYear ?? 'all';

  useEffect(() => {
    if (!congregationId) {
      setAssignments([]);
      setTerritories([]);
      setHouseholds([]);
      setVisits([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const firestore = getPlannerFirestore();

    const unsubAssignments = onSnapshot(
      query(
        collection(firestore, FIRESTORE_COLLECTIONS.assignments),
        where('congregationId', '==', congregationId)
      ),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Assignment)
          .sort((a, b) => (b.assignedAt || '').localeCompare(a.assignedAt || ''));
        setAssignments(list);
      }
    );

    const unsubTerritories = onSnapshot(
      query(
        collection(firestore, FIRESTORE_COLLECTIONS.territories),
        where('congregationId', '==', congregationId)
      ),
      (snap) => {
        setTerritories(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Territory));
      }
    );

    const unsubHouseholds = onSnapshot(
      query(
        collection(firestore, FIRESTORE_COLLECTIONS.households),
        where('congregationId', '==', congregationId)
      ),
      (snap) => {
        setHouseholds(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Household));
      }
    );

    const unsubVisits = onSnapshot(
      query(
        collection(firestore, FIRESTORE_COLLECTIONS.visits),
        where('congregationId', '==', congregationId)
      ),
      (snap) => {
        setVisits(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Visit));
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      }
    );

    return () => {
      unsubAssignments();
      unsubTerritories();
      unsubHouseholds();
      unsubVisits();
    };
  }, [congregationId]);

  const s13Records: S13AssignmentRecord[] = useMemo(() => {
    const territoryMap = new Map(territories.map((t) => [t.id, t]));
    const householdTerritoryMap = new Map<string, string>();
    const householdsByTerritory = new Map<string, Household[]>();

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
        if (!visitsByTerritory.has(tId)) visitsByTerritory.set(tId, []);
        visitsByTerritory.get(tId)?.push(v);
      }
    }

    const allRecords = assignments.map((a) => {
      const terr = territoryMap.get(a.territoryId);
      const terrHouseholds = householdsByTerritory.get(a.territoryId) || [];
      const terrVisits = visitsByTerritory.get(a.territoryId) || [];

      // Calculate exact assignment period coverage
      const stats = calculateTerritoryCoverage(terrHouseholds, {
        assignedAt: a.assignedAt,
        returnedAt: a.returnedAt,
        assignmentId: a.id,
        visits: terrVisits,
      });

      const coverageAtReturn =
        terrHouseholds.length > 0
          ? stats.coveragePercent
          : parseFloat(a.coverageAtAssignment || '0');

      let durationDays: number | null = null;
      if (a.assignedAt) {
        const start = new Date(a.assignedAt).getTime();
        const end = a.returnedAt ? new Date(a.returnedAt).getTime() : Date.now();
        durationDays = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
      }

      const effectiveDate = a.returnedAt || a.assignedAt || a.createdAt;
      const serviceYear = getServiceYear(effectiveDate);

      return {
        id: a.id,
        territoryId: a.territoryId,
        territoryNumber: a.territoryNumber || terr?.number || '—',
        territoryName: a.territoryName || terr?.name || 'Unnamed territory',
        assigneeName: a.assigneeName || a.groupName || 'Unassigned',
        assigneeEmail: a.assigneeEmail || null,
        isGroupAssignment: Boolean(a.serviceGroupId),
        groupName: a.groupName || null,
        assignedAt: a.assignedAt || null,
        dueAt: a.dueAt || null,
        returnedAt: a.returnedAt || null,
        coverageAtAssignment: parseFloat(a.coverageAtAssignment || '0'),
        coverageAtReturn,
        durationDays,
        status: a.status,
        serviceYear,
      };
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

  return { data: s13Records, isLoading };
}
