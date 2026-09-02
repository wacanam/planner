import { Suspense } from 'react';
import InviteClient from './_components/InviteClient';

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground animate-pulse">Loading invitation...</p>
        </div>
      }
    >
      <InviteClient />
    </Suspense>
  );
}
