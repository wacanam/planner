import { useCallback, useEffect, useState } from 'react';
import {
  getPendingLocalFirstCount,
  LOCAL_FIRST_CHANGE_EVENT,
  LOCAL_FIRST_SYNC_EVENT,
  syncLocalFirst,
} from '@/lib/local-first';

export function useLocalFirstStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsOnline(navigator.onLine);
    try {
      setPendingCount(await getPendingLocalFirstCount());
    } catch {
      setPendingCount(0);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) {
      setLastMessage('You are offline.');
      return;
    }

    setIsSyncing(true);
    setLastMessage(null);
    try {
      const result = await syncLocalFirst();
      setLastMessage(result.failed > 0 ? 'Sync finished with errors.' : 'Local changes synced.');
    } catch (error) {
      setLastMessage(error instanceof Error ? error.message : 'Sync failed.');
    } finally {
      setIsSyncing(false);
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    void refresh();

    const handleOnline = () => {
      setIsOnline(true);
      void refresh();
    };
    const handleOffline = () => {
      setIsOnline(false);
      void refresh();
    };
    const handleChange = () => void refresh();
    const handleSync = (event: Event) => {
      const detail = (event as CustomEvent<{ status?: string; result?: { errors?: string[] } }>).detail;
      setIsSyncing(detail?.status === 'syncing');
      if (detail?.status === 'failed') setLastMessage(detail.result?.errors?.[0] ?? 'Sync failed.');
      if (detail?.status === 'synced') setLastMessage('Local changes synced.');
      void refresh();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(LOCAL_FIRST_CHANGE_EVENT, handleChange);
    window.addEventListener(LOCAL_FIRST_SYNC_EVENT, handleSync);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(LOCAL_FIRST_CHANGE_EVENT, handleChange);
      window.removeEventListener(LOCAL_FIRST_SYNC_EVENT, handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refresh]);

  return { pendingCount, isOnline, isSyncing, lastMessage, refresh, syncNow };
}