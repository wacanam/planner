import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { apiClient } from '@/lib/api-client';

const fetcher = (url: string) => apiClient.get(url);

export function useCongregationGroups(congregationId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    congregationId ? `/api/congregations/${congregationId}/groups` : null,
    fetcher
  );
  return {
    groups: (data as unknown[] | undefined) ?? [],
    data: (data as unknown[] | undefined) ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useCreateGroup(congregationId: string) {
  const { trigger, isMutating } = useSWRMutation(
    `/api/congregations/${congregationId}/groups`,
    (url: string, { arg }: { arg: Record<string, unknown> }) =>
      apiClient.post(url, arg)
  );
  return { create: trigger, isCreating: isMutating };
}
