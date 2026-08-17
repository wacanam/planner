import type { Metadata } from 'next';
import ProfilePage from './_components/ProfileClient';

export const metadata: Metadata = { title: 'Profile & Settings | Ministry Planner' };

export default function Page() {
  return <ProfilePage />;
}
