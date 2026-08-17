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
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <AdminRequestsClient />
    </Suspense>
  );
}
