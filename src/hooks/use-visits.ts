import { useIDBStore, getPendingWrites } from '@/lib/idb-store';
import { mergePendingVisits, mergePendingHouseholds } from './use-pending-merge';
import { useEffect, useState } from 'react';
import type { Visit, Household } from '@/types/api';

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
      if (cachedVisits) {
        const merged = await mergePendingVisits(cachedVisits);
        setVisits(merged);
      }
    })();
  }, [cachedVisits]);

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
  const cacheKey = householdId ? `household-${householdId}` : 'household-null';
  const [cachedVisits, isLoading, error] = useIDBStore<Visit[]>(
    'visits-cache',
    cacheKey,
    []
  );
  const [visits, setVisits] = useState<(Visit & { publisherName?: string; _pending?: boolean })[]>([]);

  // Merge pending items
  useEffect(() => {
    (async () => {
      if (cachedVisits && householdId) {
        const merged = await mergePendingVisits(cachedVisits);
        setVisits(merged as (Visit & { publisherName?: string; _pending?: boolean })[]);
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
      if (cachedVisits && territoryId) {
        const merged = await mergePendingVisits(cachedVisits);
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
      if (cachedHouseholds) {
        const merged = await mergePendingHouseholds(cachedHouseholds);
        setHouseholds(merged);
      }
    })();
  }, [cachedHouseholds]);

  return {
    households,
    isLoading,
    error,
    dataSource: ('cache' as 'server' | 'cache'),
  };
}
