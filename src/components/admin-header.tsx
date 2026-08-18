'use client';

import {
  Building2,
  ChevronDown,
  Globe,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  User,
  Users,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdminAccountRequests, useCongregation, useCurrentUser } from '@/hooks';
import { signOut } from '@/lib/firebase/auth';

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useCurrentUser();
  const { pendingCount } = useAdminAccountRequests();
  const { congregation } = useCongregation(user.congregationId || '');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
      setIsSigningOut(false);
    }
  };

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
  ];

  const displayRole = (() => {
    const r = (user.role || '').toUpperCase().replace(/\s+/g, '_');
    if (r === 'SUPER_ADMIN') return 'Super Admin';
    return 'Admin';
  })();

  const userInitials = (user.name || user.email || 'A')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-md shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo & Admin Badge */}
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <Link href="/admin/dashboard" className="flex items-center gap-2.5 shrink-0 group">
              <Image
                src="/icons/icon-192.png"
                alt="Kanataran Logo"
                width={32}
                height={32}
                className="w-8 h-8 rounded-xl object-contain shadow-xs transition-transform group-hover:scale-105 shrink-0"
                priority
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-foreground tracking-tight leading-tight group-hover:text-primary transition-colors whitespace-nowrap">
                    Kanataran
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[9px] uppercase font-bold px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/25"
                  >
                    Admin
                  </Badge>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground truncate leading-tight flex items-center gap-1 mt-0.5">
                  <Shield size={10} className="shrink-0 text-primary" />
                  <span>Platform Console</span>
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      item.active
                        ? 'bg-primary/15 text-primary shadow-2xs font-bold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Icon size={14} className="shrink-0" />
                    <span>{item.label}</span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-500 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Link to Landing Page */}
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden lg:inline-flex h-8 text-xs gap-1.5 rounded-xl text-muted-foreground hover:text-foreground"
            >
              <Link href="/">
                <Globe size={13} />
                <span>Landing Page</span>
              </Link>
            </Button>

            {/* Quick Link to Congregation Workspace if user has one */}
            {user.congregationId && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex h-8 text-xs gap-1.5 rounded-xl"
              >
                <Link href={`/congregation/${user.congregationId}/dashboard`}>
                  <Building2 size={13} className="text-primary" />
                  <span className="truncate max-w-[120px]">
                    {congregation?.name || 'Workspace'}
                  </span>
                </Link>
              </Button>
            )}

            <ThemeToggle />

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 p-1 rounded-2xl hover:bg-muted/50 border border-transparent hover:border-border transition-all focus-visible:outline-none cursor-pointer"
                  aria-label="Admin user menu"
                >
                  <Avatar className="w-8 h-8 rounded-xl border border-primary/20 bg-primary/10 overflow-hidden shrink-0">
                    {user.avatarUrl && (
                      <AvatarImage
                        src={user.avatarUrl}
                        alt={user.name || 'Admin avatar'}
                        className="object-cover w-full h-full rounded-xl"
                      />
                    )}
                    <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown size={14} className="text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 bg-popover border-border shadow-lg p-2 rounded-2xl"
              >
                <DropdownMenuLabel className="px-2 py-1.5 space-y-2 font-normal">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="w-9 h-9 rounded-xl border border-primary/20 bg-primary/10 overflow-hidden shrink-0">
                      {user.avatarUrl && (
                        <AvatarImage
                          src={user.avatarUrl}
                          alt={user.name || 'Admin avatar'}
                          className="object-cover w-full h-full rounded-xl"
                        />
                      )}
                      <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-xs">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">
                        {user.name || 'Admin User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <div>
                    <Badge
                      variant="outline"
                      className="text-[9px] uppercase font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                    >
                      {displayRole}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                  <Link href="/" className="flex items-center gap-2 px-3 py-2 text-xs">
                    <Globe size={14} className="text-primary" />
                    <span>Landing Page</span>
                  </Link>
                </DropdownMenuItem>

                {user.congregationId && (
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                    <Link
                      href={`/congregation/${user.congregationId}/dashboard`}
                      className="flex items-center gap-2 px-3 py-2 text-xs"
                    >
                      <Building2 size={14} className="text-primary" />
                      <span>Congregation Workspace</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                  <Link href="/profile" className="flex items-center gap-2 px-3 py-2 text-xs">
                    <User size={14} />
                    <span>Profile & Settings</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="rounded-xl cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 px-3 py-2 text-xs flex items-center gap-2"
                >
                  <LogOut size={14} />
                  <span>{isSigningOut ? 'Signing Out…' : 'Sign Out'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Direct Sign Out Button for Desktop */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="hidden sm:inline-flex h-8 text-xs gap-1 rounded-xl text-destructive hover:bg-destructive/10 border-destructive/30"
              title="Sign Out"
            >
              <LogOut size={13} />
              <span className="hidden md:inline">{isSigningOut ? 'Signing out…' : 'Sign Out'}</span>
            </Button>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              className="md:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-all cursor-pointer"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle admin navigation"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-1 border-t border-border/60 pt-3">
            <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Admin Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    item.active
                      ? 'bg-primary/15 text-primary font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={14} />
                    <span>{item.label}</span>
                  </div>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-500 text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="border-t border-border/60 my-2 pt-2 space-y-1">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <Globe size={14} />
                <span>Landing Page</span>
              </Link>

              {user.congregationId && (
                <Link
                  href={`/congregation/${user.congregationId}/dashboard`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <Building2 size={14} />
                  <span>Congregation Workspace</span>
                </Link>
              )}

              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <User size={14} />
                <span>Profile & Settings</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignOut();
                }}
                disabled={isSigningOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
              >
                <LogOut size={14} />
                <span>{isSigningOut ? 'Signing Out…' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
