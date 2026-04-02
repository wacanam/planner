import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { apiClient } from '@/lib/api-client';

const fetcher = (url: string) => apiClient.get(url);

/** List all congregations (admin/super_admin) */
export function useCongregations<T = Record<string, unknown>>() {
  const { data, error, isLoading, mutate } = useSWR('/api/congregations', fetcher);
  return {
    congregations: (data as T[] | undefined) ?? ([] as T[]),
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

/** Single congregation by id */
export function useCongregation<T = Record<string, unknown>>(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/congregations/${id}` : null,
    fetcher
  );
  return {
    congregation: (data as T | undefined) ?? null,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

/** Create a congregation */
export function useCreateCongregation() {
  const { trigger, isMutating } = useSWRMutation(
    '/api/congregations',
    (url: string, { arg }: { arg: Record<string, unknown> }) =>
      apiClient.post(url, arg)
  );
  return { create: trigger, isCreating: isMutating };
}

/** Update a congregation */
export function useUpdateCongregation(id: string) {
  const { trigger, isMutating } = useSWRMutation(
    `/api/congregations/${id}`,
    (url: string, { arg }: { arg: Record<string, unknown> }) =>
      apiClient.patch(url, arg)
  );
  return { update: trigger, isUpdating: isMutating };
}

/** Delete a congregation */
export function useDeleteCongregation(id: string) {
  const { trigger, isMutating } = useSWRMutation(
    `/api/congregations/${id}`,
    (url: string) => apiClient.delete(url)
  );
  return { remove: trigger, isDeleting: isMutating };
}
