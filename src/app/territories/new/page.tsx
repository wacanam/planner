import type { Metadata } from 'next';
import NewTerritoryClient from './_components/NewTerritoryClient';

export const metadata: Metadata = {
  title: 'New Territory | Ministry Planner',
};

export default function Page() {
  return <NewTerritoryClient />;
}
