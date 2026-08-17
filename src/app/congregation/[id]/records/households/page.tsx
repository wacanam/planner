import type { Metadata } from 'next';
import HouseholdsClient from './_components/HouseholdsClient';

export const metadata: Metadata = { title: 'My Households | Kanataran' };

export default function HouseholdsPage() {
  return <HouseholdsClient />;
}
