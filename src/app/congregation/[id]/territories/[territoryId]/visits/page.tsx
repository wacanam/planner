import type { Metadata } from 'next';
import VisitsClient from './_components/VisitsClient';

export const metadata: Metadata = {
  title: 'Households & Visits | Ministry Planner',
};

export default function Page() {
  return <VisitsClient />;
}
