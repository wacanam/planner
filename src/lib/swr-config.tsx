'use client';
import { SWRConfig } from 'swr';
import { apiGet } from '@/lib/api-client';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: (url: string) => apiGet(url).then(r => r.data),
        revalidateOnFocus: false,
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  );
}
