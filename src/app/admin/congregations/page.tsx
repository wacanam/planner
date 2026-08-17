import type { Metadata } from 'next';
import AdminCongregationsPage from './_components/AdminCongregationsClient';

export const metadata: Metadata = { title: 'Manage Congregations | Kanataran' };

export default function Page() {
  return <AdminCongregationsPage />;
}
