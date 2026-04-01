import type { Metadata } from 'next';
import AdminDashboardClient from './_components/AdminDashboardClient';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Ministry Planner',
};

export default function Page() {
  return <AdminDashboardClient />;
}
