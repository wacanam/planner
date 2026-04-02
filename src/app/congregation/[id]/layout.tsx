'use client';

import { useParams } from 'next/navigation';
import { useCongregation } from '@/hooks';
import { DashboardHeader } from '@/components/dashboard-header';

export default function CongregationLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const congregationId = params?.id as string;

  const { congregation: data } = useCongregation(congregationId ?? null);
  const congregationName = data?.name;

  return (
    <>
      <DashboardHeader congregationId={congregationId} congregationName={congregationName} />
      <div className="flex-1 flex flex-col">{children}</div>
    </>
  );
}
