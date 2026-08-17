'use client';

import { Compass, FileText, Layers, MapPin, Menu } from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useCurrentUser, usePendingEndorsements } from '@/hooks';
import { isServiceOverseer } from '@/lib/permissions';

export function BottomTabBar() {
  const pathname = usePathname();
  const params = useParams();
  const id = (params?.id as string) || '';
  const { user } = useCurrentUser();
  const { count: pendingEndorsementsCount } = usePendingEndorsements(id);

  if (!id) return null;

  const tabs = [
    {
      href: `/congregation/${id}/dashboard`,
      label: 'Home',
      icon: Layers,
    },
    {
      href: `/congregation/${id}/territories`,
      label: 'Territories',
      icon: MapPin,
    },
    {
      href: `/congregation/${id}/my-assignments`,
      label: 'Mine',
      icon: Compass,
    },
    {
      href: `/congregation/${id}/records/households`,
      label: 'Records',
      icon: FileText,
    },
    {
      href: isServiceOverseer(user.role) ? `/congregation/${id}/members` : `/profile`,
      label: isServiceOverseer(user.role) ? 'Oversee' : 'More',
      icon: Menu,
      badgeCount: pendingEndorsementsCount,
    },
  ];

  return (
    <nav
      className="flex lg:hidden fixed bottom-0 inset-x-0 bg-background border-t border-border shadow-lg"
      style={{ zIndex: 900, paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ href, label, icon: Icon, badgeCount }) => {
        const isActive =
          pathname === href ||
          (href.includes('/records/') && pathname.includes('/records/')) ||
          (href.includes('/territories') && pathname.includes('/territories')) ||
          (href.includes('/my-assignments') && pathname.includes('/my-assignments')) ||
          (href.includes('/members') &&
            (pathname.includes('/members') ||
              pathname.includes('/groups') ||
              pathname.includes('/reports')));

        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-1 text-[11px] font-semibold transition-colors duration-150 relative ${
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="relative mb-0.5">
              <Icon size={18} />
              {Boolean(badgeCount) && (
                <span className="absolute -top-1 -right-2 inline-flex items-center justify-center h-3.5 min-w-3.5 px-1 rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {badgeCount}
                </span>
              )}
            </div>
            <span className="truncate max-w-[64px]">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
