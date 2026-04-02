import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { apiGet, apiPost } from '@/lib/api-client';

const fetcher = (url: string) => apiGet(url).then(r => r.data);

export function useCongregationGroups(congregationId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    congregationId ? `/api/congregations/${congregationId}/groups` : null,
    fetcher
  );
  return {
    data: (data as { data: unknown[] } | undefined)?.data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useCreateGroup(congregationId: string) {
  const { trigger, isMutating } = useSWRMutation(
    `/api/congregations/${congregationId}/groups`,
    (url: string, { arg }: { arg: Record<string, unknown> }) =>
      apiPost(url, arg).then(r => r.data)
  );
  return { create: trigger, isCreating: isMutating };
}
