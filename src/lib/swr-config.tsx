'use client';
import { SWRConfig } from 'swr';
import { fetchWithAuth } from '@/lib/api-client';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: (url: string) => fetchWithAuth(url),
        revalidateOnFocus: false,
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  );
}
