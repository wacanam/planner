import type { Metadata } from 'next';
import EncountersClient from './_components/EncountersClient';
export const metadata: Metadata = { title: 'My Encounters | Ministry Planner' };
export default function EncountersPage() {
  return <EncountersClient />;
}
