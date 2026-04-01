'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard-header';

export default function CongregationLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const congregationId = params?.id as string;
  const [congregationName, setCongregationName] = useState<string | undefined>();

  useEffect(() => {
    if (!congregationId) return;
    fetch(`/api/congregations/${congregationId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.name) setCongregationName(json.data.name);
      })
      .catch(() => {});
  }, [congregationId]);

  return (
    <>
      <DashboardHeader congregationId={congregationId} congregationName={congregationName} />
      <div className="flex-1 flex flex-col">{children}</div>
    </>
  );
}
