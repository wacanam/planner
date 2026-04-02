'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetchWithAuth } from '@/lib/api-client';
import { DashboardHeader } from '@/components/dashboard-header';

const fetcher = (url: string) => fetchWithAuth<{ data: { name: string } }>(url);

export default function CongregationLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const congregationId = params?.id as string;

  const { data } = useSWR(
    congregationId ? `/api/congregations/${congregationId}` : null,
    fetcher
  );
  const congregationName = data?.data?.name;

  return (
    <>
      <DashboardHeader congregationId={congregationId} congregationName={congregationName} />
      <div className="flex-1 flex flex-col">{children}</div>
    </>
  );
}
