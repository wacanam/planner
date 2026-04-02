import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { fetchWithAuth } from '@/lib/api-client';

const fetcher = (url: string) => fetchWithAuth(url);

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
      fetchWithAuth(url, { method: 'POST', body: JSON.stringify(arg) })
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
      return fetchWithAuth(`/api/assignments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    }
  );
  return { update: trigger, isUpdating: isMutating };
}
