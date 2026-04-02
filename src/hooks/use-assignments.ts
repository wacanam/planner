import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { apiClient } from '@/lib/api-client';

const fetcher = (url: string) => apiClient.get(url);

export function useTerritoryAssignments(territoryId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    territoryId ? `/api/territories/${territoryId}/assignments` : null,
    fetcher
  );
  return {
    data: (data as unknown[] | undefined) ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useCreateAssignment() {
  const { trigger, isMutating } = useSWRMutation(
    '/api/assignments',
    (url: string, { arg }: { arg: Record<string, unknown> }) =>
      apiClient.post(url, arg)
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
      return apiClient.put(`/api/assignments/${id}`, body);
    }
  );
  return { update: trigger, isUpdating: isMutating };
}
