import type { Metadata } from 'next';
import HouseholdsClient from './_components/HouseholdsClient';
export const metadata: Metadata = { title: 'My Households | Ministry Planner' };
export default function HouseholdsPage() {
  return <HouseholdsClient />;
}
