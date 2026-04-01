import type { Metadata } from 'next';
import MembersClient from './_components/MembersClient';

export const metadata: Metadata = {
  title: 'Members | Ministry Planner',
};

export default function Page() {
  return <MembersClient />;
}
