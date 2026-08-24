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
        <div className="min-h-[80vh] flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl border bg-card shadow-xs space-y-6 animate-pulse">
            <div className="space-y-2 text-center flex flex-col items-center">
              <div className="h-12 w-12 bg-muted rounded-full mb-2" />
              <div className="h-7 w-48 bg-muted rounded-md" />
              <div className="h-4 w-64 bg-muted rounded-md" />
            </div>
            <div className="space-y-3 pt-2">
              <div className="h-10 w-full bg-muted rounded-md" />
              <div className="h-10 w-full bg-muted rounded-md" />
            </div>
          </div>
        </div>
      }
    >
      <VerifyEmailClient />
    </Suspense>
  );
}
