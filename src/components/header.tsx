'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, MapPin } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

/** Routes that have their own DashboardHeader — hide the public header here */
const DASHBOARD_PREFIXES = [
  '/admin',
  '/congregation',
  '/dashboard',
  '/profile',
  '/notifications',
  '/onboarding',
  '/territories',
  '/no-congregation',
];

const publicNavLinks = [
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How It Works' },
];

export function Header() {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');
  const isDashboardPage = DASHBOARD_PREFIXES.some((p) => pathname.startsWith(p));
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hide entirely on dashboard routes (they have their own header)
  if (isDashboardPage) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <MapPin size={16} className="text-primary" />
            </div>
            <span className="font-bold text-foreground tracking-tight">Ministry Planner</span>
          </Link>

          {/* Desktop nav */}
          {!isAuthPage && (
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
          )}

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!isAuthPage && (
              <>
                <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                  <Link href="/auth/login">Sign In</Link>
                </Button>
                <Button size="sm" asChild className="hidden sm:inline-flex">
                  <Link href="/auth/register">Get Started</Link>
                </Button>
              </>
            )}

            {/* Mobile menu toggle */}
            {!isAuthPage && (
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
        {!isAuthPage && mobileOpen && (
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
              <Button variant="ghost" size="sm" asChild className="flex-1">
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild className="flex-1">
                <Link href="/auth/register">Get Started</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
