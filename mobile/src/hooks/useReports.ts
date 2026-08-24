// mobile/src/hooks/useReports.ts
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { FIRESTORE_COLLECTIONS, getPlannerFirestore } from '@/lib/firebase';
import type {
  Assignment,
  CoverageReport,
  CoverageTerritory,
  Household,
  S13AssignmentRecord,
  Territory,
  TerritoryHealthStatus,
} from '@/types/api';

export function useCoverageReport(congregationId: string | null | undefined) {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!congregationId) {
      setTerritories([]);
      setHouseholds([]);
      setAssignments([]);
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
        setIsLoading(false);
      }
    );

    return () => {
      unsubTerritories();
      unsubHouseholds();
      unsubAssignments();
    };
  }, [congregationId]);

  const report: CoverageReport = useMemo(() => {
    const totalTerritories = territories.length;
    let totalDoors = 0;
    let workedDoors = 0;

    const mappedTerritories: CoverageTerritory[] = territories.map((t) => {
      const tHouseholds = households.filter((h) => h.territoryId === t.id);
      const tDoors = tHouseholds.length;
      const tWorked = tHouseholds.filter((h) => h.lastVisitDate).length;
      totalDoors += tDoors;
      workedDoors += tWorked;

      const coveragePercent =
        tDoors > 0 ? (tWorked / tDoors) * 100 : parseFloat(t.coveragePercent || '0');

      let healthStatus: TerritoryHealthStatus = 'fresh';
      let daysSinceWorked: number | null = null;

      // Calculate days since worked
      const recentDates = tHouseholds.map((h) => h.lastVisitDate).filter(Boolean) as string[];
      if (recentDates.length > 0) {
        recentDates.sort((a, b) => b.localeCompare(a));
        const lastDate = new Date(recentDates[0]);
        daysSinceWorked = Math.max(
          0,
          Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
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
        coveragePercent,
        householdsCount: tDoors,
        workedDoors: tWorked,
        unworkedDoors: Math.max(0, tDoors - tWorked),
        healthStatus,
        daysSinceWorked,
        publisherName: t.publisherName || undefined,
        groupName: t.groupName || undefined,
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
  }, [territories, households]);

  return { data: report, isLoading };
}

export function useS13Report(congregationId: string | null | undefined) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!congregationId) {
      setAssignments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query(
      collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.assignments),
      where('congregationId', '==', congregationId)
    );
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Assignment)
          .sort((a, b) => (b.assignedAt || '').localeCompare(a.assignedAt || ''));
        setAssignments(list);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      }
    );
  }, [congregationId]);

  const s13Records: S13AssignmentRecord[] = useMemo(() => {
    return assignments.map((a) => {
      let durationDays: number | null = null;
      if (a.assignedAt) {
        const start = new Date(a.assignedAt).getTime();
        const end = a.returnedAt ? new Date(a.returnedAt).getTime() : Date.now();
        durationDays = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
      }

      return {
        id: a.id,
        territoryId: a.territoryId,
        territoryNumber: a.territoryNumber || '—',
        territoryName: a.territoryName || 'Unnamed territory',
        assigneeName: a.assigneeName || a.groupName || 'Unassigned',
        assigneeEmail: a.assigneeEmail || null,
        isGroupAssignment: Boolean(a.serviceGroupId),
        groupName: a.groupName || null,
        assignedAt: a.assignedAt || null,
        dueAt: a.dueAt || null,
        returnedAt: a.returnedAt || null,
        coverageAtAssignment: parseFloat(a.coverageAtAssignment || '0'),
        coverageAtReturn: 100,
        durationDays,
        status: a.status,
      };
    });
  }, [assignments]);

  return { data: s13Records, isLoading };
}
