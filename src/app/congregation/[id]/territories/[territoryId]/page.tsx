import type { Metadata } from 'next';
import TerritoryDetailView from './_components/TerritoryDetailView';

export const metadata: Metadata = { title: 'Territory Studio | Ministry Planner' };

export default function Page() {
  return <TerritoryDetailView />;
}
