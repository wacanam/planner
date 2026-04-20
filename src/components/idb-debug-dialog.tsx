'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { getDB } from '@/lib/offline-store';

interface DBState {
  dbVersion: number;
  stores: Record<string, unknown[]>;
  swRegistered: boolean;
  swReady: boolean;
  swControlled: boolean;
  swScriptUrl?: string;
  error: string | null;
  lastSync?: Date;
}

interface SWDebugEntry {
  id: number;
  at: string;
  message: string;
  data: unknown;
}

export function IDBDebugDialog() {
  const [open, setOpen] = useState(false);
  const [dbState, setDbState] = useState<DBState | null>(null);
  const [expandedStore, setExpandedStore] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncDetails, setSyncDetails] = useState<string | null>(null);
  const [swDebugEnabled, setSwDebugEnabled] = useState(false);
  const [swDebugLogs, setSwDebugLogs] = useState<SWDebugEntry[]>([]);
  const [swVersion, setSwVersion] = useState<string | null>(null);

  // Open with Ctrl+Shift+D
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault();
        setOpen((p) => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const refreshState = useCallback(async () => {
    setLoading(true);
    try {
      const db = await getDB();
      const storeNames = [
        'pending-avatars',
        'auth',
        'households-cache',
        'visits-cache',
        'pending-households',
        'pending-visits',
        'pending-encounters',
      ];

      const stores: Record<string, unknown[]> = {};
      for (const storeName of storeNames) {
        try {
          const allKeys = await db.getAllKeys(storeName);
          const allValues = await Promise.all(
            allKeys.map((key) => db.get(storeName, key as IDBValidKey))
          );
          stores[storeName] = allValues.filter(Boolean);
        } catch (err) {
          console.error(`Failed to read ${storeName}:`, err);
        }
      }

      const swReg = await navigator.serviceWorker?.getRegistrations?.();
      const swReady = (swReg?.length ?? 0) > 0;
      const controller = navigator.serviceWorker?.controller ?? null;

      setDbState({
        dbVersion: 4, // From offline-store.ts DB_VERSION
        stores,
        swRegistered: swReg?.length !== undefined,
        swReady,
        swControlled: Boolean(controller),
        swScriptUrl: controller?.scriptURL,
        error: null,
        lastSync: new Date(),
      });
    } catch (err) {
      setDbState({
        dbVersion: 4,
        stores: {},
        swRegistered: false,
        swReady: false,
        swControlled: false,
        error: String(err),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const postToServiceWorker = useCallback(async (message: Record<string, unknown>) => {
    if (!navigator.serviceWorker) return false;

    const reg = await navigator.serviceWorker.ready;
    const target =
      navigator.serviceWorker.controller ?? reg.active ?? reg.waiting ?? reg.installing ?? null;

    if (!target) return false;

    target.postMessage(message);
    return true;
  }, []);

  useEffect(() => {
    if (open) {
      refreshState();
    }
  }, [open, refreshState]);

  useEffect(() => {
    if (!open || !navigator.serviceWorker) return;

    const handleMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      if (type === 'MANUAL_SYNC_COMPLETE') {
        setSyncMessage('Manual sync completed.');
        setSyncDetails(null);
      }
      if (type === 'MANUAL_SYNC_ERROR') {
        setSyncMessage(`Manual sync failed: ${String(event.data?.error ?? 'Unknown error')}`);
      }
      if (type === 'HOUSEHOLD_SYNC_ERROR') {
        setSyncMessage(`Household sync failed for ${String(event.data?.pendingId ?? 'unknown item')}.`);
        setSyncDetails(JSON.stringify(
          {
            error: event.data?.error,
            payload: event.data?.payload,
          },
          null,
          2
        ));
      }
      if (type === 'VISIT_SYNC_ERROR') {
        setSyncMessage(`Visit sync failed for ${String(event.data?.pendingId ?? 'unknown item')}.`);
        setSyncDetails(JSON.stringify(
          {
            error: event.data?.error,
            payload: event.data?.payload,
          },
          null,
          2
        ));
      }
      if (type === 'ENCOUNTER_SYNC_ERROR') {
        setSyncMessage(`Encounter sync failed for ${String(event.data?.pendingId ?? 'unknown item')}.`);
        setSyncDetails(JSON.stringify(
          {
            error: event.data?.error,
            payload: event.data?.payload,
          },
          null,
          2
        ));
      }
      if (type === 'SW_DEBUG_STATE') {
        setSwDebugEnabled(Boolean(event.data?.enabled));
        setSwVersion(String(event.data?.version ?? 'unknown'));
      }
      if (type === 'SW_PONG') {
        setSyncMessage('Service Worker responded to ping.');
        setSwDebugEnabled(Boolean(event.data?.enabled));
        setSwVersion(String(event.data?.version ?? 'unknown'));
      }
      if (type === 'SW_DEBUG_LOG' && event.data?.entry) {
        setSwDebugLogs((current) => {
          const next = [...current, event.data.entry as SWDebugEntry];
          return next.slice(-100);
        });
      }
      if (
        type === 'MANUAL_SYNC_COMPLETE' ||
        type === 'MANUAL_SYNC_ERROR' ||
        type === 'HOUSEHOLD_SYNC_ERROR' ||
        type === 'VISIT_SYNC_ERROR' ||
        type === 'ENCOUNTER_SYNC_ERROR' ||
        type === 'HOUSEHOLD_SYNCED' ||
        type === 'VISIT_SYNCED' ||
        type === 'ENCOUNTER_SYNCED' ||
        type === 'AVATAR_SYNCED'
      ) {
        void refreshState();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [open, refreshState]);

  useEffect(() => {
    if (!open || !navigator.serviceWorker) return;
    void postToServiceWorker({ type: 'GET_SW_DEBUG_STATE' });
  }, [open, postToServiceWorker]);

  const pendingItemsCount = Object.entries(dbState?.stores ?? {})
    .filter(([k]) => k.startsWith('pending-'))
    .reduce((sum, [, v]) => sum + (v?.length ?? 0), 0);

  return (
    <>
      {/* Debug button (always visible) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 active:bg-purple-800 flex items-center justify-center text-lg font-bold transition-colors"
        title="IDB Debug Console"
      >
        🐛
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>IndexedDB Debug Console</DialogTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={refreshState}
                disabled={loading}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh
              </Button>
            </div>
          </DialogHeader>

          {!dbState ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : dbState.error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-700 dark:text-red-400 font-mono">{dbState.error}</p>
            </div>
          ) : (
            <div className="overflow-y-auto space-y-4 flex-1">
              {/* Status Cards */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">DB Version</p>
                  <p className="text-lg font-bold">{dbState.dbVersion}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Pending Items</p>
                  <p className="text-lg font-bold text-amber-600">{pendingItemsCount}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">SW Active</p>
                  <Badge
                    variant={dbState.swReady ? 'default' : 'secondary'}
                    className="justify-center w-full"
                  >
                    {dbState.swReady ? '✓' : '✗'}
                  </Badge>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">SW Controls Page</p>
                  <Badge
                    variant={dbState.swControlled ? 'default' : 'secondary'}
                    className="justify-center w-full"
                  >
                    {dbState.swControlled ? '✓' : '✗'}
                  </Badge>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Last Sync</p>
                  <p className="text-xs">
                    {dbState.lastSync ? dbState.lastSync.toLocaleTimeString() : 'Never'}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                <p>SW Version: {swVersion ?? 'Unknown'}</p>
                <p>Controller Script: {dbState.swScriptUrl ?? 'None'}</p>
              </div>

              {/* Stores */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Stores</h3>
                {Object.entries(dbState.stores).map(([storeName, items]) => {
                  const isExpanded = expandedStore === storeName;
                  const isPending = storeName.startsWith('pending-');

                  return (
                    <div
                      key={storeName}
                      className="border border-border rounded-lg overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedStore(isExpanded ? null : storeName)
                        }
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-sm font-medium"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isExpanded ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                          <span>{storeName}</span>
                          <Badge
                            variant={
                              items?.length === 0
                                ? 'secondary'
                                : isPending
                                  ? 'default'
                                  : 'outline'
                            }
                          >
                            {items?.length ?? 0}
                          </Badge>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="bg-muted/30 border-t border-border p-3 max-h-48 overflow-y-auto">
                          {!items || items.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">Empty</p>
                          ) : (
                            <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                              {JSON.stringify(items, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="border-t border-border pt-4 space-y-2">
                <p className="text-xs text-muted-foreground font-semibold">Actions</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (!('serviceWorker' in navigator)) {
                        setSyncMessage('Service Workers are not supported in this browser.');
                        return;
                      }

                      setSyncMessage('Resetting Service Worker registrations...');
                      setSyncDetails(null);

                      const registrations = await navigator.serviceWorker.getRegistrations();
                      await Promise.all(registrations.map((registration) => registration.unregister()));

                      setSwDebugEnabled(false);
                      setSwVersion(null);
                      setSwDebugLogs([]);
                      window.location.reload();
                    }}
                  >
                    Reset SW
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const db = await getDB();
                      const pending = [
                        'pending-visits',
                        'pending-households',
                        'pending-encounters',
                      ];
                      for (const store of pending) {
                        const keys = await db.getAllKeys(store);
                        for (const key of keys) {
                          await db.delete(store, key as IDBValidKey);
                        }
                      }
                      refreshState();
                    }}
                  >
                    <Trash2 size={14} />
                    Clear Pending
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const next = !swDebugEnabled;
                      setSwDebugEnabled(next);
                      if (next) {
                        setSwDebugLogs([]);
                        setSyncMessage('Verbose SW debug enabled.');
                      } else {
                        setSyncMessage('Verbose SW debug disabled.');
                        setSyncDetails(null);
                      }
                      const sent = await postToServiceWorker({
                        type: 'SET_SW_DEBUG',
                        enabled: next,
                      });
                      if (!sent) {
                        setSyncMessage('No Service Worker target was available.');
                      }
                    }}
                  >
                    {swDebugEnabled ? 'SW Debug On' : 'SW Debug Off'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      setSyncMessage('Pinging Service Worker...');
                      const sent = await postToServiceWorker({ type: 'PING_SW' });
                      if (!sent) {
                        setSyncMessage('No Service Worker target was available.');
                      }
                    }}
                  >
                    Ping SW
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      setSyncMessage('Manual sync requested...');
                      setSyncDetails(null);
                      const sent = await postToServiceWorker({
                        type: 'MANUAL_SYNC',
                      });
                      if (!sent) {
                        setSyncMessage('No Service Worker target was available.');
                      }
                    }}
                  >
                    <RefreshCw size={14} />
                    Force Sync (SW)
                  </Button>
                </div>
                {syncMessage && (
                  <p className="text-xs text-muted-foreground">{syncMessage}</p>
                )}
                {syncDetails && (
                  <pre className="max-h-40 overflow-auto rounded border border-border bg-muted/30 p-2 text-[11px] whitespace-pre-wrap break-words">
                    {syncDetails}
                  </pre>
                )}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Service Worker Log
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSwDebugLogs([])}
                    >
                      Clear Log
                    </Button>
                  </div>
                  <div className="max-h-56 overflow-auto rounded border border-border bg-muted/20 p-2">
                    {swDebugLogs.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {swDebugEnabled
                          ? 'Waiting for Service Worker events...'
                          : 'Enable SW debug to stream worker logs here.'}
                      </p>
                    ) : (
                      <pre className="text-[11px] whitespace-pre-wrap break-words">
                        {swDebugLogs
                          .map((entry) =>
                            `[${entry.at}] ${entry.message}${
                              entry.data ? `\n${JSON.stringify(entry.data, null, 2)}` : ''
                            }`
                          )
                          .join('\n\n')}
                      </pre>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  <strong>Access:</strong> Tap the 🐛 button in bottom-right corner, or press Ctrl+Shift+D
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                  <strong>Pending items</strong> = data queued for sync. Check "SW Active" to see if Service Worker is running.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
