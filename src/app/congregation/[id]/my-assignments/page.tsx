import type { Metadata } from 'next';
import MyAssignmentsClient from './_components/MyAssignmentsClient';

export const metadata: Metadata = {
  title: 'My Assignments | Ministry Planner',
};

export default function MyAssignmentsPage() {
  return <MyAssignmentsClient />;
}
