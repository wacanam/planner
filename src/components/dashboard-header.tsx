import {
  BarChart2,
  Building2,
  ChevronDown,
  Compass,
  FileText,
  FolderOpen,
  Layers,
  LogOut,
  MapPin,
  Shield,
  User,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
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
import { useCongregation, useCurrentUser, usePendingEndorsements } from '@/hooks';
import { signOut, useAuthSession as useSession } from '@/lib/firebase/auth';
import { isServiceOverseer, isSystemAdmin } from '@/lib/permissions';

export function DashboardHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const id = (params?.id as string) || '';
  const { data: session } = useSession();
  const { user } = useCurrentUser();
  const { congregation } = useCongregation(id);
  const { count: pendingEndorsementsCount } = usePendingEndorsements(id);

  if (!session?.user) return null;

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  const navLinks = id
    ? [
        { href: `/congregation/${id}/dashboard`, label: 'Dashboard', icon: Layers },
        { href: `/congregation/${id}/territories`, label: 'Territories', icon: MapPin },
        { href: `/congregation/${id}/my-assignments`, label: 'My Assignments', icon: Compass },
        { href: `/congregation/${id}/records/households`, label: 'Records', icon: FileText },
        ...(isServiceOverseer(user.role)
          ? [
              {
                href: `/congregation/${id}/members`,
                label: 'Members',
                icon: Users,
                badgeCount: pendingEndorsementsCount,
              },
              { href: `/congregation/${id}/groups`, label: 'Groups', icon: FolderOpen },
              { href: `/congregation/${id}/reports`, label: 'Reports', icon: BarChart2 },
            ]
          : []),
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
    if (r === 'SERVICE_OVERSEER') return 'Service Overseer';
    if (r === 'TERRITORY_SERVANT') return 'Territory Servant';
    return 'Publisher';
  })();

  const userInitials = (user.name || user.email || 'P')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background shadow-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Congregation */}
          <div className="flex items-center gap-4 min-w-0">
            <Link href={homeHref} className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors shrink-0">
                <MapPin size={16} className="text-primary" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm text-foreground tracking-tight leading-tight group-hover:text-primary transition-colors">
                  Ministry Planner
                </span>
                {congregation && (
                  <span className="text-[11px] font-medium text-muted-foreground truncate leading-tight flex items-center gap-1 mt-0.5">
                    <Building2 size={10} className="shrink-0 text-primary" />
                    <span className="truncate">{congregation.name}</span>
                  </span>
                )}
              </div>
            </Link>

            {/* Desktop Navigation Tabs */}
            {navLinks.length > 0 && (
              <nav className="hidden lg:flex items-center gap-1 min-w-0 ml-1">
                {navLinks.map(({ href, label, icon: Icon, badgeCount }) => {
                  const isActive =
                    pathname === href ||
                    (href.includes('/records/') && pathname.includes('/records/')) ||
                    (href.includes('/territories') && pathname.includes('/territories')) ||
                    (href.includes('/my-assignments') && pathname.includes('/my-assignments'));

                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? 'bg-primary/15 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Icon size={14} />
                      <span>{label}</span>
                      {Boolean(badgeCount) && (
                        <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
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
          <div className="flex items-center gap-2 shrink-0">
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

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border transition-all focus-visible:outline-none"
                  aria-label="User menu"
                >
                  <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                    {userInitials}
                  </div>
                  <ChevronDown size={14} className="text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 bg-popover border-border shadow-lg p-2 rounded-2xl"
              >
                <DropdownMenuLabel className="px-2 py-1.5 space-y-2 font-normal">
                  <div>
                    <p className="text-sm font-bold text-foreground truncate">
                      {user.name || 'Publisher'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
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
                      className="flex items-center gap-2 px-3 py-2 text-xs"
                    >
                      <Shield size={14} />
                      <span>System Admin</span>
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
