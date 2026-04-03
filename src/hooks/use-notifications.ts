import useSWR, { type SWRConfiguration } from 'swr';
import useSWRMutation from 'swr/mutation';
import { apiClient } from '@/lib/api-client';
import type { Notification } from '@/types/api';

// The /api/notifications route returns { data: Notification[], unreadCount: N }
// apiClient.get<T> unwraps the outer { data: T } envelope, so we receive
// Notification[] directly. unreadCount is derived locally from isRead.

export function useNotifications(options?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<Notification[]>(
    '/api/notifications',
    (url) => apiClient.get<Notification[]>(url),
    { refreshInterval: 30000, revalidateOnFocus: false, ...options }
  );
  return {
    notifications: data ?? [],
    unreadCount: (data ?? []).filter((n) => !n.isRead).length,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useMarkNotificationsRead() {
  const { trigger, isMutating } = useSWRMutation(
    '/api/notifications/read',
    (url: string, { arg }: { arg?: { ids?: string[] } }) => apiClient.post(url, arg ?? {})
  );
  return { markRead: trigger, isMarking: isMutating };
}
