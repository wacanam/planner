import useSWR, { type SWRConfiguration } from 'swr';
import useSWRMutation from 'swr/mutation';
import { apiClient } from '@/lib/api-client';
import type { Assignment } from '@/types/api';

export function useTerritoryAssignments(
  territoryId: string | null | undefined,
  options?: SWRConfiguration
) {
  const { data, error, isLoading, mutate } = useSWR<Assignment[]>(
    territoryId ? `/api/territories/${territoryId}/assignments` : null,
    (url) => apiClient.get<Assignment[]>(url),
    { revalidateOnFocus: false, ...options }
  );
  return {
    assignments: data ?? [],
    data: data ?? [],
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
