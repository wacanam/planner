'use client';

import { usePathname } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard-header';

/**
 * Renders DashboardHeader on standalone authenticated pages that are NOT
 * inside a congregation or admin layout (which have their own DashboardHeader).
 *
 * These pages are authenticated but don't belong to a layout that injects
 * the dashboard header automatically.
 */
const STANDALONE_AUTH_ROUTES = ['/profile', '/notifications', '/onboarding'];

export function StandaloneAuthHeader() {
  const pathname = usePathname();
  const isStandaloneAuth = STANDALONE_AUTH_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );
  if (!isStandaloneAuth) return null;
  return <DashboardHeader />;
}
