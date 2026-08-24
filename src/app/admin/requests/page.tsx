import { Suspense } from 'react';
import AdminRequestsClient from './_components/AdminRequestsClient';

export const metadata = {
  title: 'Requests & Approvals Queue | Kanataran Admin',
  description: 'Review and approve account deletion and congregation leave requests',
};

export default function AdminRequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 min-w-0 w-full animate-pulse">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted rounded-md" />
            <div className="h-4 w-96 bg-muted rounded-md" />
          </div>
          <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            <div className="p-4 border-b flex justify-between">
              <div className="h-10 w-64 bg-muted rounded-md" />
              <div className="h-10 w-32 bg-muted rounded-md" />
            </div>
            <div className="divide-y">
              {Array.from({ length: 4 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array
                <div key={i} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-muted rounded-full" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-40 bg-muted rounded-md" />
                      <div className="h-3 w-56 bg-muted rounded-md" />
                    </div>
                  </div>
                  <div className="h-8 w-24 bg-muted rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <AdminRequestsClient />
    </Suspense>
  );
}
