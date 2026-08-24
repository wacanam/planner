import { Suspense } from 'react';
import ResetPasswordClient from './_components/ResetPasswordClient';

export const metadata = {
  title: 'Reset Password | Kanataran',
  description: 'Set a new password for your Kanataran account',
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl border bg-card shadow-xs space-y-6 animate-pulse">
            <div className="space-y-2 text-center flex flex-col items-center">
              <div className="h-10 w-10 bg-muted rounded-xl mb-2" />
              <div className="h-7 w-48 bg-muted rounded-md" />
              <div className="h-4 w-64 bg-muted rounded-md" />
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="h-4 w-16 bg-muted rounded-md" />
                <div className="h-10 w-full bg-muted rounded-md" />
              </div>
              <div className="h-10 w-full bg-muted rounded-md" />
            </div>
          </div>
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}
