'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[page error]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 mb-5">
        <AlertTriangle size={28} className="text-destructive" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-sm">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground/60 mb-4 font-mono">Error ID: {error.digest}</p>
      )}
      <Button onClick={reset} className="gap-2">
        <RefreshCw size={15} />
        Try again
      </Button>
    </div>
  );
}
