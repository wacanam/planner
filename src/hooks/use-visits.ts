import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import { visitsOfflineFetcher, householdsOfflineFetcher } from '@/lib/visits-store';
import type { SWRConfiguration } from 'swr';
import type { Visit, Household } from '@/types/api';

export function useTerritoryVisits(territoryId: string | null, options?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<Visit[]>(
    territoryId ? `/api/territories/${territoryId}/visits` : null,
    visitsOfflineFetcher(territoryId ?? '', (url) => apiClient.get<Visit[]>(url)),
    options,
  );
  return { visits: data ?? [], isLoading, error: error?.message ?? null, mutate };
}

export function useHouseholds(territoryId: string | null, options?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<Household[]>(
    territoryId ? `/api/households?territoryId=${territoryId}` : null,
    householdsOfflineFetcher(territoryId ?? '', (url) => apiClient.get<Household[]>(url)),
    options,
  );
  return { households: data ?? [], isLoading, error: error?.message ?? null, mutate };
}
