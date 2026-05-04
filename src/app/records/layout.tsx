'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Clock, Users, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { SyncNowButton } from '@/components/sync-now-button';
import { cn } from '@/lib/utils';
import { getDB } from '@/lib/offline-store';

const tabs = [
  { href: '/records/households', label: 'Households', icon: Home },
  { href: '/records/visits', label: 'Visits', icon: Clock },
  { href: '/records/encounters', label: 'Encounters', icon: Users },
] as const;

const PENDING_STORES = ['pending-households', 'pending-visits', 'pending-encounters'];

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkPending = async () => {
      try {
        const db = await getDB();
        let total = 0;
        for (const store of PENDING_STORES) {
          const keys = await db.getAllKeys(store);
          total += keys.length;
        }
        setPendingCount(total);
      } catch {
        // ignore
      }
    };

    void checkPending();
    const interval = window.setInterval(checkPending, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <>
      <DashboardHeader />
      <div className="flex flex-1 flex-col pb-20 md:pb-0">
        {!isOnline && (
          <div className="sticky top-16 z-50 flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
            <WifiOff size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
              Offline — new records will sync when you reconnect
            </span>
          </div>
        )}

        {isOnline && pendingCount > 0 && (
          <div className="sticky top-16 z-50 flex items-center justify-between gap-2 bg-primary/5 border-b border-primary/20 px-4 py-2">
            <span className="text-xs text-primary font-medium">
              {pendingCount} pending record{pendingCount !== 1 ? 's' : ''} to sync
            </span>
            <SyncNowButton />
          </div>
        )}

        <div className="sticky top-16 z-40 border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-0 overflow-x-auto">
              {tabs.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                      active
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                    )}
                  >
                    <Icon size={15} />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="flex-1">{children}</div>
      </div>
    </>
  );
}
