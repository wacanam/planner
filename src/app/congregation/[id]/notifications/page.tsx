import type { Metadata } from 'next';
import NotificationsClient from './_components/NotificationsClient';

export const metadata: Metadata = { title: 'Notifications | Kanataran' };

export default function Page() {
  return <NotificationsClient />;
}
