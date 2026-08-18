import type { Metadata } from 'next';
import { ContactClient } from './_components/ContactClient';

export const metadata: Metadata = {
  title: 'Contact Us | Kanataran',
  description:
    'Get in touch with the Kanataran team for technical support, congregation onboarding assistance, or feedback.',
};

export default function ContactPage() {
  return <ContactClient />;
}
