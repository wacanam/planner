import type { Metadata } from 'next';
import ProfileClient from './_components/ProfileClient';

export const metadata: Metadata = {
  title: 'Profile | Ministry Planner',
};

export default function ProfilePage() {
  return <ProfileClient />;
}
