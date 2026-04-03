import useSWR, { type SWRConfiguration } from 'swr';
import useSWRMutation from 'swr/mutation';
import { apiClient } from '@/lib/api-client';
import type { Congregation } from '@/types/api';

/** List all congregations (admin / super_admin) */
export function useCongregations(options?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<Congregation[]>(
    '/api/congregations',
    (url) => apiClient.get<Congregation[]>(url),
    { revalidateOnFocus: false, ...options }
  );
  return {
    congregations: data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

/** Single congregation by id */
export function useCongregation(id: string | null | undefined, options?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<Congregation>(
    id ? `/api/congregations/${id}` : null,
    (url) => apiClient.get<Congregation>(url),
    { revalidateOnFocus: false, ...options }
  );
  return {
    congregation: data ?? null,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

/** Create a congregation */
export function useCreateCongregation() {
  const { trigger, isMutating } = useSWRMutation(
    '/api/congregations',
    (url: string, { arg }: { arg: Record<string, unknown> }) => apiClient.post(url, arg)
  );
  return { create: trigger, isCreating: isMutating };
}

/** Update a congregation */
export function useUpdateCongregation(id: string) {
  const { trigger, isMutating } = useSWRMutation(
    `/api/congregations/${id}`,
    (url: string, { arg }: { arg: Record<string, unknown> }) => apiClient.patch(url, arg)
  );
  return { update: trigger, isUpdating: isMutating };
}

/** Delete a congregation */
export function useDeleteCongregation(id: string) {
  const { trigger, isMutating } = useSWRMutation(`/api/congregations/${id}`, (url: string) =>
    apiClient.delete(url)
  );
  return { remove: trigger, isDeleting: isMutating };
}
