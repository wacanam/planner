'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import { DashboardHeader } from '@/components/dashboard-header';

const fetcher = (url: string) => apiClient.get<{ name: string }>(url);

export default function CongregationLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const congregationId = params?.id as string;

  const { data } = useSWR(
    congregationId ? `/api/congregations/${congregationId}` : null,
    fetcher
  );
  const congregationName = data?.name;

  return (
    <>
      <DashboardHeader congregationId={congregationId} congregationName={congregationName} />
      <div className="flex-1 flex flex-col">{children}</div>
    </>
  );
}
