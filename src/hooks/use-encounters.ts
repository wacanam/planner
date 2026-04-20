import { useEffect, useState } from 'react';
import useSWR, { type SWRConfiguration } from 'swr';
import { apiClient } from '@/lib/api-client';
import {
  clearPendingEncounter,
  getPendingEncounters,
  queueEncounter,
  registerVisitSync,
} from '@/lib/visits-store';
import type { Encounter } from '@/types/api';
import { mergePendingEncounters } from './use-pending-merge';

export function useVisitEncounters(visitId: string | null, options?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<Encounter[]>(
    visitId ? `/api/visits/${visitId}/encounters` : null,
    (url: string) => apiClient.get<Encounter[]>(url),
    options
  );

  return {
    encounters: data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useMyEncounters(options?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<Encounter[]>(
    '/api/profile/encounters',
    (url: string) => apiClient.get<Encounter[]>(url),
    options
  );
  const [encounters, setEncounters] = useState<(Encounter & { _pending?: boolean })[]>([]);

  useEffect(() => {
    (async () => {
      const merged = await mergePendingEncounters(data ?? []);
      setEncounters(merged);
    })();
  }, [data]);

  return {
    encounters,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useAddEncounter() {
  const addEncounter = async (data: Record<string, unknown>, visitId?: string | null) => {
    const payload = visitId ? { ...data, visitId } : data;
    const pendingId = await queueEncounter(payload);
    await registerVisitSync();
    return pendingId;
  };

  return { addEncounter, getPendingEncounters, clearPendingEncounter };
}
