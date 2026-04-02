import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { fetchWithAuth } from '@/lib/api-client';

const fetcher = (url: string) => fetchWithAuth(url);

export function useCongregationTerritories(congregationId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    congregationId ? `/api/congregations/${congregationId}/territories` : null,
    fetcher
  );
  return {
    data: (data as { data: unknown[] } | undefined)?.data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useCreateTerritory(congregationId: string) {
  const { trigger, isMutating } = useSWRMutation(
    `/api/congregations/${congregationId}/territories`,
    (url: string, { arg }: { arg: Record<string, unknown> }) =>
      fetchWithAuth(url, { method: 'POST', body: JSON.stringify(arg) })
  );
  return { create: trigger, isCreating: isMutating };
}

export function useCongregationTerritoryRequests(congregationId: string, status?: string) {
  const query = status ? `?status=${status}` : '';
  const { data, error, isLoading, mutate } = useSWR(
    congregationId ? `/api/congregations/${congregationId}/territory-requests${query}` : null,
    fetcher
  );
  return {
    data: (data as { data: unknown[] } | undefined)?.data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useCreateTerritoryRequest(congregationId: string) {
  const { trigger, isMutating } = useSWRMutation(
    `/api/congregations/${congregationId}/territory-requests`,
    (url: string, { arg }: { arg: Record<string, unknown> }) =>
      fetchWithAuth(url, { method: 'POST', body: JSON.stringify(arg) })
  );
  return { request: trigger, isRequesting: isMutating };
}

export function useReviewTerritoryRequest(congregationId: string) {
  const { trigger, isMutating } = useSWRMutation(
    `/api/congregations/${congregationId}/territory-requests`,
    (
      _url: string,
      { arg }: { arg: { requestId: string; status: string; responseMessage?: string | null; territoryId?: string } }
    ) =>
      fetchWithAuth(
        `/api/congregations/${congregationId}/territory-requests/${arg.requestId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: arg.status,
            responseMessage: arg.responseMessage,
            ...(arg.territoryId ? { territoryId: arg.territoryId } : {}),
          }),
        }
      )
  );
  return { reviewRequest: trigger, isReviewing: isMutating };
}
