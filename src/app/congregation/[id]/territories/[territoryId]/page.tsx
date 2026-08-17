import type { Metadata } from 'next';
import TerritoryDetailView from './_components/TerritoryDetailView';

export const metadata: Metadata = { title: 'Territory Studio | Kanataran' };

export default function Page() {
  return <TerritoryDetailView />;
}
