import type { Metadata } from 'next';
import DncClient from './_components/DncClient';

export const metadata: Metadata = {
  title: 'Do Not Call (DNC) Registry | Kanataran',
  description: 'Official address-only Do Not Call list for field service.',
};

export default function DncPage() {
  return <DncClient />;
}
