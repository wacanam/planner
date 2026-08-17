import type { Metadata } from 'next';
import LoginPage from './_components/LoginClient';

export const metadata: Metadata = { title: 'Sign In | Kanataran' };

export default function Page() {
  return <LoginPage />;
}
