'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { LocalFirstProvider } from '@/lib/local-first/provider';
import { SWRProvider } from '@/lib/swr-config';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SWRProvider>
        <LocalFirstProvider>{children}</LocalFirstProvider>
      </SWRProvider>
    </SessionProvider>
  );
}
