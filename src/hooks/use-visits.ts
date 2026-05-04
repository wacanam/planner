import { readFromIDB, useIDBStore } from '@/lib/idb-store';
import { mergePendingVisits, mergePendingHouseholds } from './use-pending-merge';
import { useEffect, useState } from 'react';
import useSWR, { type SWRConfiguration } from 'swr';
import { apiClient } from '@/lib/api-client';
import type { Visit, Household } from '@/types/api';

function ensureArrayData<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value;
  if (
    value &&
    typeof value === 'object' &&
    'data' in value &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: T[] }).data;
  }
  return [];
}

/**
 * Read visits ONLY from IDB cache.
 * Reactive: updates when IDB changes.
 */
export function useMyVisits(
  filters?: { householdId?: string; assignmentId?: string }
) {
  const [cachedVisits, isLoading, error] = useIDBStore<Visit[]>('visits-cache', 'my-visits', []);
  const [visits, setVisits] = useState<(Visit & { _pending?: boolean })[]>([]);

  // Merge pending items whenever cache updates
  useEffect(() => {
    (async () => {
      const visits = ensureArrayData<Visit>(cachedVisits);
      if (visits.length > 0) {
        const merged = await mergePendingVisits(visits);
        const filtered = merged.filter((visit) => {
          if (filters?.householdId && visit.householdId !== filters.householdId) return false;
          if (filters?.assignmentId && visit.assignmentId !== filters.assignmentId) return false;
          return true;
        });
        setVisits(filtered);
      } else {
        setVisits([]);
      }
    })();
  }, [cachedVisits, filters?.assignmentId, filters?.householdId]);

  return {
    visits,
    isLoading,
    error,
    dataSource: ('cache' as 'server' | 'cache'),
  };
}

/**
 * Read household visits ONLY from IDB cache.
 * Reactive: updates when IDB changes.
 */
export function useHouseholdVisits(householdId: string | null) {
  const [cachedVisits, isLoading, error] = useIDBStore<Visit[]>(
    'visits-cache',
    'my-visits',
    []
  );
  const [visits, setVisits] = useState<(Visit & { publisherName?: string; _pending?: boolean })[]>([]);

  // Merge pending items
  useEffect(() => {
    (async () => {
      const visits = ensureArrayData<Visit>(cachedVisits);
      if (householdId) {
        const merged = await mergePendingVisits(visits);
        const filtered = merged.filter((visit) => visit.householdId === householdId);
        setVisits(filtered as (Visit & { publisherName?: string; _pending?: boolean })[]);
      } else {
        setVisits([]);
      }
    })();
  }, [cachedVisits, householdId]);

  return {
    visits,
    isLoading,
    error,
  };
}

/**
 * Read territory visits ONLY from IDB cache.
 * Reactive: updates when IDB changes.
 */
export function useTerritoryVisits(territoryId: string | null) {
  const cacheKey = territoryId ? `territory-${territoryId}` : 'territory-null';
  const [cachedVisits, isLoading, error] = useIDBStore<Visit[]>(
    'visits-cache',
    cacheKey,
    []
  );
  const [visits, setVisits] = useState<(Visit & { _pending?: boolean })[]>([]);

  useEffect(() => {
    (async () => {
      const visits = ensureArrayData<Visit>(cachedVisits);
      if (visits.length > 0 && territoryId) {
        const merged = await mergePendingVisits(visits);
        setVisits(merged);
      } else {
        setVisits([]);
      }
    })();
  }, [cachedVisits, territoryId]);

  return {
    visits,
    isLoading,
    error,
    dataSource: ('cache' as 'server' | 'cache'),
  };
}

/**
 * Read households ONLY from IDB cache.
 * Reactive: updates when IDB changes.
 * Pending households merged in automatically with ⏳ badge.
 */
export function useHouseholds() {
  const [cachedHouseholds, isLoading, error] = useIDBStore<Household[]>(
    'households-cache',
    'all',
    []
  );
  const [households, setHouseholds] = useState<(Household & { _pending?: boolean })[]>([]);

  // Merge pending items whenever cache updates
  useEffect(() => {
    (async () => {
      const households = ensureArrayData<Household>(cachedHouseholds);
      if (households.length > 0) {
        const merged = await mergePendingHouseholds(households);
        setHouseholds(merged);
      } else {
        setHouseholds([]);
      }
    })();
  }, [cachedHouseholds]);

  return {
    households,
    isLoading,
    error,
    dataSource: ('cache' as 'server' | 'cache'),
    mutate: async () => {
      const fresh = await readFromIDB<Household[]>('households-cache', 'all');
      const merged = await mergePendingHouseholds(ensureArrayData<Household>(fresh));
      setHouseholds(merged);
    },
  };
}

/**
 * Fetch territory visits directly from the API using SWR.
 * Properly scoped to the territory via territory_assignments joins.
 * Replaces the IDB-cached useTerritoryVisits which was never populated.
 */
export function useTerritoryVisitsAPI(
  territoryId: string | null,
  options?: SWRConfiguration
) {
  const { data, error, isLoading, mutate } = useSWR<Visit[]>(
    territoryId ? `/api/territories/${territoryId}/visits` : null,
    (url: string) => apiClient.get<Visit[]>(url),
    { revalidateOnFocus: false, ...options }
  );
  return {
    visits: data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
    dataSource: 'server' as 'server' | 'cache',
  };
}
