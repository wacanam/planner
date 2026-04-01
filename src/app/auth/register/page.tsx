import type { Metadata } from 'next';
import RegisterClient from './_components/RegisterClient';

export const metadata: Metadata = {
  title: 'Create Account | Ministry Planner',
};

export default function Page() {
  return <RegisterClient />;
}
