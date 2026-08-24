'use client';

import { Clock, Home, Keyboard, Share2, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { DashboardHeader } from '@/components/dashboard-header';
import { ProtectedPage } from '@/components/protected-page';
import { KeyboardShortcutsDialog } from '@/components/shared/keyboard-shortcuts-dialog';
import { useKeyboardShortcuts, usePendingSharesCount } from '@/hooks';

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const id = (params?.id as string) || '';
  const { count: pendingSharesCount } = usePendingSharesCount();
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);

  const tabs = [
    {
      href: `/congregation/${id}/records/households`,
      label: 'Households',
      icon: Home,
      shortcut: '1',
    },
    {
      href: `/congregation/${id}/records/visits`,
      label: 'Visits',
      icon: Clock,
      shortcut: '2',
    },
    {
      href: `/congregation/${id}/records/encounters`,
      label: 'Encounters',
      icon: Users,
      shortcut: '3',
    },
    {
      href: `/congregation/${id}/records/shared`,
      label: 'Shared',
      icon: Share2,
      badgeCount: pendingSharesCount,
      shortcut: '4',
    },
  ];

  useKeyboardShortcuts([
    {
      key: ['1', 'Alt+1'],
      handler: () => router.push(`/congregation/${id}/records/households`),
    },
    {
      key: ['2', 'Alt+2'],
      handler: () => router.push(`/congregation/${id}/records/visits`),
    },
    {
      key: ['3', 'Alt+3'],
      handler: () => router.push(`/congregation/${id}/records/encounters`),
    },
    {
      key: ['4', 'Alt+4'],
      handler: () => router.push(`/congregation/${id}/records/shared`),
    },
    {
      key: ['?', 'Shift+?'],
      handler: () => setShortcutsDialogOpen(true),
    },
  ]);

  return (
    <ProtectedPage congregationId={id}>
      <DashboardHeader />
      <div className="border-b border-border bg-background sticky top-16 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <nav className="flex space-x-2 py-2 overflow-x-auto" aria-label="Records navigation">
              {tabs.map(({ href, label, icon: Icon, badgeCount, shortcut }) => {
                const isActive =
                  pathname === href ||
                  (href.endsWith('households') && pathname.includes('households'));
                return (
                  <Link
                    key={href}
                    href={href}
                    title={`${label} (Press ${shortcut})`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-primary/15 text-primary font-bold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                    <kbd
                      className={`hidden md:inline-flex items-center justify-center min-w-4 h-4 px-1 rounded text-[9px] font-mono font-bold leading-none ${
                        isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {shortcut}
                    </kbd>
                    {Boolean(badgeCount) && (
                      <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={() => setShortcutsDialogOpen(true)}
              title="Keyboard Shortcuts (?)"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <Keyboard size={14} />
              <span className="hidden lg:inline text-[11px]">Shortcuts</span>
              <kbd className="text-[10px] font-mono font-bold bg-muted px-1 py-0.5 rounded border border-border/80 text-foreground">
                ?
              </kbd>
            </button>
          </div>
        </div>
      </div>

      <div className="pb-24 lg:pb-8">{children}</div>
      <BottomTabBar />

      <KeyboardShortcutsDialog
        open={shortcutsDialogOpen}
        onOpenChange={setShortcutsDialogOpen}
        defaultTab="records"
      />
    </ProtectedPage>
  );
}
