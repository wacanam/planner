import type { Metadata } from 'next';
import DashboardClient from './_components/DashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard | Ministry Planner',
};

export default function Page() {
  return <DashboardClient />;
}
