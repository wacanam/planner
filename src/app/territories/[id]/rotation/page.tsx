import type { Metadata } from 'next';
import RotationClient from './_components/RotationClient';

export const metadata: Metadata = {
  title: 'Rotation | Ministry Planner',
};

export default function Page() {
  return <RotationClient />;
}
