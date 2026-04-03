import useSWR, { type SWRConfiguration } from 'swr';
import useSWRMutation from 'swr/mutation';
import { apiClient } from '@/lib/api-client';
import type { Group } from '@/types/api';

export function useCongregationGroups(
  congregationId: string | null | undefined,
  options?: SWRConfiguration
) {
  const { data, error, isLoading, mutate } = useSWR<Group[]>(
    congregationId ? `/api/congregations/${congregationId}/groups` : null,
    (url) => apiClient.get<Group[]>(url),
    { revalidateOnFocus: false, ...options }
  );
  return {
    groups: data ?? [],
    data: data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useCreateGroup(congregationId: string) {
  const { trigger, isMutating } = useSWRMutation(
    `/api/congregations/${congregationId}/groups`,
    (url: string, { arg }: { arg: Record<string, unknown> }) => apiClient.post(url, arg)
  );
  return { create: trigger, isCreating: isMutating };
}
