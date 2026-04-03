import { useState } from 'react';
import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import { withOfflineCache } from '@/lib/offline-store';
import type { DataSource } from '@/lib/offline-store';
import type { SWRConfiguration } from 'swr';
import type { Visit, Household } from '@/types/api';

export function useTerritoryVisits(territoryId: string | null, options?: SWRConfiguration) {
  const [dataSource, setDataSource] = useState<DataSource>('loading');

  const { data, error, isLoading, mutate } = useSWR<Visit[]>(
    territoryId ? `/api/territories/${territoryId}/visits` : null,
    withOfflineCache(
      'visits-cache',
      territoryId ?? '',
      (url) => apiClient.get<Visit[]>(url),
      setDataSource,
    ),
    options,
  );

  if (!isLoading && data !== undefined && dataSource === 'loading') {
    // Already resolved but callback not yet fired — infer from cache check is done
  }

  return {
    visits: data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
    dataSource: isLoading ? ('loading' as DataSource) : dataSource,
  };
}

export function useHouseholds(territoryId: string | null, options?: SWRConfiguration) {
  const [dataSource, setDataSource] = useState<DataSource>('loading');

  const { data, error, isLoading, mutate } = useSWR<Household[]>(
    territoryId ? `/api/households?territoryId=${territoryId}` : null,
    withOfflineCache(
      'households-cache',
      territoryId ?? '',
      (url) => apiClient.get<Household[]>(url),
      setDataSource,
    ),
    options,
  );

  return {
    households: data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
    dataSource: isLoading ? ('loading' as DataSource) : dataSource,
  };
}
