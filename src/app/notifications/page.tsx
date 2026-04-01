import type { Metadata } from 'next';
import { NotificationsClient } from './_components/NotificationsClient';

export const metadata: Metadata = {
  title: 'Notifications | Ministry Planner',
  description: 'View all your notifications',
};

export default function NotificationsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      <NotificationsClient />
    </div>
  );
}
