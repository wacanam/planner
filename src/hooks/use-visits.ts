import { writeToIDB, readFromIDB } from '@/lib/idb-store';
import { mergePendingVisits, mergePendingHouseholds } from './use-pending-merge';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
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
 * Fetch visits from API, fall back to IDB cache when offline.
 * Updates IDB cache on each successful API fetch.
 */
export function useMyVisits(
  filters?: { householdId?: string; assignmentId?: string }
) {
  const [visits, setVisits] = useState<(Visit & { _pending?: boolean })[]>([]);
  const [dataSource, setDataSource] = useState<'server' | 'cache'>('server');

  const { data: rawData, isLoading, error, mutate } = useSWR<Visit[]>(
    '/api/visits',
    async (url: string) => {
      try {
        const result = await apiClient.get<Visit[]>(url);
        await writeToIDB('visits-cache', 'my-visits', result, 'sw');
        setDataSource('server');
        return result;
      } catch (apiErr) {
        console.warn('[useMyVisits] API fetch failed, falling back to IDB cache:', apiErr);
        // Offline or API error — try IDB cache
        const cached = await readFromIDB<Visit[]>('visits-cache', 'my-visits').catch((idbErr) => {
          console.warn('[useMyVisits] IDB fallback read failed:', idbErr);
          return null;
        });
        if (cached !== null) {
          setDataSource('cache');
          return ensureArrayData<Visit>(cached);
        }
        return [];
      }
    },
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    (async () => {
      const raw = ensureArrayData<Visit>(rawData ?? []);
      const merged = await mergePendingVisits(raw);
      const filtered = merged.filter((visit) => {
        if (filters?.householdId && visit.householdId !== filters.householdId) return false;
        if (filters?.assignmentId && visit.assignmentId !== filters.assignmentId) return false;
        return true;
      });
      setVisits(filtered);
    })();
  }, [rawData, filters?.assignmentId, filters?.householdId]);

  // Listen for SW sync events to refresh
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const { type } = (e.data ?? {}) as { type?: string };
      if (type === 'VISIT_SYNCED' || type === 'CACHE_UPDATED') {
        void mutate();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [mutate]);

  return {
    visits,
    isLoading,
    error,
    dataSource,
    mutate,
  };
}

/**
 * Read visits for a specific household.
 * Fetches from API and falls back to IDB cache when offline.
 */
export function useHouseholdVisits(householdId: string | null) {
  const [visits, setVisits] = useState<(Visit & { publisherName?: string; _pending?: boolean })[]>([]);

  const { data: rawData, isLoading, error, mutate } = useSWR<Visit[]>(
    householdId ? `/api/visits?householdId=${householdId}` : null,
    async (url: string) => {
      try {
        const result = await apiClient.get<Visit[]>(url);
        return result;
      } catch (apiErr) {
        console.warn('[useHouseholdVisits] API fetch failed, falling back to IDB cache:', apiErr);
        // Offline — try full visits cache and filter
        const cached = await readFromIDB<Visit[]>('visits-cache', 'my-visits').catch((idbErr) => {
          console.warn('[useHouseholdVisits] IDB fallback read failed:', idbErr);
          return null;
        });
        const all = ensureArrayData<Visit>(cached ?? []);
        return all.filter((v) => v.householdId === householdId);
      }
    },
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    (async () => {
      const raw = ensureArrayData<Visit>(rawData ?? []);
      const merged = await mergePendingVisits(raw);
      const filtered = merged.filter((v) => v.householdId === householdId);
      setVisits(filtered as (Visit & { publisherName?: string; _pending?: boolean })[]);
    })();
  }, [rawData, householdId]);

  // Listen for SW sync events to refresh
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const { type } = (e.data ?? {}) as { type?: string };
      if (type === 'VISIT_SYNCED' || type === 'CACHE_UPDATED') {
        void mutate();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [mutate]);

  return {
    visits,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Read territory visits ONLY from IDB cache.
 * Reactive: updates when IDB changes.
 */
export function useTerritoryVisits(territoryId: string | null) {
  const cacheKey = territoryId ? `territory-${territoryId}` : 'territory-null';
  const [visits, setVisits] = useState<(Visit & { _pending?: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    (async () => {
      try {
        const cached = await readFromIDB<Visit[]>('visits-cache', cacheKey);
        const raw = ensureArrayData<Visit>(cached ?? []);
        if (territoryId && raw.length > 0) {
          const merged = await mergePendingVisits(raw);
          setVisits(merged);
        } else {
          setVisits([]);
        }
      } catch (err) {
        console.warn('[useTerritoryVisits] IDB read failed:', err);
        setError(String(err));
        setVisits([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [cacheKey, territoryId]);

  return {
    visits,
    isLoading,
    error,
    dataSource: ('cache' as 'server' | 'cache'),
  };
}

/**
 * Fetch households from API, fall back to IDB cache when offline.
 * Updates IDB cache on each successful API fetch.
 * Pending households merged in automatically.
 */
export function useHouseholds() {
  const [households, setHouseholds] = useState<(Household & { _pending?: boolean })[]>([]);
  const [dataSource, setDataSource] = useState<'server' | 'cache'>('server');

  const { data: rawData, isLoading, error, mutate } = useSWR<Household[]>(
    '/api/households',
    async (url: string) => {
      try {
        const result = await apiClient.get<Household[]>(url);
        await writeToIDB('households-cache', 'all', result, 'sw');
        setDataSource('server');
        return result;
      } catch (apiErr) {
        console.warn('[useHouseholds] API fetch failed, falling back to IDB cache:', apiErr);
        // Offline or API error — try IDB cache
        const cached = await readFromIDB<Household[]>('households-cache', 'all').catch((idbErr) => {
          console.warn('[useHouseholds] IDB fallback read failed:', idbErr);
          return null;
        });
        if (cached !== null) {
          setDataSource('cache');
          return ensureArrayData<Household>(cached);
        }
        return [];
      }
    },
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    (async () => {
      const raw = ensureArrayData<Household>(rawData ?? []);
      const merged = await mergePendingHouseholds(raw);
      setHouseholds(merged);
    })();
  }, [rawData]);

  // Listen for SW sync events to refresh
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const { type } = (e.data ?? {}) as { type?: string };
      if (type === 'HOUSEHOLD_SYNCED' || type === 'CACHE_UPDATED') {
        void mutate();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [mutate]);

  return {
    households,
    isLoading,
    error,
    dataSource,
    mutate,
  };
}
