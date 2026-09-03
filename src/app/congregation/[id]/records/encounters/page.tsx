import { redirect } from 'next/navigation';

export default async function EncountersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/congregation/${id}/records/notebook`);
}
