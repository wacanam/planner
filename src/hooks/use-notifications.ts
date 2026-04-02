import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { fetchWithAuth } from '@/lib/api-client';

const fetcher = (url: string) => fetchWithAuth<NotificationsResponse>(url);

interface NotificationsResponse {
  data: {
    id: string;
    type: string;
    title: string;
    body: string;
    data: string | null;
    isRead: boolean;
    createdAt: string;
  }[];
  unreadCount: number;
}

export function useNotifications() {
  const { data, error, isLoading, mutate } = useSWR<NotificationsResponse>(
    '/api/notifications',
    fetcher,
    { refreshInterval: 30000 }
  );
  return {
    notifications: data?.data ?? [],
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useMarkNotificationsRead() {
  const { trigger, isMutating } = useSWRMutation(
    '/api/notifications/read',
    (url: string, { arg }: { arg?: { ids?: string[] } }) =>
      fetchWithAuth(url, { method: 'POST', body: JSON.stringify(arg ?? {}) })
  );
  return { markRead: trigger, isMarking: isMutating };
}
