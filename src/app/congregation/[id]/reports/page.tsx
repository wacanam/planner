import type { Metadata } from 'next';
import ReportsClient from './_components/ReportsClient';

export const metadata: Metadata = {
  title: 'Reports',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportsPage({ params }: PageProps) {
  const { id } = await params;
  return <ReportsClient congregationId={id} />;
}
