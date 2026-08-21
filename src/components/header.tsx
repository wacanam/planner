'use client';

import { Menu, Shield, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { useAuthSession as useSession } from '@/lib/firebase/auth';
import { isSystemAdmin } from '@/lib/permissions';

const DASHBOARD_PREFIXES = ['/admin', '/congregation', '/profile', '/onboarding', '/auth'];

const publicNavLinks = [
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How It Works' },
];

export function Header() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const sessionUser = session?.user as { role?: string; congregationId?: string } | undefined;
  const isAuthenticated = status === 'authenticated' || !!session;
  const isAdmin = isSystemAdmin(sessionUser?.role);
  const isDashboardPage = DASHBOARD_PREFIXES.some((p) => pathname.startsWith(p));
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hide on dashboard or auth app routes
  if (isDashboardPage) return null;

  const appHref = isAdmin
    ? '/admin/dashboard'
    : sessionUser?.congregationId
      ? `/congregation/${sessionUser.congregationId}/dashboard`
      : '/onboarding';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background shadow-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/icons/icon-192.png"
              alt="Kanataran Logo"
              width={32}
              height={32}
              className="w-8 h-8 rounded-xl object-contain shadow-xs transition-transform group-hover:scale-105"
              priority
            />
            <span className="font-bold text-foreground tracking-tight">Kanataran</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {publicNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/20 transition-all"
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated && isAdmin && (
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-primary hover:text-primary/80 rounded-lg hover:bg-primary/10 transition-all"
              >
                <Shield size={14} />
                <span>Admin Dashboard</span>
              </Link>
            )}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {!isAuthenticated ? (
              <>
                <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex text-xs">
                  <Link href="/auth/login">Sign In</Link>
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="hidden sm:inline-flex text-xs font-semibold rounded-xl"
                >
                  <Link href="/auth/register">Get Started</Link>
                </Button>
              </>
            ) : (
              <Button size="sm" asChild className="text-xs font-semibold rounded-xl">
                <Link href={appHref}>Go to App</Link>
              </Button>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="md:hidden ml-1 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-all"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-1 border-t border-border/60 pt-3">
            {publicNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/20 transition-all"
              >
                {link.label}
              </Link>
            ))}

            {isAuthenticated && isAdmin && (
              <Link
                href="/admin/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 rounded-lg transition-all"
              >
                <Shield size={15} />
                <span>Admin Dashboard</span>
              </Link>
            )}

            {!isAuthenticated ? (
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" size="sm" asChild className="flex-1 text-xs">
                  <Link href="/auth/login">Sign In</Link>
                </Button>
                <Button size="sm" asChild className="flex-1 text-xs font-semibold rounded-xl">
                  <Link href="/auth/register">Get Started</Link>
                </Button>
              </div>
            ) : (
              <div className="pt-2">
                <Button size="sm" asChild className="w-full text-xs font-semibold rounded-xl">
                  <Link href={appHref}>Go to App</Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
