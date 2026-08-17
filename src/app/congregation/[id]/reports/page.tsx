import type { Metadata } from 'next';
import ReportsClient from './_components/ReportsClient';

export const metadata: Metadata = { title: 'Congregation Reports | Kanataran' };

export default function Page() {
  return <ReportsClient />;
}
