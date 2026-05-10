'use client';

import { RefreshCw } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useLocalFirstStatus } from '@/hooks/use-local-first-status';

export function SyncNowButton() {
  const { pendingCount, isOnline, isSyncing, lastMessage, syncNow } = useLocalFirstStatus();

  const helperText = useMemo(() => {
    if (lastMessage) return lastMessage;
    if (!isOnline) return 'Offline';
    if (pendingCount > 0) return `${pendingCount} pending`;
    return 'Up to date';
  }, [isOnline, lastMessage, pendingCount]);

  return (
    <div className="flex items-center">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => void syncNow()}
        disabled={isSyncing || !isOnline}
        title={helperText}
        className="gap-2"
      >
        <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
        <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
        {pendingCount > 0 && (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
            {pendingCount}
          </span>
        )}
      </Button>
    </div>
  );
}
