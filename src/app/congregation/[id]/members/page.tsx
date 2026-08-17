import type { Metadata } from 'next';
import MembersClient from './_components/MembersClient';

export const metadata: Metadata = { title: 'Congregation Members | Kanataran' };

export default function Page() {
  return <MembersClient />;
}
