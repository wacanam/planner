import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { apiClient } from '@/lib/api-client';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: string | null;
  isRead: boolean;
  createdAt: string;
}

const fetcher = (url: string) => apiClient.get<Notification[]>(url);

export function useNotifications() {
  const { data, error, isLoading, mutate } = useSWR<Notification[]>(
    '/api/notifications',
    fetcher,
    { refreshInterval: 30000 }
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
    (url: string, { arg }: { arg?: { ids?: string[] } }) =>
      apiClient.post(url, arg ?? {})
  );
  return { markRead: trigger, isMarking: isMutating };
}
