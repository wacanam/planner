'use client';

import { signOut } from 'next-auth/react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NoCongregationPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4">
      <div className="w-full max-w-md text-center bg-card rounded-2xl shadow-sm border border-border p-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 mb-4">
          <MapPin size={24} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">No Congregation Yet</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Your account isn&apos;t linked to a congregation. Please contact your congregation
          administrator to be added.
        </p>
        <Button variant="outline" onClick={() => signOut({ callbackUrl: '/auth/login' })}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
