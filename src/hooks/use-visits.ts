import { useEffect, useMemo, useState } from 'react';
import { toHouseholdView, toVisitView, watchHouseholds, watchVisits } from '@/lib/local-first';
import type { HouseholdFilters } from '@/lib/local-first/households';
import type { LocalHousehold, LocalVisit } from '@/lib/local-first/types';
import { canViewAllCongregationRecords } from '@/lib/permissions';
import type { Household, Visit } from '@/types/api';

function sortVisits(visits: Visit[]) {
  return [...visits].sort((left, right) => right.visitDate.localeCompare(left.visitDate));
}

export function useVisitRecords(filters?: {
  householdId?: string;
  assignmentId?: string;
  userId?: string;
  userRole?: string;
  groupMateUserIds?: string[] | Set<string> | null;
}) {
  const householdId = filters?.householdId ?? null;
  const assignmentId = filters?.assignmentId ?? null;
  const userId = filters?.userId ?? null;
  const userRole = filters?.userRole ?? null;
  const groupMateUserIds = filters?.groupMateUserIds ?? null;
  const [visits, setVisits] = useState<LocalVisit[]>([]);
  const [households, setHouseholds] = useState<LocalHousehold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const handleError = (err: Error) => {
      setError(err.message);
      setIsLoading(false);
    };
    const unsubscribeVisits = watchVisits(
      { householdId, assignmentId, userId, userRole, groupMateUserIds },
      (records) => {
        setVisits(records);
        setError(null);
        setIsLoading(false);
      },
      handleError
    );
    const unsubscribeHouseholds = watchHouseholds(
      { personalOnly: true, userId, userRole, groupMateUserIds },
      (records) => {
        setHouseholds(records);
        setError(null);
        setIsLoading(false);
      },
      handleError
    );
    return () => {
      unsubscribeVisits();
      unsubscribeHouseholds();
    };
  }, [assignmentId, groupMateUserIds, householdId, userId, userRole]);

  const householdMap = useMemo(
    () => new Map(households.map((household) => [household.id, household] as const)),
    [households]
  );
  const groupMateSet = useMemo(() => {
    if (!groupMateUserIds) return null;
    return groupMateUserIds instanceof Set ? groupMateUserIds : new Set(groupMateUserIds);
  }, [groupMateUserIds]);

  const mappedVisits = useMemo(() => {
    let filteredVisits = visits;
    if (userId && !canViewAllCongregationRecords(userRole)) {
      filteredVisits = visits.filter(
        (v) =>
          v.userId === userId ||
          householdMap.has(v.householdId) ||
          Boolean(groupMateSet && v.userId && groupMateSet.has(v.userId))
      );
    }
    return sortVisits(
      filteredVisits.map((visit) => toVisitView(visit, householdMap.get(visit.householdId)))
    );
  }, [groupMateSet, householdMap, userId, userRole, visits]);

  return { visits: mappedVisits, households, isLoading, error };
}

export function useMyVisits(filters?: {
  householdId?: string;
  assignmentId?: string;
  userId?: string;
  userRole?: string;
  groupMateUserIds?: string[] | Set<string> | null;
}) {
  return useVisitRecords(filters);
}

export function useHouseholdVisits(householdId: string | null) {
  return useVisitRecords(householdId ? { householdId } : undefined);
}

export function useTerritoryVisits(territoryId: string | null) {
  const [visits, setVisits] = useState<LocalVisit[]>([]);
  const [households, setHouseholds] = useState<LocalHousehold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const handleError = (err: Error) => {
      setError(err.message);
      setIsLoading(false);
    };
    const unsubscribeVisits = watchVisits(
      undefined,
      (records) => {
        setVisits(records);
        setError(null);
        setIsLoading(false);
      },
      handleError
    );
    const unsubscribeHouseholds = watchHouseholds(
      territoryId ? { territoryId } : undefined,
      (records) => {
        setHouseholds(records);
        setError(null);
        setIsLoading(false);
      },
      handleError
    );
    return () => {
      unsubscribeVisits();
      unsubscribeHouseholds();
    };
  }, [territoryId]);

  const householdMap = useMemo(
    () => new Map(households.map((household) => [household.id, household] as const)),
    [households]
  );
  const mappedVisits = useMemo(() => {
    return sortVisits(
      visits
        .filter((visit) => householdMap.has(visit.householdId))
        .map((visit) => toVisitView(visit, householdMap.get(visit.householdId)))
    );
  }, [householdMap, visits]);

  return { visits: mappedVisits, isLoading, error };
}

export function useHouseholds(filters?: HouseholdFilters) {
  const congregationId = filters?.congregationId ?? null;
  const territoryId = filters?.territoryId ?? null;
  const userId = filters?.userId ?? null;
  const userRole = filters?.userRole ?? null;
  const personalOnly = filters?.personalOnly ?? false;
  const groupMateUserIds = filters?.groupMateUserIds ?? null;

  const [records, setRecords] = useState<LocalHousehold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = watchHouseholds(
      { congregationId, territoryId, userId, userRole, personalOnly, groupMateUserIds },
      (households) => {
        setRecords(households);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
    return unsubscribe;
  }, [congregationId, groupMateUserIds, personalOnly, territoryId, userId, userRole]);

  const households = useMemo(
    () =>
      records.map(toHouseholdView).sort((left, right) => left.address.localeCompare(right.address)),
    [records]
  );

  return { households: households as Household[], isLoading, error };
}
