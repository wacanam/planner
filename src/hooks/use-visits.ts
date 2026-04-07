import { useState, useEffect } from 'react';
import { getCachedData, getDB } from '@/lib/offline-store';
import { mergePendingVisits, mergePendingHouseholds } from './use-pending-merge';
import type { Visit, Household } from '@/types/api';

/**
 * Read visits ONLY from IDB cache.
 * Never calls API. SW updates cache in background.
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
      setError(null);
    } catch (err) {
      console.error('[Hook] Failed to load visits from IDB:', err);
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadFromCache();

    // Listen for SW sync messages to reload from IDB
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'VISIT_SYNCED' || e.data?.type === 'HOUSEHOLD_SYNCED' || e.data?.type === 'CACHE_UPDATED') {
        loadFromCache();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleMessage);
  }, []);

  return {
    visits,
    isLoading,
    error,
    mutate: loadFromCache,
    dataSource: ('cache' as 'server' | 'cache'),
  };
}

/**
 * Read household visits ONLY from IDB cache.
 * Never calls API. SW updates cache in background.
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
      setError(null);
    } catch (err) {
      console.error('[Hook] Failed to load household visits from IDB:', err);
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadFromCache();

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'VISIT_SYNCED' || e.data?.type === 'CACHE_UPDATED') {
        loadFromCache();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleMessage);
  }, [householdId]);

  return {
    visits,
    isLoading,
    error,
    mutate: loadFromCache,
  };
}

/**
 * Read territory visits ONLY from IDB cache.
 * Never calls API. SW updates cache in background.
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
      setError(null);
    } catch (err) {
      console.error('[Hook] Failed to load territory visits from IDB:', err);
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadFromCache();

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'VISIT_SYNCED' || e.data?.type === 'TERRITORY_SYNCED' || e.data?.type === 'CACHE_UPDATED') {
        loadFromCache();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleMessage);
  }, [territoryId]);

  return {
    visits,
    isLoading,
    error,
    mutate: loadFromCache,
    dataSource: ('cache' as 'server' | 'cache'),
  };
}

/**
 * Read households ONLY from IDB cache.
 * Never calls API. SW updates cache in background.
 * Pending households merged in immediately with ⏳ badge.
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
      setError(null);
    } catch (err) {
      console.error('[Hook] Failed to load households from IDB:', err);
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadFromCache();

    // Listen for ANY cache update from SW
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'HOUSEHOLD_SYNCED' || e.data?.type === 'CACHE_UPDATED') {
        loadFromCache();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleMessage);
  }, []);

  return {
    households,
    isLoading,
    error,
    mutate: loadFromCache,
    dataSource: ('cache' as 'server' | 'cache'),
  };
}
