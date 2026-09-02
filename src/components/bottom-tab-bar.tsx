'use client';

import {
  BarChart2,
  Bell,
  ChevronRight,
  Compass,
  FileText,
  FolderOpen,
  Globe,
  Layers,
  LogOut,
  Map as MapIcon,
  MapPin,
  Megaphone,
  Menu,
  Shield,
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
import {
  useCurrentUser,
  useNotifications,
  usePendingEndorsements,
  usePendingSharesCount,
} from '@/hooks';
import { signOut } from '@/lib/firebase/auth';
import {
  canCreateTerritory,
  canManageGroups,
  canViewReports,
  isCircuitOverseer,
  isCongregationSecretary,
  isServiceOverseer,
  isSystemAdmin,
} from '@/lib/permissions';

export function BottomTabBar() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';
  const { user } = useCurrentUser();
  const { count: pendingEndorsementsCount } = usePendingEndorsements(id);
  const { count: pendingSharesCount } = usePendingSharesCount();
  const { unreadCount: unreadNotificationsCount } = useNotifications();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!id) return null;

  const isCircuitRole = isCircuitOverseer(user.role);
  const isOverseerRole = isServiceOverseer(user.role);
  const isSecretaryRole = isCongregationSecretary(user.role);
  const isAdminRole = isSystemAdmin(user.role);
  const canManageMembersAndGroups = canManageGroups(user.role, user.congregationRole);
  const canReports = canViewReports(user.role, user.congregationRole);
  const canViewMapOverview = canCreateTerritory(user.role) || isCircuitOverseer(user.role);

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
    ...(canManageMembersAndGroups
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
    ...(canViewMapOverview
      ? [
          {
            href: `/congregation/${id}/territories/overview`,
            label: 'Congregation Map',
            description: 'All territories, boundaries & live publishers',
            icon: MapIcon,
          },
        ]
      : []),
  ];

  const isOverseeActive =
    pathname.includes('/members') ||
    pathname.includes('/groups') ||
    pathname.includes('/reports') ||
    pathname.includes('/notifications') ||
    pathname.includes('/profile');

  const drawerBadgeCount = (pendingEndorsementsCount || 0) + (unreadNotificationsCount || 0);

  const handleNavigate = (href: string) => {
    setSheetOpen(false);
    router.push(href);
  };

  return (
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
              {Boolean(drawerBadgeCount) && (
                <span className="absolute -top-1 -right-2 inline-flex items-center justify-center h-3.5 min-w-3.5 px-1 rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {drawerBadgeCount}
                </span>
              )}
            </div>
            <span className="truncate max-w-[64px]">
              {isCircuitRole
                ? 'Circuit'
                : isOverseerRole
                  ? 'Oversee'
                  : isSecretaryRole
                    ? 'Secretary'
                    : 'More'}
            </span>
          </button>
        </SheetTrigger>

        <SheetContent
          side="bottom"
          className="rounded-t-3xl max-h-[85vh] overflow-y-auto px-4 pb-6 pt-3 border-border bg-background"
        >
          <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4" />
          <SheetHeader className="text-left pb-2">
            <SheetTitle className="text-base font-bold text-foreground">
              Menu & Navigation
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Manage congregation territories, members, reports, and your account.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-2">
            {/* Administration Section */}
            {adminLinks.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-1">
                  {isCircuitRole
                    ? 'Circuit Overseer Review'
                    : isOverseerRole
                      ? 'Congregation Administration'
                      : isSecretaryRole
                        ? 'Secretary Administration'
                        : 'Servant Management'}
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
                Congregation & Notices
              </p>

              <button
                type="button"
                onClick={() => handleNavigate(`/congregation/${id}/announcements`)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                  pathname.includes('/announcements')
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-card border-border hover:bg-muted/60 text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Megaphone size={16} />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-xs text-foreground block">
                      Announcements & Notices
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate block">
                      Service year updates & alerts
                    </span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-muted-foreground shrink-0" />
              </button>

              <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-1 mb-1 pt-2">
                General & Account
              </p>

              <button
                type="button"
                onClick={() => handleNavigate(`/congregation/${id}/notifications`)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                  pathname.includes('/notifications')
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-card border-border hover:bg-muted/60 text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <Bell size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground block">
                        Notifications
                      </span>
                      {Boolean(unreadNotificationsCount) && (
                        <Badge className="text-[9px] px-1.5 py-0 h-4 bg-primary text-primary-foreground font-bold">
                          {unreadNotificationsCount} New
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground truncate block">
                      Assignment & ministry updates
                    </span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-muted-foreground shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('/')}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                  pathname === '/'
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-card border-border hover:bg-muted/60 text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <Globe size={16} />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-xs text-foreground block">
                      Landing Page
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate block">
                      Public features & home page
                    </span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-muted-foreground shrink-0" />
              </button>

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
                      <span className="font-semibold text-xs text-primary font-bold block">
                        Admin Dashboard
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate block">
                        Global platform administration
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                </button>
              )}

              <button
                type="button"
                onClick={async () => {
                  setSheetOpen(false);
                  await signOut();
                  router.push('/');
                  router.refresh();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                    <LogOut size={16} />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-xs block">Sign Out</span>
                    <span className="text-[11px] text-muted-foreground truncate block">
                      Log out of your account
                    </span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-destructive/60 shrink-0" />
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
