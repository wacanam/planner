'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Database, RefreshCw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getLocalFirstDB, getPendingLocalFirstCount, syncLocalFirst } from '@/lib/local-first';

interface LocalFirstDebugState {
  collections: Record<string, unknown[]>;
  pendingCount: number;
  error: string | null;
  lastRefresh: string;
}

const COLLECTIONS = ['households', 'visits', 'encounters', 'avataruploads'] as const;

export function LocalFirstDebugDialog() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<LocalFirstDebugState | null>(null);
  const [expandedCollection, setExpandedCollection] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.code === 'KeyD') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const refreshState = useCallback(async () => {
    setLoading(true);
    try {
      const database = await getLocalFirstDB();
      const collections: Record<string, unknown[]> = {};
      for (const collectionName of COLLECTIONS) {
        const documents = await database[collectionName].find().exec();
        collections[collectionName] = documents.map((document) => document.toMutableJSON());
      }
      setState({
        collections,
        pendingCount: await getPendingLocalFirstCount(),
        error: null,
        lastRefresh: new Date().toLocaleTimeString(),
      });
    } catch (error) {
      setState({
        collections: {},
        pendingCount: 0,
        error: error instanceof Error ? error.message : String(error),
        lastRefresh: new Date().toLocaleTimeString(),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void refreshState();
  }, [open, refreshState]);

  const retryFailed = async () => {
    const database = await getLocalFirstDB();
    for (const collectionName of COLLECTIONS) {
      const documents = await database[collectionName].find().exec();
      await Promise.all(
        documents.map(async (document) => {
          const record = document.toMutableJSON() as {
            syncStatus?: string;
            deletedAt?: string | null;
          };
          if (record.syncStatus === 'failed' && !record.deletedAt) {
            await document.incrementalPatch({ syncStatus: 'pending', syncError: null });
          }
        })
      );
    }
    await refreshState();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
        title="Local-first debug console"
      >
        <Database size={18} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <DialogTitle>Local-First Debug</DialogTitle>
              <Button size="sm" variant="outline" onClick={refreshState} disabled={loading}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh
              </Button>
            </div>
          </DialogHeader>

          {!state ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : state.error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {state.error}
            </div>
          ) : (
            <div className="flex-1 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg border bg-card p-3 text-center">
                  <p className="text-xs text-muted-foreground">Storage</p>
                  <p className="text-sm font-semibold">RxDB</p>
                </div>
                <div className="rounded-lg border bg-card p-3 text-center">
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-lg font-bold text-amber-600">{state.pendingCount}</p>
                </div>
                <div className="rounded-lg border bg-card p-3 text-center">
                  <p className="text-xs text-muted-foreground">Collections</p>
                  <p className="text-lg font-bold">{COLLECTIONS.length}</p>
                </div>
                <div className="rounded-lg border bg-card p-3 text-center">
                  <p className="text-xs text-muted-foreground">Refreshed</p>
                  <p className="text-xs">{state.lastRefresh}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={syncing}
                  onClick={async () => {
                    setSyncing(true);
                    await syncLocalFirst();
                    await refreshState();
                    setSyncing(false);
                  }}
                >
                  <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                  Sync Now
                </Button>
                <Button size="sm" variant="outline" onClick={retryFailed}>
                  <Trash2 size={14} />
                  Retry Failed
                </Button>
              </div>

              <div className="space-y-2">
                {Object.entries(state.collections).map(([collectionName, documents]) => {
                  const expanded = expandedCollection === collectionName;
                  return (
                    <div key={collectionName} className="overflow-hidden rounded-lg border">
                      <button
                        type="button"
                        onClick={() => setExpandedCollection(expanded ? null : collectionName)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/50"
                      >
                        <span className="flex items-center gap-2">
                          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {collectionName}
                        </span>
                        <Badge variant={documents.length > 0 ? 'outline' : 'secondary'}>
                          {documents.length}
                        </Badge>
                      </button>
                      {expanded && (
                        <div className="max-h-56 overflow-y-auto border-t bg-muted/30 p-3">
                          {documents.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Empty</p>
                          ) : (
                            <pre className="whitespace-pre-wrap wrap-break-word text-xs">
                              {JSON.stringify(documents, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
