import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/schema';
import {
  createEncounter,
  toEncounterView,
  watchEncounters,
  watchHouseholds,
  watchVisits,
} from '@/lib/local-first';
import type { LocalEncounter, LocalHousehold, LocalVisit } from '@/lib/local-first/types';
import { canViewAllCongregationRecords } from '@/lib/permissions';
import type { Encounter } from '@/types/api';

function sortEncounters(encounters: Encounter[]) {
  return [...encounters].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function useEncounterRecords(filters?: {
  congregationId?: string;
  visitId?: string | null;
  householdId?: string | null;
  userId?: string | null;
  userRole?: string | null;
  groupMateUserIds?: string[] | Set<string> | null;
}) {
  const congregationId = filters?.congregationId ?? null;
  const visitId = filters?.visitId ?? null;
  const householdId = filters?.householdId ?? null;
  const userId = filters?.userId ?? null;
  const userRole = filters?.userRole ?? null;
  const groupMateUserIds = filters?.groupMateUserIds ?? null;

  const [encounters, setEncounters] = useState<LocalEncounter[]>([]);
  const [households, setHouseholds] = useState<LocalHousehold[]>([]);
  const [visits, setVisits] = useState<LocalVisit[]>([]);
  const [memberUserIds, setMemberUserIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!congregationId && !userId && !householdId && !visitId) {
      setEncounters([]);
      setHouseholds([]);
      setVisits([]);
      setMemberUserIds(new Set());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const handleError = (err: Error) => {
      setError(err.message);
      setIsLoading(false);
    };
    const unsubscribeEncounters = watchEncounters(
      { congregationId, visitId, householdId, userId, userRole, groupMateUserIds },
      (records) => {
        setEncounters(records);
        setError(null);
        setIsLoading(false);
      },
      handleError
    );
    const unsubscribeHouseholds = watchHouseholds(
      { congregationId, personalOnly: true, userId, userRole, groupMateUserIds },
      setHouseholds,
      handleError
    );
    const unsubscribeVisits = watchVisits(
      congregationId ? { congregationId } : undefined,
      setVisits,
      handleError
    );

    let unsubscribeMembers = () => {};
    if (congregationId) {
      const q = query(
        collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.congregationMembers),
        where('congregationId', '==', congregationId),
        where('status', 'in', ['active', 'approved'])
      );
      unsubscribeMembers = onSnapshot(
        q,
        (snapshot) => {
          const ids = new Set<string>();
          for (const d of snapshot.docs) {
            const data = d.data();
            if (data.userId) ids.add(String(data.userId));
            ids.add(d.id);
          }
          setMemberUserIds(ids);
        },
        () => {}
      );
    } else {
      setMemberUserIds(new Set());
    }

    return () => {
      unsubscribeEncounters();
      unsubscribeHouseholds();
      unsubscribeVisits();
      unsubscribeMembers();
    };
  }, [congregationId, groupMateUserIds, householdId, userId, userRole, visitId]);

  const householdMap = useMemo(
    () => new Map(households.map((household) => [household.id, household] as const)),
    [households]
  );
  const visitMap = useMemo(
    () => new Map(visits.map((visit) => [visit.id, visit] as const)),
    [visits]
  );
  const groupMateSet = useMemo(() => {
    if (!groupMateUserIds) return null;
    return groupMateUserIds instanceof Set ? groupMateUserIds : new Set(groupMateUserIds);
  }, [groupMateUserIds]);

  const mappedEncounters = useMemo(() => {
    let filteredEncounters = encounters;
    if (congregationId) {
      filteredEncounters = filteredEncounters.filter((e) => {
        // 1. Direct congregationId match
        if (e.congregationId) {
          return e.congregationId === congregationId;
        }
        // 2. Household-derived congregationId
        if (e.householdId) {
          const hh = householdMap.get(e.householdId);
          if (hh) {
            return !hh.congregationId || hh.congregationId === congregationId;
          }
          return false;
        }
        // If linked to a visit
        if (e.visitId && visitMap.has(e.visitId)) {
          const v = visitMap.get(e.visitId);
          if (v?.congregationId) return v.congregationId === congregationId;
          if (v?.householdId) {
            const hh = householdMap.get(v.householdId);
            return Boolean(hh && (!hh.congregationId || hh.congregationId === congregationId));
          }
          if (v?.userId) return memberUserIds.has(v.userId) || v.userId === userId;
        }
        // 3. User-membership-derived congregationId
        if (e.userId) {
          return memberUserIds.has(e.userId) || e.userId === userId;
        }
        return false;
      });
    }
    if (userId && !canViewAllCongregationRecords(userRole)) {
      filteredEncounters = filteredEncounters.filter(
        (e) =>
          e.userId === userId ||
          (e.householdId && householdMap.has(e.householdId)) ||
          Boolean(groupMateSet && e.userId && groupMateSet.has(e.userId))
      );
    }
    return sortEncounters(
      filteredEncounters.map((encounter) =>
        toEncounterView(
          encounter,
          encounter.householdId ? householdMap.get(encounter.householdId) : null,
          encounter.visitId ? visitMap.get(encounter.visitId) : undefined,
          congregationId && (memberUserIds.has(encounter.userId ?? '') || encounter.userId === userId)
            ? congregationId
            : null
        )
      )
    );
  }, [congregationId, encounters, groupMateSet, householdMap, memberUserIds, userId, userRole, visitMap]);

  return { encounters: mappedEncounters, isLoading, error };
}

