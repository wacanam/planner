'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Clock, Users, WifiOff } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { SyncNowButton } from '@/components/sync-now-button';
import { useLocalFirstStatus } from '@/hooks/use-local-first-status';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/records/households', label: 'Households', icon: Home },
  { href: '/records/visits', label: 'Visits', icon: Clock },
  { href: '/records/encounters', label: 'Encounters', icon: Users },
] as const;

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isOnline, pendingCount } = useLocalFirstStatus();

  return (
    <>
      <DashboardHeader />
      <div className="flex flex-1 flex-col pb-20 md:pb-0">
        {!isOnline && (
          <div className="sticky top-16 z-50 flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
            <WifiOff size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
              Offline - new records are saved locally
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
