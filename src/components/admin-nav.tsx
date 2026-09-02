'use client';

import { Building2, Inbox, LayoutDashboard, Megaphone, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useAdminAccountRequests } from '@/hooks';

export function AdminNav() {
  const pathname = usePathname();
  const { pendingCount } = useAdminAccountRequests();

  const navItems = [
    {
      href: '/admin/dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
      active: pathname === '/admin/dashboard',
    },
    {
      href: '/admin/congregations',
      label: 'Congregations',
      icon: Building2,
      active: pathname.startsWith('/admin/congregations'),
    },
    {
      href: '/admin/users',
      label: 'Users & Roles',
      icon: Users,
      active: pathname.startsWith('/admin/users'),
    },
    {
      href: '/admin/requests',
      label: 'Requests Queue',
      icon: Inbox,
      badge: pendingCount > 0 ? pendingCount : null,
      active: pathname.startsWith('/admin/requests'),
    },
    {
      href: '/admin/announcements',
      label: 'Announcements',
      icon: Megaphone,
      active: pathname.startsWith('/admin/announcements'),
    },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 bg-muted/60 dark:bg-muted/40 rounded-2xl border border-border overflow-x-auto scrollbar-none w-fit max-w-full">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              item.active
                ? 'bg-card text-foreground shadow-xs border border-border/80'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
            }`}
          >
            <Icon size={14} className={item.active ? 'text-primary' : 'text-muted-foreground'} />
            <span>{item.label}</span>
            {typeof item.badge === 'number' && item.badge > 0 && (
              <Badge className="bg-amber-500 text-white font-bold text-[9px] px-1.5 py-0 h-4 min-w-[16px] flex items-center justify-center">
                {item.badge}
              </Badge>
            )}
          </Link>
        );
      })}
    </div>
  );
}
