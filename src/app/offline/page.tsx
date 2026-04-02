import type { Metadata } from 'next';
import { WifiOff } from 'lucide-react';

export const metadata: Metadata = { title: 'Offline | Ministry Planner' };

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-5">
        <WifiOff size={28} className="text-muted-foreground" />
      </div>
      <h1 className="text-xl font-bold text-foreground mb-2">You&apos;re offline</h1>
      <p className="text-muted-foreground text-sm max-w-sm">
        No internet connection. Some pages may still be available from cache.
        Changes you make will sync when you&apos;re back online.
      </p>
    </div>
  );
}
