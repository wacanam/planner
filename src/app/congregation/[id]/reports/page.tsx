import type { Metadata } from 'next';
import ReportsClient from './_components/ReportsClient';

export const metadata: Metadata = { title: 'Congregation Reports | Ministry Planner' };

export default function Page() {
  return <ReportsClient />;
}
