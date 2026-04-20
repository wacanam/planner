import type { Metadata } from 'next';
import HouseholdsClient from '../../congregation/[id]/records/households/_components/HouseholdsClient';

export const metadata: Metadata = { title: 'My Households | Ministry Planner' };

export default function HouseholdsPage() {
  return <HouseholdsClient />;
}
