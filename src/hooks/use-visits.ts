import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import {
  cacheHouseholds,
  getCachedHouseholds,
  cacheVisits,
  getCachedVisits,
} from '@/lib/visits-store';
import type { SWRConfiguration } from 'swr';
import type { Visit, Household } from '@/types/api';

export function useTerritoryVisits(territoryId: string | null, options?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<Visit[]>(
    territoryId ? `/api/territories/${territoryId}/visits` : null,
    async (url: string) => {
      // territoryId is non-null when the key is non-null
      const tid = territoryId as string;
      try {
        const result = await apiClient.get<Visit[]>(url);
        await cacheVisits(tid, result);
        return result;
      } catch {
        const cached = await getCachedVisits(tid);
        if (cached) return cached;
        throw new Error('Offline and no cached data available');
      }
    },
    options
  );
  return { visits: data ?? [], isLoading, error: error?.message ?? null, mutate };
}

export function useHouseholds(territoryId: string | null, options?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<Household[]>(
    territoryId ? `/api/households?territoryId=${territoryId}` : null,
    async (url: string) => {
      const tid = territoryId as string;
      try {
        const result = await apiClient.get<Household[]>(url);
        await cacheHouseholds(tid, result);
        return result;
      } catch {
        const cached = await getCachedHouseholds(tid);
        if (cached) return cached;
        throw new Error('Offline and no cached data available');
      }
    },
    options
  );
  return { households: data ?? [], isLoading, error: error?.message ?? null, mutate };
}
