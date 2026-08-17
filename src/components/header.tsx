'use client';

import { MapPin, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { useAuthSession as useSession } from '@/lib/firebase/auth';

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
  const isDashboardPage = DASHBOARD_PREFIXES.some((p) => pathname.startsWith(p));
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hide on dashboard or auth app routes
  if (isDashboardPage) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background shadow-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <MapPin size={16} className="text-primary" />
            </div>
            <span className="font-bold text-foreground tracking-tight">Ministry Planner</span>
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
                <Link
                  href={
                    sessionUser?.role === 'super_admin'
                      ? '/admin/dashboard'
                      : sessionUser?.congregationId
                        ? `/congregation/${sessionUser.congregationId}/dashboard`
                        : '/onboarding'
                  }
                >
                  Go to App
                </Link>
              </Button>
            )}

            {/* Mobile menu toggle */}
            {!isAuthenticated && (
              <button
                type="button"
                className="md:hidden ml-1 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-all"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {!isAuthenticated && mobileOpen && (
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
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" size="sm" asChild className="flex-1 text-xs">
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild className="flex-1 text-xs font-semibold rounded-xl">
                <Link href="/auth/register">Get Started</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
