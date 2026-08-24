import { Suspense } from 'react';
import AdminUsersClient from './_components/AdminUsersClient';

export const metadata = {
  title: 'Users & Roles | Kanataran Admin',
  description: 'Manage global users, permissions, and system administrator roles',
};

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse p-4 sm:p-6 max-w-7xl mx-auto w-full">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded-md" />
            <div className="h-4 w-72 bg-muted rounded-md" />
          </div>
          <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            <div className="p-4 border-b flex justify-between">
              <div className="h-10 w-64 bg-muted rounded-md" />
              <div className="h-10 w-28 bg-muted rounded-md" />
            </div>
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array
                <div key={i} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-muted rounded-full" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-44 bg-muted rounded-md" />
                      <div className="h-3 w-64 bg-muted rounded-md" />
                    </div>
                  </div>
                  <div className="h-6 w-20 bg-muted rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <AdminUsersClient />
    </Suspense>
  );
}
