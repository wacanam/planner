'use client';

import { DashboardHeader } from '@/components/dashboard-header';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardHeader />
      <div className="flex-1 flex flex-col">{children}</div>
    </>
  );
}
