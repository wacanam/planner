import {
  BarChart2,
  Bell,
  BookOpen,
  Building2,
  ChevronDown,
  Compass,
  FileText,
  FolderOpen,
  Globe,
  Layers,
  LogOut,
  Map as MapIcon,
  MapPin,
  Megaphone,
  Shield,
  User,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { NotificationBell } from '@/components/notifications/notification-bell';
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
import {
  useCongregation,
  useCongregations,
  useCurrentUser,
  useNotifications,
  usePendingEndorsements,
  usePendingSharesCount,
} from '@/hooks';
import { signOut, useAuthSession as useSession } from '@/lib/firebase/auth';
import {
  canManageGroups,
  canViewReports,
  isCircuitOverseer,
  isCongregationSecretary,
  isServiceOverseer,
  isSystemAdmin,
} from '@/lib/permissions';

export function DashboardHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const id = (params?.id as string) || '';
  const { data: session } = useSession();
  const { user, userMemberships, switchCongregation } = useCurrentUser();
  const { congregation } = useCongregation(id);
  const { congregations = [] } = useCongregations();
  const { count: pendingEndorsementsCount } = usePendingEndorsements(id);
  const { count: pendingSharesCount } = usePendingSharesCount();
  const { unreadCount: unreadNotificationsCount } = useNotifications();

  const congMap = useMemo(() => new Map(congregations.map((c) => [c.id, c.name])), [congregations]);

  if (!session?.user) return null;

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  const navLinks = id
    ? [
        { href: `/congregation/${id}/dashboard`, label: 'Dashboard', icon: Layers },
        { href: `/congregation/${id}/my-assignments`, label: 'My Territory', icon: Compass },
        { href: `/congregation/${id}/records/notebook`, label: 'My Notebook', icon: BookOpen },
        { href: `/congregation/${id}/territories`, label: 'Territories', icon: MapPin },
        {
          href: `/congregation/${id}/records/households`,
          label: 'Doors',
          icon: FileText,
          badgeCount: pendingSharesCount,
        },
        ...(canManageGroups(user.role, user.congregationRole)
          ? [
              {
                href: `/congregation/${id}/members`,
                label: 'Members',
                icon: Users,
                badgeCount: pendingEndorsementsCount,
              },
              { href: `/congregation/${id}/groups`, label: 'Groups', icon: FolderOpen },
            ]
          : []),
        ...(canViewReports(user.role, user.congregationRole)
          ? [{ href: `/congregation/${id}/reports`, label: 'Reports', icon: BarChart2 }]
          : []),
        { href: `/congregation/${id}/announcements`, label: 'Announcements', icon: Megaphone },
      ]
    : [];

  const homeHref = (() => {
    if (isSystemAdmin(user.role)) return '/admin/dashboard';
    if (id) return `/congregation/${id}/dashboard`;
    return '/onboarding';
  })();

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

  const avatarUrl = user.avatarUrl || session?.user?.avatarUrl || null;

  const userInitials = (user.name || user.email || 'P')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header
      data-tour="dashboard-header"
      className="sticky top-0 z-40 w-full border-b border-border bg-background shadow-xs"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Brand Logo & Congregation */}
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 min-w-0 flex-1">
            <Link href={homeHref} className="flex items-center gap-2.5 shrink-0 group">
              <Image
                src="/icons/icon-192.png"
                alt="Kanataran Logo"
                width={32}
                height={32}
                className="w-8 h-8 rounded-xl object-contain shadow-xs transition-transform group-hover:scale-105 shrink-0"
                priority
              />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm text-foreground tracking-tight leading-tight group-hover:text-primary transition-colors whitespace-nowrap">
                  Kanataran
                </span>
                {congregation &&
                  (userMemberships.length > 1 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="text-[11px] font-medium text-muted-foreground hover:text-foreground truncate leading-tight flex items-center gap-1 mt-0.5 max-w-[140px] sm:max-w-[190px] cursor-pointer text-left focus-visible:outline-none"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Building2 size={10} className="shrink-0 text-primary" />
                          <span className="truncate">{congregation.name}</span>
                          <ChevronDown size={10} className="shrink-0 opacity-70" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-56 p-1 rounded-2xl shadow-lg border-border"
                      >
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Circuit Congregations
                        </div>
                        {userMemberships.map((m) => (
                          <DropdownMenuItem
                            key={m.congregationId}
                            onClick={() => {
                              switchCongregation(m.congregationId);
                              router.push(`/congregation/${m.congregationId}/dashboard`);
                            }}
                            className={`rounded-xl text-xs flex items-center justify-between cursor-pointer ${
                              m.congregationId === id ? 'bg-primary/10 font-bold text-primary' : ''
                            }`}
                          >
                            <span className="truncate">
                              {congMap.get(m.congregationId) || m.congregationId}
                            </span>
                            {m.congregationRole && (
                              <Badge
                                variant="outline"
                                className="text-[9px] uppercase font-semibold"
                              >
                                {m.congregationRole.replace(/_/g, ' ')}
                              </Badge>
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="text-[11px] font-medium text-muted-foreground truncate leading-tight flex items-center gap-1 mt-0.5 max-w-[130px] sm:max-w-[180px]">
                      <Building2 size={10} className="shrink-0 text-primary" />
                      <span className="truncate">{congregation.name}</span>
                    </span>
                  ))}
              </div>
            </Link>

            {/* Desktop Navigation Tabs */}
            {navLinks.length > 0 && (
              <nav className="hidden md:flex items-center gap-0.5 lg:gap-1 min-w-0 flex-1 overflow-x-auto scrollbar-none py-1">
                {navLinks.map(({ href, label, icon: Icon, badgeCount }) => {
                  const isActive =
                    pathname === href ||
                    (href.includes('/records/') && pathname.includes('/records/')) ||
                    (href.includes('/territories') && pathname.includes('/territories')) ||
                    (href.includes('/my-assignments') && pathname.includes('/my-assignments'));

                  const tourAttr = href.includes('/territories') ? 'nav-territories' : undefined;

                  return (
                    <Link
                      key={href}
                      href={href}
                      data-tour={tourAttr}
                      className={`relative flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-150 ${
                        isActive
                          ? 'bg-primary/15 text-primary shadow-2xs font-bold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Icon size={14} className="shrink-0" />
                      <span className="whitespace-nowrap">{label}</span>
                      {Boolean(badgeCount) && (
                        <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {badgeCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Right Action Icons & Profile Dropdown */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            {isSystemAdmin(user.role) && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex h-8 text-xs gap-1"
              >
                <Link href="/admin/dashboard">
                  <Shield size={13} />
                  <span>Admin</span>
                </Link>
              </Button>
            )}

            <NotificationBell />

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 p-1 rounded-2xl hover:bg-muted/50 border border-transparent hover:border-border transition-all focus-visible:outline-none cursor-pointer"
                  aria-label="User menu"
                >
                  <Avatar className="w-8 h-8 rounded-xl border border-primary/20 bg-primary/10 overflow-hidden shrink-0">
                    {avatarUrl && (
                      <AvatarImage
                        src={avatarUrl}
                        alt={user.name || 'User avatar'}
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
                <DropdownMenuLabel className="px-2 py-1.5 space-y-2.5 font-normal">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="w-9 h-9 rounded-xl border border-primary/20 bg-primary/10 overflow-hidden shrink-0">
                      {avatarUrl && (
                        <AvatarImage
                          src={avatarUrl}
                          alt={user.name || 'User avatar'}
                          className="object-cover w-full h-full rounded-xl"
                        />
                      )}
                      <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-xs">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">
                        {user.name || 'Publisher'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>

                  {congregation ? (
                    <div className="p-2 rounded-xl bg-muted/60 border border-border space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Building2 size={13} className="text-primary shrink-0" />
                        <span className="truncate">{congregation.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase font-bold text-primary bg-primary/10 border-primary/20"
                        >
                          {displayRole}
                        </Badge>
                        {congregation.city && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            • {congregation.city}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <Badge variant="outline" className="text-[9px] uppercase font-semibold">
                        {displayRole}
                      </Badge>
                    </div>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {id &&
                  (canManageGroups(user.role, user.congregationRole) ||
                    canViewReports(user.role, user.congregationRole) ||
                    isCircuitOverseer(user.role)) && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        {isCircuitOverseer(user.role)
                          ? 'Circuit Overseer Menu'
                          : isServiceOverseer(user.role)
                            ? 'Overseer Menu'
                            : isCongregationSecretary(user.role)
                              ? 'Secretary Menu'
                              : 'Servant Menu'}
                      </div>
                      {canManageGroups(user.role, user.congregationRole) && (
                        <>
                          <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                            <Link
                              href={`/congregation/${id}/members`}
                              className="flex items-center justify-between px-3 py-1.5 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <Users size={14} className="text-primary" />
                                <span>Members & Access</span>
                              </div>
                              {Boolean(pendingEndorsementsCount) && (
                                <Badge className="text-[9px] px-1.5 py-0 h-4 bg-primary text-primary-foreground font-bold">
                                  {pendingEndorsementsCount}
                                </Badge>
                              )}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                            <Link
                              href={`/congregation/${id}/groups`}
                              className="flex items-center gap-2 px-3 py-1.5 text-xs"
                            >
                              <FolderOpen size={14} className="text-primary" />
                              <span>Service Groups</span>
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      {canViewReports(user.role, user.congregationRole) && (
                        <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                          <Link
                            href={`/congregation/${id}/reports`}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs"
                          >
                            <BarChart2 size={14} className="text-primary" />
                            <span>Reports</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                        <Link
                          href={`/congregation/${id}/territories/overview`}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs"
                        >
                          <MapIcon size={14} className="text-primary" />
                          <span>Congregation Map</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                  <Link
                    href={id ? `/congregation/${id}/notifications` : '/profile'}
                    className="flex items-center justify-between px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Bell size={14} />
                      <span>Notifications</span>
                    </div>
                    {unreadNotificationsCount > 0 && (
                      <Badge className="text-[9px] px-1.5 py-0 h-4 bg-primary text-primary-foreground font-bold">
                        {unreadNotificationsCount}
                      </Badge>
                    )}
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                  <Link href="/" className="flex items-center gap-2 px-3 py-2 text-xs">
                    <Globe size={14} />
                    <span>Landing Page</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                  <Link href="/profile" className="flex items-center gap-2 px-3 py-2 text-xs">
                    <User size={14} />
                    <span>Profile & Settings</span>
                  </Link>
                </DropdownMenuItem>

                {isSystemAdmin(user.role) && (
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                    <Link
                      href="/admin/dashboard"
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-primary"
                    >
                      <Shield size={14} />
                      <span>Admin Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="rounded-xl cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 px-3 py-2 text-xs flex items-center gap-2"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
