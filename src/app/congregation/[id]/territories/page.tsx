import type { Metadata } from 'next';
import TerritoriesClient from './_components/TerritoriesClient';

export const metadata: Metadata = {
  title: 'Territories | Ministry Planner',
};

export default function Page() {
  return <TerritoriesClient />;
}