export function useVisitEncounters(visitId: string | null) {
  return useEncounterRecords({ visitId });
}

export function useMyEncounters(filters?: {
  congregationId?: string;
  visitId?: string | null;
  householdId?: string | null;
  userId?: string | null;
  userRole?: string | null;
  groupMateUserIds?: string[] | Set<string> | null;
}) {
  return useEncounterRecords(filters);
}

export function useTerritoryEncounters(
  territoryId: string | null,
  congregationId?: string | null
) {
  const [encounters, setEncounters] = useState<LocalEncounter[]>([]);
  const [households, setHouseholds] = useState<LocalHousehold[]>([]);
  const [visits, setVisits] = useState<LocalVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!territoryId && !congregationId) {
      setEncounters([]);
      setHouseholds([]);
      setVisits([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const handleError = (err: Error) => {
      setError(err.message);
      setIsLoading(false);
    };
    const unsubscribeEncounters = watchEncounters(
      congregationId ? { congregationId } : undefined,
      (records) => {
        setEncounters(records);
        setError(null);
        setIsLoading(false);
      },
      handleError
    );
    const unsubscribeHouseholds = watchHouseholds(
      { territoryId: territoryId ?? undefined, congregationId: congregationId ?? undefined },
      (records) => {
        setHouseholds(records);
        setError(null);
        setIsLoading(false);
      },
      handleError
    );
    const unsubscribeVisits = watchVisits(
      congregationId ? { congregationId } : undefined,
      setVisits,
      handleError
    );
    return () => {
      unsubscribeEncounters();
      unsubscribeHouseholds();
      unsubscribeVisits();
    };
  }, [congregationId, territoryId]);

  const householdMap = useMemo(
    () => new Map(households.map((household) => [household.id, household] as const)),
    [households]
  );
  const visitMap = useMemo(
    () => new Map(visits.map((visit) => [visit.id, visit] as const)),
    [visits]
  );

  const mappedEncounters = useMemo(() => {
    return sortEncounters(
      encounters
        .filter((e) => e.householdId && householdMap.has(e.householdId))
        .map((encounter) =>
          toEncounterView(
            encounter,
            encounter.householdId ? householdMap.get(encounter.householdId) : null,
            encounter.visitId ? visitMap.get(encounter.visitId) : null
          )
        )
    );
  }, [encounters, householdMap, visitMap]);

  return { encounters: mappedEncounters, households, isLoading, error };
}

export function useAddEncounter() {
  const addEncounter = async (data: Record<string, unknown>, visitId?: string | null) => {
    const encounter = await createEncounter({
      ...data,
      visitId: visitId ?? (data.visitId as string | null | undefined) ?? null,
      response: String(data.response ?? 'other'),
    });
    return encounter.id;
  };

  return {
    addEncounter,
  };
}
