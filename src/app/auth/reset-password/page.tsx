import { Suspense } from 'react';
import ResetPasswordClient from './_components/ResetPasswordClient';

export const metadata = {
  title: 'Reset Password | Ministry Planner',
  description: 'Set a new password for your Ministry Planner account',
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}
