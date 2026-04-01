'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login after 3 seconds
    const timer = setTimeout(() => {
      router.push('/auth/login');
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12 min-h-screen bg-gradient-to-br from-accent/5 via-background to-primary/5">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8 sm:p-10">
          {/* Logo & heading */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/30 mb-4">
              <MapPin size={24} className="text-accent-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Registration</h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              User registration is managed by administrators
            </p>
          </div>

          <Alert className="mb-6">
            <AlertDescription>
              To create an account, contact your congregation administrator. They will provision your account and send you sign-in credentials.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?
            </p>
            <Button asChild className="w-full">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Redirecting to sign in in 3 seconds...
          </p>
        </div>
      </div>
    </div>
  );
}
