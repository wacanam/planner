'use client';

import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MapPin, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NoCongregationPage() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4">
      <div className="w-full max-w-md text-center bg-card rounded-2xl shadow-sm border border-border p-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 mb-4">
          <MapPin size={24} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">No congregation yet</h1>
        <p className="text-muted-foreground text-sm mb-8">
          You&apos;re not linked to a congregation. You can create your own, or ask your
          congregation admin to add you.
        </p>

        <div className="space-y-3">
          <Button className="w-full" onClick={() => router.push('/onboarding')}>
            Create a congregation
            <ArrowRight size={16} className="ml-1" />
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
