'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { Home, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: 'households', label: 'Households', icon: Home },
  { href: 'visits', label: 'Visits', icon: Clock },
  { href: 'encounters', label: 'Encounters', icon: Users },
] as const;

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const id = params?.id as string;

  return (
    <div className="flex flex-col h-full">
      {/* Tab header */}
      <div className="border-b border-border bg-background sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-0 overflow-x-auto">
            {tabs.map(({ href, label, icon: Icon }) => {
              const full = `/congregation/${id}/records/${href}`;
              const active = pathname.startsWith(full);
              return (
                <Link
                  key={href}
                  href={full}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
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

      {/* Tab content */}
      <div className="flex-1">{children}</div>
    </div>
  );
}
