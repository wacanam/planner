import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Records | Ministry Planner' };

// Redirect /records → /records/households
export default function RecordsPage({ params }: { params: { id: string } }) {
  redirect(`/congregation/${params.id}/records/households`);
}
