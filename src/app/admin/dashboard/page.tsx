import type { Metadata } from 'next';
import AdminDashboardPage from './_components/AdminDashboardClient';

export const metadata: Metadata = { title: 'Global Admin Dashboard | Kanataran' };

export default function Page() {
  return <AdminDashboardPage />;
}
