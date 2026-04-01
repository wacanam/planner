import type { Metadata } from 'next';
import TerritoryDetailClient from './_components/TerritoryDetailClient';

export const metadata: Metadata = {
  title: 'Territory | Ministry Planner',
};

export default function Page() {
  return <TerritoryDetailClient />;
}
