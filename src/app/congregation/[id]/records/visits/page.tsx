import type { Metadata } from 'next';
import VisitsClient from './_components/VisitsClient';

export const metadata: Metadata = { title: 'My Visits | Kanataran' };

export default function VisitsPage() {
  return <VisitsClient />;
}
