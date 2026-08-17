import type { Metadata } from 'next';
import MyAssignmentsClient from './_components/MyAssignmentsClient';

export const metadata: Metadata = { title: 'My Assignments | Kanataran' };

export default function Page() {
  return <MyAssignmentsClient />;
}
