import type { Metadata } from 'next';
import AssignmentsClient from './_components/AssignmentsClient';

export const metadata: Metadata = {
  title: 'Assignments | Ministry Planner',
};

export default function Page() {
  return <AssignmentsClient />;
}
