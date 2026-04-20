'use client';

import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getDB } from '@/lib/offline-store';

const PENDING_STORES = ['pending-avatars', 'pending-households', 'pending-visits', 'pending-encounters'];
const STATUS_TIMEOUT_MS = 5000;
const SYNC_TIMEOUT_MS = 20000;

export function SyncNowButton() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const statusTimerRef = useRef<number | null>(null);
  const syncTimerRef = useRef<number | null>(null);

  const clearStatusTimer = useCallback(() => {
    if (statusTimerRef.current !== null) {
      window.clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }
  }, []);

  const clearSyncTimer = useCallback(() => {
    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  const showStatus = useCallback((message: string) => {
    clearStatusTimer();
    setStatusMessage(message);
    statusTimerRef.current = window.setTimeout(() => {
      setStatusMessage(null);
      statusTimerRef.current = null;
    }, STATUS_TIMEOUT_MS);
  }, [clearStatusTimer]);

  const refreshPendingState = useCallback(async () => {
    setIsOnline(navigator.onLine);

    try {
      const db = await getDB();
      let total = 0;

      for (const store of PENDING_STORES) {
        const keys = await db.getAllKeys(store);
        total += keys.length;
      }

      setPendingCount(total);
    } catch {
      // Keep the button usable even if IDB state couldn't be read momentarily.
    }
  }, []);

  const finishSync = useCallback((message?: string) => {
    clearSyncTimer();
    setIsSyncing(false);
    if (message) {
      showStatus(message);
    }
    void refreshPendingState();
  }, [clearSyncTimer, refreshPendingState, showStatus]);

  const triggerSync = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      showStatus('Sync is unavailable in this browser.');
      return;
    }

    if (!navigator.onLine) {
      showStatus('You are offline.');
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const target =
        navigator.serviceWorker.controller ?? reg.active ?? reg.waiting ?? reg.installing ?? null;

      if (!target) {
        showStatus('Sync is not ready yet.');
        return;
      }

      clearSyncTimer();
      clearStatusTimer();
      setStatusMessage(null);
      setIsSyncing(true);
      target.postMessage({ type: 'MANUAL_SYNC' });

      syncTimerRef.current = window.setTimeout(() => {
        setIsSyncing(false);
        showStatus('Sync request sent.');
        void refreshPendingState();
        syncTimerRef.current = null;
      }, SYNC_TIMEOUT_MS);
    } catch {
      finishSync('Unable to start sync.');
    }
  }, [clearStatusTimer, clearSyncTimer, finishSync, refreshPendingState, showStatus]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    void refreshPendingState();

    const handleOnline = () => {
      setIsOnline(true);
      void refreshPendingState();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshPendingState();
      }
    };
    const handleMessage = (event: MessageEvent) => {
      const type = event.data?.type;

      if (type === 'MANUAL_SYNC_COMPLETE') {
        finishSync(pendingCount > 0 ? 'Sync completed.' : 'Cache refreshed.');
        return;
      }
      if (type === 'MANUAL_SYNC_ERROR') {
        finishSync(`Sync failed: ${String(event.data?.error ?? 'Unknown error')}`);
        return;
      }
      if (
        type === 'HOUSEHOLD_SYNC_ERROR' ||
        type === 'VISIT_SYNC_ERROR' ||
        type === 'ENCOUNTER_SYNC_ERROR'
      ) {
        finishSync('Sync failed. Please try again.');
        return;
      }
      if (
        type === 'CACHE_UPDATED' ||
        type === 'HOUSEHOLD_SYNCED' ||
        type === 'VISIT_SYNCED' ||
        type === 'ENCOUNTER_SYNCED' ||
        type === 'AVATAR_SYNCED'
      ) {
        void refreshPendingState();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
      clearStatusTimer();
      clearSyncTimer();
    };
  }, [clearStatusTimer, clearSyncTimer, finishSync, pendingCount, refreshPendingState]);

  const helperText = useMemo(() => {
    if (statusMessage) return statusMessage;
    if (!isOnline) return 'Offline';
    if (pendingCount > 0) return `${pendingCount} pending`;
    return 'Up to date';
  }, [isOnline, pendingCount, statusMessage]);

  return (
    <div className="flex items-center">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={triggerSync}
        disabled={isSyncing}
        title={`Sync pending changes and refresh cached data from the server. ${helperText}`}
        className="gap-2"
      >
        <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
        <span className="hidden sm:inline">{isSyncing ? 'Syncing…' : 'Sync now'}</span>
        {pendingCount > 0 && (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
            {pendingCount}
          </span>
        )}
      </Button>
    </div>
  );
}
