import type { Metadata } from 'next';
import EncountersClient from '../../congregation/[id]/records/encounters/_components/EncountersClient';

export const metadata: Metadata = { title: 'My Encounters | Ministry Planner' };

export default function EncountersPage() {
  return <EncountersClient />;
}
