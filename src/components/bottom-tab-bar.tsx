'use client';

import {
  BarChart2,
  Bell,
  BookOpen,
  ChevronRight,
  Clock,
  Compass,
  FolderOpen,
  Globe,
  Home,
  Layers,
  LogOut,
  Map as MapIcon,
  MapPin,
  Megaphone,
  Menu,
  Share2,
  Shield,
  ShieldAlert,
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

interface DrawerItem {
  href?: string;
  label: string;
  description: string;
  icon?: React.ComponentType<{ size: number; className?: string }>;
  customIcon?: React.ReactNode;
  badgeCount?: number;
  badgeLabel?: string;
  onClick?: () => void;
}

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

  const displayRole = (() => {
    const r = (user.congregationRole || user.role || '').toUpperCase().replace(/\s+/g, '_');
    if (r === 'SUPER_ADMIN') return 'Super Admin';
    if (r === 'ADMIN') return 'Admin';
    if (r === 'CIRCUIT_OVERSEER') return 'Circuit Overseer';
    if (r === 'SERVICE_OVERSEER') return 'Service Overseer';
    if (r === 'SECRETARY' || r === 'CONGREGATION_SECRETARY') return 'Secretary';
    if (r === 'TERRITORY_SERVANT') return 'Territory Servant';
    if (r === 'VISITING_PUBLISHER') return 'Visiting Publisher';
    return 'Publisher';
  })();

  const userInitials = (user.name || user.email || 'P')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Option A (Ministry-First): Home | My Territory | Notebook | Territories | More
  const mainTabs = [
    {
      href: `/congregation/${id}/dashboard`,
      label: 'Home',
      icon: Layers,
    },
    {
      href: `/congregation/${id}/my-assignments`,
      label: 'My Territory',
      icon: Compass,
    },
    {
      href: `/congregation/${id}/records/notebook`,
      label: 'Notebook',
      icon: BookOpen,
    },
    {
      href: `/congregation/${id}/territories`,
      label: 'Territories',
      icon: MapPin,
    },
  ];

  // More Drawer Sections
  const ministryRecordsLinks: DrawerItem[] = [
    {
      href: `/congregation/${id}/records/dnc`,
      label: 'Do Not Call Registry',
      description: 'Official address-only skip list',
      icon: ShieldAlert,
    },
    {
      href: `/congregation/${id}/records/households`,
      label: 'Household Directory',
      description: 'Address directory & territory households',
      icon: Home,
      badgeCount: pendingSharesCount,
      badgeLabel: 'New',
    },
    {
      href: `/congregation/${id}/records/visits`,
      label: 'Visits History',
      description: 'Territory coverage & activity logs',
      icon: Clock,
    },
    {
      href: `/congregation/${id}/records/shared`,
      label: 'Shared Households',
      description: 'Collaborative records & peer shares',
      icon: Share2,
      badgeCount: pendingSharesCount,
      badgeLabel: 'Pending',
    },
    ...(canViewMapOverview
      ? [
          {
            href: `/congregation/${id}/territories/overview`,
            label: 'Congregation Map',
            description: 'All territories, boundaries & coverage',
            icon: MapIcon,
          },
        ]
      : []),
  ];

  const serviceGroupLinks: DrawerItem[] = [
    {
      href: `/congregation/${id}/groups`,
      label: 'Service Groups',
      description: 'Field ministry groups, overseers & members',
      icon: FolderOpen,
    },
  ];

  const administrationLinks: DrawerItem[] = [
    ...(canManageMembersAndGroups
      ? [
          {
            href: `/congregation/${id}/members`,
            label: 'Members & Access',
            description: 'Directory, join approvals & endorsements',
            icon: Users,
            badgeCount: pendingEndorsementsCount,
            badgeLabel: 'Pending',
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

  const noticesLinks: DrawerItem[] = [
    {
      href: `/congregation/${id}/announcements`,
      label: 'Announcements & Notices',
      description: 'Service year updates & alerts',
      icon: Megaphone,
    },
    {
      href: `/congregation/${id}/notifications`,
      label: 'Notifications',
      description: 'Assignment & ministry updates',
      icon: Bell,
      badgeCount: unreadNotificationsCount,
      badgeLabel: 'New',
    },
  ];

  const accountLinks: DrawerItem[] = [
    {
      href: '/',
      label: 'Landing Page',
      description: 'Public features & home page',
      icon: Globe,
    },
    {
      href: '/profile',
      label: 'Profile & Settings',
      description: 'Account credentials & preferences',
      customIcon: (
        <Avatar className="w-8 h-8 rounded-lg border border-primary/20 bg-primary/10 overflow-hidden shrink-0">
          {user.avatarUrl && (
            <AvatarImage
              src={user.avatarUrl}
              alt={user.name || 'Profile'}
              className="object-cover w-full h-full rounded-lg"
            />
          )}
          <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-xs">
            {userInitials}
          </AvatarFallback>
        </Avatar>
      ),
    },
    ...(isAdminRole
      ? [
          {
            href: '/admin/dashboard',
            label: 'Admin Dashboard',
            description: 'Global platform administration',
            icon: Shield,
          },
        ]
      : []),
  ];

  const isMoreActive =
    pathname.includes('/records/households') ||
    pathname.includes('/records/visits') ||
    pathname.includes('/records/dnc') ||
    pathname.includes('/records/shared') ||
    pathname.includes('/territories/overview') ||
    pathname.includes('/groups') ||
    pathname.includes('/members') ||
    pathname.includes('/reports') ||
    pathname.includes('/announcements') ||
    pathname.includes('/notifications') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/admin');

  const drawerBadgeCount =
    (canManageMembersAndGroups ? pendingEndorsementsCount || 0 : 0) +
    (unreadNotificationsCount || 0) +
    (pendingSharesCount || 0);

  const handleNavigate = (href: string) => {
    setSheetOpen(false);
    router.push(href);
  };

  const renderDrawerItem = ({
    href,
    label,
    description,
    icon: Icon,
    customIcon,
    badgeCount,
    badgeLabel,
    onClick,
  }: DrawerItem) => {
    const isActive = href ? (href === '/' ? pathname === '/' : pathname.startsWith(href)) : false;

    return (
      <button
        key={label}
        type="button"
        onClick={onClick || (() => href && handleNavigate(href))}
        className={`w-full flex items-center justify-between p-2.5 rounded-2xl border transition-all text-left cursor-pointer ${
          isActive
            ? 'bg-primary/10 border-primary/30 text-primary shadow-xs'
            : 'bg-card border-border hover:bg-muted/60 text-foreground'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {customIcon ? (
            customIcon
          ) : Icon ? (
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                isActive ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary'
              }`}
            >
              <Icon size={16} />
            </div>
          ) : null}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs tracking-tight block">{label}</span>
              {Boolean(badgeCount) && (
                <Badge className="text-[9px] px-1.5 py-0 h-4 bg-primary text-primary-foreground font-bold">
                  {badgeCount} {badgeLabel || 'New'}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{description}</p>
          </div>
        </div>
        <ChevronRight size={14} className="text-muted-foreground shrink-0 ml-2" />
      </button>
    );
  };

  return (
    <nav
      className="flex lg:hidden fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-md border-t border-border shadow-lg"
      style={{ zIndex: 900, paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {mainTabs.map(({ href, label, icon: Icon }) => {
        const isActive = (() => {
          if (href === `/congregation/${id}/dashboard`) {
            return pathname === href || pathname === `/congregation/${id}`;
          }
          if (href === `/congregation/${id}/my-assignments`) {
            return pathname.startsWith(`/congregation/${id}/my-assignments`);
          }
          if (href === `/congregation/${id}/records/notebook`) {
            return pathname.startsWith(`/congregation/${id}/records/notebook`);
          }
          if (href === `/congregation/${id}/territories`) {
            return (
              (pathname === `/congregation/${id}/territories` ||
                pathname.startsWith(`/congregation/${id}/territories/`)) &&
              !pathname.includes('/overview')
            );
          }
          return pathname === href;
        })();

        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-1 text-[11px] font-semibold transition-colors duration-150 relative ${
              isActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="relative mb-0.5">
              <Icon size={18} />
            </div>
            <span className="truncate max-w-[68px] text-center">{label}</span>
          </Link>
        );
      })}

      {/* 5th Tab: More Options Drawer Trigger */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className={`flex-1 flex flex-col items-center justify-center py-2 px-1 text-[11px] font-semibold transition-colors duration-150 relative cursor-pointer ${
              isMoreActive
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
            <span className="truncate max-w-[68px]">More</span>
          </button>
        </SheetTrigger>

        <SheetContent
          side="bottom"
          className="rounded-t-3xl max-h-[85vh] overflow-y-auto px-4 pb-6 pt-3 border-border bg-background"
        >
          <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-3" />
          <SheetHeader className="text-left pb-2">
            <div className="flex items-center justify-between gap-2">
              <SheetTitle className="text-base font-bold text-foreground">More Options</SheetTitle>
              <Badge variant="secondary" className="text-[10px] font-semibold shrink-0">
                {displayRole}
              </Badge>
            </div>
            <SheetDescription className="text-xs text-muted-foreground">
              Ministry records, service groups, congregation tools, and account settings.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-2">
            {/* 1. Field Ministry & Records */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-1">
                Field Ministry & Records
              </p>
              {ministryRecordsLinks.map(renderDrawerItem)}
            </div>

            {/* 2. Service Groups */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-1">
                Service Groups
              </p>
              {serviceGroupLinks.map(renderDrawerItem)}
            </div>

            {/* 3. Congregation Administration */}
            {administrationLinks.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-border">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-1">
                  {isCircuitRole
                    ? 'Circuit Overseer Review'
                    : isOverseerRole
                      ? 'Congregation Administration'
                      : isSecretaryRole
                        ? 'Secretary Administration'
                        : 'Congregation Administration'}
                </p>
                {administrationLinks.map(renderDrawerItem)}
              </div>
            )}

            {/* 4. Congregation & Notices */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-1">
                Congregation & Notices
              </p>
              {noticesLinks.map(renderDrawerItem)}
            </div>

            {/* 5. Account & Settings */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-1">
                Account & Settings
              </p>
              {accountLinks.map(renderDrawerItem)}

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={async () => {
                  setSheetOpen(false);
                  await signOut();
                  router.push('/');
                  router.refresh();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive transition-all text-left cursor-pointer mt-2"
              >
                <div className="flex items-center gap-3 min-w-0">
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
                <ChevronRight size={14} className="text-destructive/60 shrink-0 ml-2" />
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
