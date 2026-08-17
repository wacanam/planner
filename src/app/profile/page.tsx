import type { Metadata } from 'next';
import ProfilePage from './_components/ProfileClient';

export const metadata: Metadata = { title: 'Profile & Settings | Kanataran' };

export default function Page() {
  return <ProfilePage />;
}
