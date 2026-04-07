'use client';

import { useEffect, useState } from 'react';
import { X, RefreshCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { getDB } from '@/lib/offline-store';

interface DBState {
  dbVersion: number;
  stores: Record<string, unknown[]>;
  swRegistered: boolean;
  swReady: boolean;
  error: string | null;
  lastSync?: Date;
}

export function IDBDebugDialog() {
  const [open, setOpen] = useState(false);
  const [dbState, setDbState] = useState<DBState | null>(null);
  const [expandedStore, setExpandedStore] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const refreshState = async () => {
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

      setDbState({
        dbVersion: 4, // From offline-store.ts DB_VERSION
        stores,
        swRegistered: swReg?.length !== undefined,
        swReady,
        error: null,
        lastSync: new Date(),
      });
    } catch (err) {
      setDbState({
        dbVersion: 4,
        stores: {},
        swRegistered: false,
        swReady: false,
        error: String(err),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      refreshState();
    }
  }, [open]);

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
                  <p className="text-xs text-muted-foreground">Last Sync</p>
                  <p className="text-xs">
                    {dbState.lastSync ? dbState.lastSync.toLocaleTimeString() : 'Never'}
                  </p>
                </div>
              </div>

              {/* Stores */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Stores</h3>
                {Object.entries(dbState.stores).map(([storeName, items]) => {
                  const isExpanded = expandedStore === storeName;
                  const isPending = storeName.startsWith('pending-');
                  const isCache = storeName.includes('cache');

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
                    onClick={() => {
                      navigator.serviceWorker?.controller?.postMessage({
                        type: 'MANUAL_SYNC',
                      });
                    }}
                  >
                    <RefreshCw size={14} />
                    Force Sync (SW)
                  </Button>
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
