'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { SWRProvider } from '@/lib/swr-config';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SWRProvider>{children}</SWRProvider>
    </SessionProvider>
  );
}
