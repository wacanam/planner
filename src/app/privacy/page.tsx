import { ArrowLeft, EyeOff, Lock, Mail, Server, Shield } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Privacy Policy | Kanataran',
  description:
    'Learn how Kanataran protects your privacy, congregation data, and territory ministry records.',
};

const highlights = [
  {
    icon: Lock,
    title: 'No Data Selling or Ads',
    description:
      'We do not sell personal or ministry data, nor do we run third-party advertising trackers.',
  },
  {
    icon: Shield,
    title: 'Role-Based Access Control',
    description:
      'Territory assignments and visit logs are strictly isolated and accessible only to authorized roles.',
  },
  {
    icon: Server,
    title: 'Offline-First Security',
    description:
      'Local data cached on your device is protected and syncs securely with cloud databases.',
  },
  {
    icon: EyeOff,
    title: 'Ministry Confidentiality',
    description:
      'Addresses, revisit notes, and householder records remain confidential to your congregation.',
  },
];

const sections = [
  {
    id: 'introduction',
    title: '1. Introduction & Overview',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          Welcome to <strong className="text-foreground">Kanataran</strong> (&ldquo;we&rdquo;,
          &ldquo;our&rdquo;, or &ldquo;us&rdquo;). Kanataran is a dedicated, offline-first territory
          management platform built to assist congregations in organizing, assigning, and tracking
          field ministry territories efficiently and privately.
        </p>
        <p>
          We deeply respect the sacred and confidential nature of congregation records. This Privacy
          Policy explains what information we collect, how it is handled, how offline data is
          secured, and your rights regarding personal and congregation data.
        </p>
      </div>
    ),
  },
  {
    id: 'information-collected',
    title: '2. Information We Collect',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          We collect only the minimum necessary information required to provide territory management
          services:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-foreground">Account Information:</strong> When you register or
            sign in (via email or Google OAuth), we collect your name, email address, profile
            avatar, and your assigned congregation affiliation.
          </li>
          <li>
            <strong className="text-foreground">Congregation & Territory Data:</strong> Territory
            card boundaries, numbers, street listings, assigned field service groups, and assignment
            histories configured by congregation administrators.
          </li>
          <li>
            <strong className="text-foreground">Ministry & Visit Records:</strong> Visit logs,
            householder contact status (e.g., Not at Home, Interested, Do Not Call), language
            preferences, and revisit notes recorded by assigned publishers during field service.
          </li>
          <li>
            <strong className="text-foreground">Device & Offline Cache:</strong> Local cache records
            stored in IndexedDB on your device to allow seamless offline access, sync status logs,
            and essential diagnostic error logs.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'how-we-use-information',
    title: '3. How We Use Your Information',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>The information collected is used exclusively for the following operational purposes:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Facilitating the assignment and check-in/return of congregation territory cards.</li>
          <li>
            Enabling publishers and service groups to track street and door-to-door coverage
            accurately.
          </li>
          <li>
            Generating official congregation reports, S-13 assignment registers, and coverage
            analytics for Service Overseers and Territory Servants.
          </li>
          <li>
            Enabling seamless offline data entry and automatic background synchronization when
            internet connectivity is restored.
          </li>
          <li>
            Enforcing role-based access permissions so only authorized congregation overseers and
            servants can view sensitive congregation data.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'data-storage-security',
    title: '4. Data Storage, Security & Offline Protection',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          We employ industry-standard security practices to protect both in-transit and at-rest
          congregation data:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-foreground">Encryption:</strong> All network communication uses
            HTTPS/TLS encryption. Cloud data is encrypted at rest within enterprise cloud
            infrastructure (Firebase Firestore).
          </li>
          <li>
            <strong className="text-foreground">Strict Database Rules:</strong> Granular security
            rules ensure users cannot query or mutate data outside of their approved congregation
            and role permissions.
          </li>
          <li>
            <strong className="text-foreground">Offline Storage:</strong> When working offline,
            visits and territory notes are stored in your browser&apos;s isolated IndexedDB storage,
            protected by standard browser sandboxing mechanisms.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'data-sharing',
    title: '5. Information Sharing & Third Parties',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          <strong className="text-foreground">
            We never sell, rent, or monetize your personal or congregation information.
          </strong>
        </p>
        <p>Information is shared only in the following specific contexts:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-foreground">Within Your Congregation:</strong> Relevant
            territory data and visit updates are visible to authorized roles (Service Overseers,
            Territory Servants, your Group Overseer, and active collaboration partners) within your
            congregation.
          </li>
          <li>
            <strong className="text-foreground">Core Service Providers:</strong> We use reputable
            infrastructure providers (Google Firebase Authentication, Firestore, and Cloud Hosting)
            solely to host and secure the application database.
          </li>
          <li>
            <strong className="text-foreground">Legal Obligations:</strong> We will only disclose
            information if strictly required by law or a valid court order.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'ministry-records',
    title: '6. Field Service Notes & Do-Not-Call Requests',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>We recognize the critical importance of handling householder preferences with care:</p>
        <p>
          Addresses designated as &ldquo;Do Not Call&rdquo; or sensitive locations are clearly
          flagged across the system to ensure congregation members respect householders&apos;
          requests. Notes logged on territories are intended solely for ministry follow-up and must
          comply with your congregation&apos;s local guidelines.
        </p>
      </div>
    ),
  },
  {
    id: 'retention-deletion',
    title: '7. Data Retention & User Rights',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          You have the right to access, update, or request the deletion of your personal account
          information at any time:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-foreground">Account Deletion:</strong> You may request the
            deletion of your account by contacting your congregation administrator or reaching out
            through our contact page.
          </li>
          <li>
            <strong className="text-foreground">Congregation Records:</strong> Congregation
            administrators retain ownership of aggregate territory boundaries and historical S-13
            assignment logs.
          </li>
          <li>
            <strong className="text-foreground">Local Cache Clearing:</strong> You can clear locally
            cached offline data at any time via your browser settings or device storage management.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'cookies',
    title: '8. Cookies & Local Storage',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>Kanataran uses essential cookies and browser LocalStorage / IndexedDB solely to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Maintain your authenticated user session.</li>
          <li>Preserve user theme preferences (light/dark mode).</li>
          <li>Enable offline persistence for territory maps and visit logs.</li>
        </ul>
        <p>We do not use advertising, marketing, or behavioral tracking cookies.</p>
      </div>
    ),
  },
  {
    id: 'contact',
    title: '9. Contact & Privacy Inquiries',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          If you have any questions, concerns, or requests regarding this Privacy Policy or how
          congregation data is handled, please reach out to us through our{' '}
          <Link href="/contact" className="text-primary font-medium hover:underline">
            Contact Page
          </Link>{' '}
          or email us directly at{' '}
          <a
            href="mailto:support@kanataran.app"
            className="text-primary font-medium hover:underline"
          >
            support@kanataran.app
          </a>
          .
        </p>
      </div>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb / Back */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <Link href="/">
              <ArrowLeft size={16} />
              Back to Home
            </Link>
          </Button>
        </div>

        {/* Page Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20">
            <Shield size={13} />
            Data Protection & Privacy
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
            Privacy Policy
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Last updated: August 18, 2026. Learn how Kanataran safeguards personal information and
            congregation territory records.
          </p>
        </div>

        {/* Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="bg-card border-border/80 shadow-xs">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Detailed Policy Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="p-6 sm:p-8 rounded-2xl bg-card border border-border/70 shadow-xs space-y-4"
            >
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                {section.title}
              </h2>
              {section.content}
            </section>
          ))}
        </div>

        {/* Footer Support CTA */}
        <div className="mt-12 p-8 rounded-2xl bg-primary/5 border border-primary/20 text-center">
          <h3 className="text-lg font-bold text-foreground mb-2">
            Have questions about your data?
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            We are here to assist congregations and publishers with any privacy inquiries or record
            requests.
          </p>
          <Button asChild>
            <Link href="/contact">
              <Mail size={16} />
              Contact Our Team
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
