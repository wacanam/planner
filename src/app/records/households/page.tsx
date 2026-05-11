import type { Metadata } from 'next';
import { Suspense } from 'react';
import HouseholdsClient from '../../congregation/[id]/records/households/_components/HouseholdsClient';

export const metadata: Metadata = { title: 'My Households | Ministry Planner' };

export default function HouseholdsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading households…</div>}>
      <HouseholdsClient />
    </Suspense>
  );
}
