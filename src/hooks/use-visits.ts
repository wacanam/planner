import { useState, useEffect } from 'react';
import { getCachedData, cacheData, getDB } from '@/lib/offline-store';
import { mergePendingVisits, mergePendingHouseholds } from './use-pending-merge';
import { apiClient } from '@/lib/api-client';
import type { Visit, Household } from '@/types/api';

/**
 * Read visits from IDB cache. Refresh from API only after SW sync completes.
 * Never calls API directly for UI rendering.
 */
export function useMyVisits(
  filters?: { householdId?: string; assignmentId?: string }
) {
  const [visits, setVisits] = useState<(Visit & { _pending?: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFromCache = async () => {
    try {
      const cached = await getCachedData<Visit[]>('visits-cache', 'my-visits');
      const merged = await mergePendingVisits(cached ?? []);
      setVisits(merged);
    } catch (err) {
      console.error('[Hook] Failed to load visits from cache:', err);
    }
  };

  const refreshFromAPI = async () => {
    try {
      const fresh = await apiClient.get<Visit[]>('/api/visits');
      await cacheData('visits-cache', 'my-visits', fresh);
      const merged = await mergePendingVisits(fresh);
      setVisits(merged);
    } catch (err) {
      console.error('[Hook] Failed to refresh visits from API:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    // Load from cache immediately
    loadFromCache().then(() => setIsLoading(false));

    // Listen for SW sync messages to refresh from API
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'VISIT_SYNCED' || e.data?.type === 'HOUSEHOLD_SYNCED') {
        refreshFromAPI();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleMessage);
  }, []);

  return {
    visits,
    isLoading,
    error,
    mutate: refreshFromAPI,
    dataSource: ('cache' as 'server' | 'cache'),
  };
}

/**
 * Read household visits from IDB cache. Refresh from API only after SW sync.
 */
export function useHouseholdVisits(householdId: string | null) {
  const [visits, setVisits] = useState<(Visit & { publisherName?: string; _pending?: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFromCache = async () => {
    if (!householdId) {
      setVisits([]);
      setIsLoading(false);
      return;
    }
    try {
      const cached = await getCachedData<Visit[]>('visits-cache', `household-${householdId}`);
      const merged = await mergePendingVisits(cached ?? []);
      setVisits(merged as (Visit & { publisherName?: string; _pending?: boolean })[]);
    } catch (err) {
      console.error('[Hook] Failed to load household visits from cache:', err);
    }
  };

  const refreshFromAPI = async () => {
    if (!householdId) return;
    try {
      const fresh = await apiClient.get<Visit[]>(`/api/households/${householdId}/visits`);
      await cacheData('visits-cache', `household-${householdId}`, fresh);
      const merged = await mergePendingVisits(fresh);
      setVisits(merged as (Visit & { publisherName?: string; _pending?: boolean })[]);
    } catch (err) {
      console.error('[Hook] Failed to refresh household visits from API:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadFromCache().then(() => setIsLoading(false));

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'VISIT_SYNCED') {
        refreshFromAPI();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleMessage);
  }, [householdId]);

  return {
    visits,
    isLoading,
    error,
    mutate: refreshFromAPI,
  };
}

/**
 * Read territory visits from IDB cache. Refresh from API only after SW sync.
 */
export function useTerritoryVisits(territoryId: string | null) {
  const [visits, setVisits] = useState<(Visit & { _pending?: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFromCache = async () => {
    if (!territoryId) {
      setVisits([]);
      setIsLoading(false);
      return;
    }
    try {
      const cached = await getCachedData<Visit[]>('visits-cache', `territory-${territoryId}`);
      const merged = await mergePendingVisits(cached ?? []);
      setVisits(merged);
    } catch (err) {
      console.error('[Hook] Failed to load territory visits from cache:', err);
    }
  };

  const refreshFromAPI = async () => {
    if (!territoryId) return;
    try {
      const fresh = await apiClient.get<Visit[]>(`/api/territories/${territoryId}/visits`);
      await cacheData('visits-cache', `territory-${territoryId}`, fresh);
      const merged = await mergePendingVisits(fresh);
      setVisits(merged);
    } catch (err) {
      console.error('[Hook] Failed to refresh territory visits from API:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadFromCache().then(() => setIsLoading(false));

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'VISIT_SYNCED' || e.data?.type === 'TERRITORY_SYNCED') {
        refreshFromAPI();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleMessage);
  }, [territoryId]);

  return {
    visits,
    isLoading,
    error,
    mutate: refreshFromAPI,
    dataSource: ('cache' as 'server' | 'cache'),
  };
}

/**
 * Read households from IDB cache. Refresh from API only after SW sync.
 * This is the critical hook: shows pending households + synced households.
 */
export function useHouseholds() {
  const [households, setHouseholds] = useState<(Household & { _pending?: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFromCache = async () => {
    try {
      const cached = await getCachedData<Household[]>('households-cache', 'all');
      const merged = await mergePendingHouseholds(cached ?? []);
      setHouseholds(merged);
    } catch (err) {
      console.error('[Hook] Failed to load households from cache:', err);
    }
  };

  const refreshFromAPI = async () => {
    try {
      const fresh = await apiClient.get<Household[]>('/api/households');
      await cacheData('households-cache', 'all', fresh);
      const merged = await mergePendingHouseholds(fresh);
      setHouseholds(merged);
    } catch (err) {
      console.error('[Hook] Failed to refresh households from API:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    // Load from cache immediately (shows pending items right away)
    loadFromCache().then(() => setIsLoading(false));

    // Listen for SW sync messages to refresh from API
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'HOUSEHOLD_SYNCED') {
        refreshFromAPI();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleMessage);
  }, []);

  return {
    households,
    isLoading,
    error,
    mutate: refreshFromAPI,
    dataSource: ('cache' as 'server' | 'cache'),
  };
}
