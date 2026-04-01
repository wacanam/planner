import type { Metadata } from 'next';
import MyTerritoriesClient from './_components/MyTerritoriesClient';

export const metadata: Metadata = {
  title: 'My Territories | Ministry Planner',
};

export default function Page() {
  return <MyTerritoriesClient />;
}
