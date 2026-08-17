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
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <AdminUsersClient />
    </Suspense>
  );
}
