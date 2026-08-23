import { Suspense } from 'react';
import VerifyEmailClient from './_components/VerifyEmailClient';

export const metadata = {
  title: 'Verify Your Email | Kanataran',
  description: 'Verify your email address to access your Kanataran workspace',
};

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <VerifyEmailClient />
    </Suspense>
  );
}
