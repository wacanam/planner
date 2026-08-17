import type { Metadata } from 'next';
import AssignmentVisitsClient from './_components/AssignmentVisitsClient';

export const metadata: Metadata = { title: 'Assignment Details | Kanataran' };

export default function Page() {
  return <AssignmentVisitsClient />;
}
