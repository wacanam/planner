import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import { withOfflineCache } from '@/lib/offline-store';
import { mergePendingVisits, mergePendingHouseholds } from './use-pending-merge';
import type { DataSource } from '@/lib/offline-store';
import type { SWRConfiguration } from 'swr';
import type { Visit, Household } from '@/types/api';

// ── useMyVisits — GET /api/visits (current user's visits, filterable) ────────
export function useMyVisits(
  filters?: { householdId?: string; assignmentId?: string },
  options?: SWRConfiguration
) {
  const [dataSource, setDataSource] = useState<DataSource>('loading');
  const [mergedVisits, setMergedVisits] = useState<(Visit & { _pending?: boolean })[]>([]);

  const params = new URLSearchParams();
  if (filters?.householdId) params.set('householdId', filters.householdId);
  if (filters?.assignmentId) params.set('assignmentId', filters.assignmentId);
  const qs = params.toString();
  const key = `/api/visits${qs ? `?${qs}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<Visit[]>(
    key,
    withOfflineCache(
      'visits-cache',
      `my-visits-${qs}`,
      (url) => apiClient.get<Visit[]>(url),
      setDataSource
    ),
    options
  );

  // Merge pending items
  useEffect(() => {
    if (data) {
      mergePendingVisits(data).then(setMergedVisits);
    }
  }, [data]);

  return {
    visits: mergedVisits,
    isLoading,
    error: error?.message ?? null,
    mutate,
    dataSource: isLoading ? ('loading' as DataSource) : dataSource,
  };
}

// ── useHouseholdVisits — GET /api/households/:id/visits ───────────────────────
export function useHouseholdVisits(householdId: string | null, options?: SWRConfiguration) {
  const [mergedVisits, setMergedVisits] = useState<(Visit & { publisherName?: string; _pending?: boolean })[]>([]);

  const { data, error, isLoading, mutate } = useSWR<(Visit & { publisherName?: string })[]>(
    householdId ? `/api/households/${householdId}/visits` : null,
    (url: string) => apiClient.get<(Visit & { publisherName?: string })[]>(url),
    options
  );

  // Merge pending items
  useEffect(() => {
    if (data) {
      mergePendingVisits(data as Visit[]).then((merged) =>
        setMergedVisits(merged as (Visit & { publisherName?: string; _pending?: boolean })[])
      );
    }
  }, [data]);

  return {
    visits: mergedVisits,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useTerritoryVisits(territoryId: string | null, options?: SWRConfiguration) {
  const [dataSource, setDataSource] = useState<DataSource>('loading');

  const { data, error, isLoading, mutate } = useSWR<Visit[]>(
    territoryId ? `/api/territories/${territoryId}/visits` : null,
    withOfflineCache(
      'visits-cache',
      territoryId ?? '',
      (url) => apiClient.get<Visit[]>(url),
      setDataSource
    ),
    options
  );

  return {
    visits: data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
    dataSource: isLoading ? ('loading' as DataSource) : dataSource,
  };
}

export function useHouseholds(options?: SWRConfiguration) {
  const [dataSource, setDataSource] = useState<DataSource>('loading');
  const [mergedHouseholds, setMergedHouseholds] = useState<(Household & { _pending?: boolean })[]>([]);

  const { data, error, isLoading, mutate } = useSWR<Household[]>(
    '/api/households',
    withOfflineCache(
      'households-cache',
      'all',
      (url) => apiClient.get<Household[]>(url),
      setDataSource
    ),
    options
  );

  // Merge pending items
  useEffect(() => {
    if (data) {
      mergePendingHouseholds(data).then(setMergedHouseholds);
    }
  }, [data]);

  return {
    households: mergedHouseholds,
    isLoading,
    error: error?.message ?? null,
    mutate,
    dataSource: isLoading ? ('loading' as DataSource) : dataSource,
  };
}
