import type { Metadata } from 'next';
import PersonalNotebookClient from './_components/PersonalNotebookClient';

export const metadata: Metadata = {
  title: 'My Personal Notebook | Kanataran',
  description: 'Private, on-device return visits and personal Bible studies.',
};

export default function PersonalNotebookPage() {
  return <PersonalNotebookClient />;
}
