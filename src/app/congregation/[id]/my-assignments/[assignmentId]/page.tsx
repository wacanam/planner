import type { Metadata } from 'next';
import AssignmentVisitsClient from './_components/AssignmentVisitsClient';

export const metadata: Metadata = { title: 'Assignment Details | Ministry Planner' };

export default function Page() {
  return <AssignmentVisitsClient />;
}
