import useSWR, { type SWRConfiguration } from 'swr';
import useSWRMutation from 'swr/mutation';
import { apiClient } from '@/lib/api-client';
import type { Territory, TerritoryRequest } from '@/types/api';

// ─── Territory list ───────────────────────────────────────────────────────────

export function useCongregationTerritories(
  congregationId: string | null | undefined,
  options?: SWRConfiguration
) {
  const { data, error, isLoading, mutate } = useSWR<Territory[]>(
    congregationId ? `/api/congregations/${congregationId}/territories` : null,
    (url) => apiClient.get<Territory[]>(url),
    { revalidateOnFocus: false, ...options }
  );
  return {
    data: data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

// ─── Create territory ─────────────────────────────────────────────────────────

export function useCreateTerritory(congregationId: string) {
  const { trigger, isMutating } = useSWRMutation(
    `/api/congregations/${congregationId}/territories`,
    (url: string, { arg }: { arg: Record<string, unknown> }) => apiClient.post(url, arg)
  );
  return { create: trigger, isCreating: isMutating };
}

// ─── Territory requests list ──────────────────────────────────────────────────

export function useCongregationTerritoryRequests(
  congregationId: string | null | undefined,
  status?: string,
  options?: SWRConfiguration
) {
  const query = status ? `?status=${status}` : '';
  const { data, error, isLoading, mutate } = useSWR<TerritoryRequest[]>(
    congregationId ? `/api/congregations/${congregationId}/territory-requests${query}` : null,
    (url) => apiClient.get<TerritoryRequest[]>(url),
    { revalidateOnFocus: false, ...options }
  );
  return {
    data: data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

// ─── Create territory request ─────────────────────────────────────────────────

export function useCreateTerritoryRequest(congregationId: string) {
  const { trigger, isMutating } = useSWRMutation(
    `/api/congregations/${congregationId}/territory-requests`,
    (url: string, { arg }: { arg: Record<string, unknown> }) => apiClient.post(url, arg)
  );
  return { request: trigger, isRequesting: isMutating };
}

// ─── Review territory request ─────────────────────────────────────────────────

export function useReviewTerritoryRequest(congregationId: string) {
  const { trigger, isMutating } = useSWRMutation(
    `/api/congregations/${congregationId}/territory-requests`,
    (
      _url: string,
      {
        arg,
      }: {
        arg: {
          requestId: string;
          status: string;
          responseMessage?: string | null;
          territoryId?: string;
        };
      }
    ) =>
      apiClient.patch(`/api/congregations/${congregationId}/territory-requests/${arg.requestId}`, {
        status: arg.status,
        responseMessage: arg.responseMessage,
        ...(arg.territoryId ? { territoryId: arg.territoryId } : {}),
      })
  );
  return { reviewRequest: trigger, isReviewing: isMutating };
}

// ─── Territory detail ─────────────────────────────────────────────────────────

export function useTerritoryDetail(
  territoryId: string | null | undefined,
  options?: SWRConfiguration
) {
  const { data, error, isLoading, mutate } = useSWR<Territory>(
    territoryId ? `/api/territories/${territoryId}` : null,
    (url) => apiClient.get<Territory>(url),
    { revalidateOnFocus: false, ...options }
  );
  return {
    territory: data ?? null,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}
