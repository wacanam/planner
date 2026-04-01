import type { Metadata } from 'next';
import AdminCongregationsClient from './_components/AdminCongregationsClient';

export const metadata: Metadata = {
  title: 'Congregations | Ministry Planner',
};

export default function Page() {
  return <AdminCongregationsClient />;
}
