import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { apiClient } from '@/lib/api-client';
import type { SWRConfiguration } from 'swr';
import type { User } from '@/types/api';

const fetcher = (url: string) => apiClient.get<User>(url);

export function useProfile(options?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<User>('/api/profile', fetcher, options);
  return { profile: data ?? null, isLoading, error: error?.message ?? null, mutate };
}

export function useUpdateProfile() {
  const { trigger, isMutating } = useSWRMutation(
    '/api/profile',
    (_url: string, { arg }: { arg: { name: string } }) => apiClient.patch('/api/profile', arg)
  );
  return { update: trigger, isUpdating: isMutating };
}

export function useChangePassword() {
  const { trigger, isMutating } = useSWRMutation(
    '/api/profile/change-password',
    (_url: string, { arg }: { arg: { currentPassword: string; newPassword: string } }) =>
      apiClient.post('/api/profile/change-password', arg)
  );
  return { changePassword: trigger, isChanging: isMutating };
}
