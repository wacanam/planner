import type { Metadata } from 'next';
import OnboardingPage from './_components/OnboardingClient';

export const metadata: Metadata = { title: 'Welcome | Kanataran' };

export default function Page() {
  return <OnboardingPage />;
}
