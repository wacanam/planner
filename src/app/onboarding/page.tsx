import type { Metadata } from 'next';
import OnboardingClient from './_components/OnboardingClient';

export const metadata: Metadata = {
  title: 'Onboarding | Ministry Planner',
};

export default function Page() {
  return <OnboardingClient />;
}
