import type { Metadata } from 'next';
import AssignmentVisitsClient from './_components/AssignmentVisitsClient';

export const metadata: Metadata = {
  title: 'My Households & Visits | Ministry Planner',
};

export default function AssignmentVisitsPage() {
  return <AssignmentVisitsClient />;
}
