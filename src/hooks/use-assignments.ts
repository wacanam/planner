import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { apiGet, apiPost, apiPut } from '@/lib/api-client';

const fetcher = (url: string) => apiGet(url).then(r => r.data);

export function useTerritoryAssignments(territoryId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    territoryId ? `/api/territories/${territoryId}/assignments` : null,
    fetcher
  );
  return {
    data: (data as { data: unknown[] } | undefined)?.data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useCreateAssignment() {
  const { trigger, isMutating } = useSWRMutation(
    '/api/assignments',
    (url: string, { arg }: { arg: Record<string, unknown> }) =>
      apiPost(url, arg).then(r => r.data)
  );
  return { create: trigger, isCreating: isMutating };
}

export function useUpdateAssignment() {
  const { trigger, isMutating } = useSWRMutation(
    '/api/assignments',
    (
      _url: string,
      { arg }: { arg: { id: string } & Record<string, unknown> }
    ) => {
      const { id, ...body } = arg;
      return apiPut(`/api/assignments/${id}`, body).then(r => r.data);
    }
  );
  return { update: trigger, isUpdating: isMutating };
}
