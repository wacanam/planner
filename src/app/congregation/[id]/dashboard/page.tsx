import type { Metadata } from 'next';
import CongregationDashboardClient from './_components/CongregationDashboardClient';

export const metadata: Metadata = {
  title: 'Congregation Dashboard | Ministry Planner',
};

export default function Page() {
  return <CongregationDashboardClient />;
}
