'use client';

import {
  BarChart2,
  ChevronRight,
  Compass,
  FileText,
  FolderOpen,
  Layers,
  MapPin,
  Menu,
  Shield,
  User,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCurrentUser, usePendingEndorsements, usePendingSharesCount } from '@/hooks';
import {
  canViewReports,
  isServiceOverseer,
  isSystemAdmin,
  isTerritoryServant,
} from '@/lib/permissions';

export function BottomTabBar() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';
  const { user } = useCurrentUser();
  const { count: pendingEndorsementsCount } = usePendingEndorsements(id);
  const { count: pendingSharesCount } = usePendingSharesCount();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!id) return null;

  const isOverseerRole = isServiceOverseer(user.role);
  const isServantRole = isTerritoryServant(user.role);
  const isAdminRole = isSystemAdmin(user.role);
  const canReports = canViewReports(user.role);

  const mainTabs = [
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
      badgeCount: pendingSharesCount,
    },
  ];

  const adminLinks = [
    ...(isOverseerRole
      ? [
          {
            href: `/congregation/${id}/members`,
            label: 'Members & Access',
            description: 'Directory, join approvals & endorsements',
            icon: Users,
            badgeCount: pendingEndorsementsCount,
          },
          {
            href: `/congregation/${id}/groups`,
            label: 'Service Groups',
            description: 'Field ministry groups & overseers',
            icon: FolderOpen,
          },
        ]
      : []),
    ...(canReports
      ? [
          {
            href: `/congregation/${id}/reports`,
            label: 'Congregation Reports',
            description: 'Coverage analytics & S-13 summaries',
            icon: BarChart2,
          },
        ]
      : []),
  ];

  const isOverseeActive =
    pathname.includes('/members') ||
    pathname.includes('/groups') ||
    pathname.includes('/reports') ||
    pathname.includes('/profile');

  const handleNavigate = (href: string) => {
    setSheetOpen(false);
    router.push(href);
  };

  return (
    <>
      <nav
        className="flex lg:hidden fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-md border-t border-border shadow-lg"
        style={{ zIndex: 900, paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {mainTabs.map(({ href, label, icon: Icon, badgeCount }) => {
          const isActive =
            pathname === href ||
            (href.includes('/records/') && pathname.includes('/records/')) ||
            (href.includes('/territories') && pathname.includes('/territories')) ||
            (href.includes('/my-assignments') && pathname.includes('/my-assignments'));

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

        {/* 5th Tab: Oversee Drawer Trigger */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 text-[11px] font-semibold transition-colors duration-150 relative cursor-pointer ${
                isOverseeActive
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative mb-0.5">
                <Menu size={18} />
                {Boolean(pendingEndorsementsCount) && (
                  <span className="absolute -top-1 -right-2 inline-flex items-center justify-center h-3.5 min-w-3.5 px-1 rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {pendingEndorsementsCount}
                  </span>
                )}
              </div>
              <span className="truncate max-w-[64px]">{isOverseerRole ? 'Oversee' : 'More'}</span>
            </button>
          </SheetTrigger>

          <SheetContent
            side="bottom"
            className="p-0 max-h-[85vh] rounded-t-3xl border-t border-border bg-background"
          >
            <div className="p-4 sm:p-6 space-y-4">
              <SheetHeader className="text-left pb-2 border-b border-border pr-8">
                <SheetTitle className="text-base font-bold text-foreground">
                  {isOverseerRole ? 'Overseer Management' : 'More Menu'}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  {isOverseerRole
                    ? 'Quick access to congregation management pages'
                    : 'Account settings & navigation'}
                </SheetDescription>
              </SheetHeader>

              {/* Administration Navigation Links */}
              {adminLinks.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-1 mb-1">
                    {isOverseerRole ? 'Congregation Administration' : 'Servant Management'}
                  </p>
                  {adminLinks.map(({ href, label, description, icon: Icon, badgeCount }) => {
                    const isActive = pathname.startsWith(href);
                    return (
                      <button
                        key={href}
                        type="button"
                        onClick={() => handleNavigate(href)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                          isActive
                            ? 'bg-primary/10 border-primary/30 text-primary shadow-xs'
                            : 'bg-card border-border hover:bg-muted/60 text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-primary/15 text-primary'
                            }`}
                          >
                            <Icon size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm tracking-tight">{label}</span>
                              {Boolean(badgeCount) && (
                                <Badge className="text-[9px] px-1.5 py-0 h-4 bg-primary text-primary-foreground font-bold">
                                  {badgeCount} Pending
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{description}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground shrink-0 ml-2" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Account & Global Admin Section */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-1 mb-1">
                  General & Account
                </p>

                <button
                  type="button"
                  onClick={() => handleNavigate('/profile')}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                    pathname === '/profile'
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-card border-border hover:bg-muted/60 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="w-8 h-8 rounded-lg border border-primary/20 bg-primary/10 overflow-hidden shrink-0">
                      {user.avatarUrl && (
                        <AvatarImage
                          src={user.avatarUrl}
                          alt={user.name || 'Profile'}
                          className="object-cover w-full h-full rounded-lg"
                        />
                      )}
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-xs">
                        {(user.name || user.email || 'P')
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <span className="font-semibold text-xs text-foreground block">
                        Profile & Settings
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate block">
                        Account credentials & preferences
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                </button>

                {isAdminRole && (
                  <button
                    type="button"
                    onClick={() => handleNavigate('/admin/dashboard')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                      pathname.startsWith('/admin')
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-card border-border hover:bg-muted/60 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                        <Shield size={16} />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-foreground block">
                          System Admin Panel
                        </span>
                        <span className="text-[11px] text-muted-foreground truncate block">
                          Global congregation manager
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                  </button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}
