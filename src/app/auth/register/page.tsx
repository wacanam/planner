import type { Metadata } from 'next';
import RegisterPage from './_components/RegisterClient';

export const metadata: Metadata = { title: 'Create Account | Ministry Planner' };

export default function Page() {
  return <RegisterPage />;
}
