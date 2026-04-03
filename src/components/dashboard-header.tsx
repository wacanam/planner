'use client';

import { LogOut, MapPin, BarChart2, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { UserRole } from '@/db';
import { useCurrentUser } from '@/hooks/use-current-user';
import { cn } from '@/lib/utils';

function _roleLabel(role: UserRole): string {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return 'Super Admin';
    case UserRole.ADMIN:
      return 'Admin';
    case UserRole.SERVICE_OVERSEER:
      return 'Service Overseer';
    case UserRole.TERRITORY_SERVANT:
      return 'Territory Servant';
    default:
      return 'Member';
  }
}

function _roleBadgeClass(role: UserRole): string {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400';
    case UserRole.ADMIN:
      return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400';
    case UserRole.SERVICE_OVERSEER:
      return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400';
    case UserRole.TERRITORY_SERVANT:
      return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

interface DashboardNavLink {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

interface DashboardHeaderProps {
  congregationId?: string;
  congregationName?: string;
}

export function DashboardHeader({ congregationId, congregationName }: DashboardHeaderProps) {
  const { user } = useCurrentUser();
  const pathname = usePathname();

  if (!user) return null;

  // Build nav links based on role
  let navLinks: DashboardNavLink[] = [];

  if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
    navLinks = [
      { href: '/admin/dashboard', label: 'Dashboard' },
      { href: '/admin/congregations', label: 'Congregations' },
    ];
  } else if (user.role === UserRole.SERVICE_OVERSEER || user.role === UserRole.TERRITORY_SERVANT) {
    const id = congregationId ?? user.congregationId ?? '';
    if (id) {
      navLinks = [
        { href: `/congregation/${id}/dashboard`, label: 'Dashboard' },
        { href: `/congregation/${id}/members`, label: 'Members' },
        { href: `/congregation/${id}/groups`, label: 'Groups' },
        { href: `/congregation/${id}/territories`, label: 'Territories' },
        {
          href: `/congregation/${id}/reports`,
          label: 'Reports',
          icon: <BarChart2 size={14} />,
        },
      ];
    }
  } else {
    // Regular member
    const id = congregationId ?? user.congregationId ?? '';
    if (id) {
      navLinks = [
        { href: `/congregation/${id}/dashboard`, label: 'Home' },
        { href: `/congregation/${id}/my-assignments`, label: 'My Assignments' },
        { href: `/congregation/${id}/territories`, label: 'Territories' },
      ];
    }
  }

  // Determine the home href based on role
  const homeHref = (() => {
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) return '/admin/dashboard';
    const id = congregationId ?? user.congregationId ?? '';
    return id ? `/congregation/${id}/dashboard` : '/dashboard';
  })();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href={homeHref}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <MapPin size={16} className="text-primary" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-foreground tracking-tight text-sm">
                Ministry Planner
              </span>
              {congregationName && (
                <span className="text-[11px] text-muted-foreground leading-none">
                  {congregationName}
                </span>
              )}
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all',
                  pathname === link.href || pathname.startsWith(`${link.href}/`)
                    ? 'text-primary bg-primary/10 font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/20'
                )}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />

            {/* User avatar dropdown */}
            <UserAvatarDropdown name={user.name ?? ''} />
          </div>
        </div>

        {/* Mobile nav */}
        {navLinks.length > 0 && (
          <div className="md:hidden pb-2 flex gap-1 overflow-x-auto">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-all',
                  pathname === link.href || pathname.startsWith(`${link.href}/`)
                    ? 'text-primary bg-primary/10 font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/20'
                )}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

// ─── UserAvatarDropdown ───────────────────────────────────────────────────────

function UserAvatarDropdown({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initial = name.charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/50"
        aria-label="Account menu"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-background shadow-lg z-50 py-1 text-sm">
          <Link
            href="/profile"
            className="flex items-center gap-2 px-4 py-2 text-foreground hover:bg-accent/20 transition-colors"
            onClick={() => setOpen(false)}
          >
            <UserIcon size={14} />
            My Profile
          </Link>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            className="w-full flex items-center gap-2 px-4 py-2 text-foreground hover:bg-accent/20 transition-colors"
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
