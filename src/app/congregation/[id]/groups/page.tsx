import type { Metadata } from 'next';
import GroupsClient from './_components/GroupsClient';

export const metadata: Metadata = {
  title: 'Groups | Ministry Planner',
};

export default function Page() {
  return <GroupsClient />;
}
