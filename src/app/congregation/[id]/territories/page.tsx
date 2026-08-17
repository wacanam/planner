import type { Metadata } from 'next';
import TerritoriesClient from './_components/TerritoriesClient';

export const metadata: Metadata = { title: 'Territory Management | Ministry Planner' };

export default function Page() {
  return <TerritoriesClient />;
}
