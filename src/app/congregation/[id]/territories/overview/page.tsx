import type { Metadata } from 'next';
import CongregationMapClient from './_components/CongregationMapClient';

export const metadata: Metadata = { title: 'Congregation Map Overview | Kanataran' };

export default function Page() {
  return <CongregationMapClient />;
}
