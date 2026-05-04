'use client';

import { BarChart2, BookOpen, Building, ClipboardList, House, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRole } from '@/db';
import { useCurrentUser } from '@/hooks/use-current-user';
import { cn } from '@/lib/utils';

interface TabItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface BottomTabBarProps {
  congregationId?: string;
  /**
   * When true, renders as a normal (non-fixed) flex child so it anchors at
   * the bottom of its parent flex container (e.g. a full-screen overlay).
   * When false (default), renders as a fixed bottom bar visible on mobile.
   */
  inline?: boolean;
}

export function BottomTabBar({ congregationId, inline = false }: BottomTabBarProps) {
  const { user } = useCurrentUser();
  const pathname = usePathname();

  if (!user) return null;

  let tabs: TabItem[] = [];

  if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
    tabs = [
      { href: '/admin/dashboard', label: 'Dashboard', icon: House },
      { href: '/admin/congregations', label: 'Congregations', icon: Building },
    ];
  } else if (
    user.role === UserRole.SERVICE_OVERSEER ||
    user.role === UserRole.TERRITORY_SERVANT
  ) {
    const id = congregationId ?? user.congregationId ?? '';
    if (id) {
      tabs = [
        { href: `/congregation/${id}/dashboard`, label: 'Dashboard', icon: House },
        { href: `/congregation/${id}/territories`, label: 'Territories', icon: MapPin },
        { href: `/congregation/${id}/reports`, label: 'Reports', icon: BarChart2 },
        { href: `/congregation/${id}/members`, label: 'Members', icon: Users },
      ];
    }
  } else {
    const id = congregationId ?? user.congregationId ?? '';
    if (id) {
      tabs = [
        { href: `/congregation/${id}/dashboard`, label: 'Home', icon: House },
        { href: `/congregation/${id}/my-assignments`, label: 'My Work', icon: ClipboardList },
        { href: '/records', label: 'Records', icon: BookOpen },
        { href: `/congregation/${id}/territories`, label: 'Territories', icon: MapPin },
      ];
    }
  }

  if (tabs.length === 0) return null;

  return (
    <nav
      className={cn(
        'bg-background/95 backdrop-blur-md border-t border-border',
        inline
          ? 'flex w-full shrink-0'
          : 'flex md:hidden fixed bottom-0 inset-x-0 z-[900]',
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
