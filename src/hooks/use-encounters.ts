import useSWR, { type SWRConfiguration } from 'swr';
import { apiClient } from '@/lib/api-client';
import {
  queueEncounter,
  getPendingEncounters,
  clearPendingEncounter,
  registerVisitSync,
} from '@/lib/visits-store';
import type { Encounter } from '@/types/api';

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

  return {
    encounters: data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useAddEncounter() {
  const addEncounter = async (visitId: string, data: Record<string, unknown>) => {
    const payload = { ...data, visitId };
    const pendingId = await queueEncounter(payload);
    await registerVisitSync();
    return pendingId;
  };

  return { addEncounter, getPendingEncounters, clearPendingEncounter };
}
