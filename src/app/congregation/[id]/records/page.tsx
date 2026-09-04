import { redirect } from 'next/navigation';

export default async function RecordsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/congregation/${id}/records/notebook`);
}
