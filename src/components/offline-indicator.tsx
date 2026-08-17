'use client';

import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // Initial check
    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm sticky top-0 z-50 transition-all">
      <WifiOff size={14} />
      <span>Working Offline — Changes are saved locally and will sync when connected</span>
    </div>
  );
}
