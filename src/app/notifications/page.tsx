import type { Metadata } from 'next';
import { NotificationsClient } from './_components/NotificationsClient';

export const metadata: Metadata = {
  title: 'Notifications | Ministry Planner',
  description: 'View all your notifications',
};

export default function NotificationsPage() {
  return <NotificationsClient />;
}
