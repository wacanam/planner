'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Clock, Users } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/records/households', label: 'Households', icon: Home },
  { href: '/records/visits', label: 'Visits', icon: Clock },
  { href: '/records/encounters', label: 'Encounters', icon: Users },
] as const;

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <DashboardHeader />
      <div className="flex flex-1 flex-col">
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
