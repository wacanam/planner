import type { Metadata } from 'next';
import LoginClient from './_components/LoginClient';

export const metadata: Metadata = {
  title: 'Sign In | Ministry Planner',
};

export default function Page() {
  return <LoginClient />;
}
