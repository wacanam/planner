import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Records | Ministry Planner' };

export default function RecordsPage() {
  redirect('/records/households');
}
