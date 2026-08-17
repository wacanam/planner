'use client';

import { Clock, Home, Share2, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { DashboardHeader } from '@/components/dashboard-header';
import { ProtectedPage } from '@/components/protected-page';

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const id = (params?.id as string) || '';

  const tabs = [
    {
      href: `/congregation/${id}/records/households`,
      label: 'Households',
      icon: Home,
    },
    {
      href: `/congregation/${id}/records/visits`,
      label: 'Visits',
      icon: Clock,
    },
    {
      href: `/congregation/${id}/records/encounters`,
      label: 'Encounters',
      icon: Users,
    },
    {
      href: `/congregation/${id}/records/shared`,
      label: 'Shared',
      icon: Share2,
    },
  ];

  return (
    <ProtectedPage congregationId={id}>
      <DashboardHeader />
      <div className="border-b border-border bg-background sticky top-16 z-30 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-2 py-2 overflow-x-auto" aria-label="Records navigation">
            {tabs.map(({ href, label, icon: Icon }) => {
              const isActive =
                pathname === href ||
                (href.endsWith('households') && pathname.includes('households'));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="pb-24 lg:pb-8">{children}</div>
      <BottomTabBar />
    </ProtectedPage>
  );
}
