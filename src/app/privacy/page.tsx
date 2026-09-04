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
    title: 'Zero Cloud Resident PII',
    description:
      'No resident names, phone numbers, occupant counts, or demographic profiling are stored in cloud databases.',
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
          services in accordance with strict data minimization principles:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-foreground">Account Information:</strong> When you register or
            sign in (via email or Google OAuth), we collect your name, email address, profile
            avatar, and your assigned congregation affiliation and role.
          </li>
          <li>
            <strong className="text-foreground">Congregation & Territory Data:</strong> Territory
            card boundaries, numbers, street listings, assigned field service groups, and assignment
            histories configured by congregation administrators.
          </li>
          <li>
            <strong className="text-foreground">Anonymous Household & Territory Coverage:</strong>{' '}
            Physical household address coordinates, dwelling type, physical property access notes
            (e.g., gate codes, cautions), visit timestamps, topics/scriptures discussed, literature
            placed, and visit outcomes (such as Answered, Not Home, Study Conducted, or Return Visit
            Completed). Kanataran strictly enforces data minimization: we never collect, solicit, or
            store resident names, phone numbers, email addresses, occupant counts, age groups,
            gender, or personal demographic profiling in central cloud databases.
          </li>
          <li>
            <strong className="text-foreground">
              Personal Ministry Notebook (100% On-Device Only):
            </strong>
            Personal return visit notes, contact references, phone numbers, and follow-up reminders
            are stored strictly and exclusively on your local device (in browser IndexedDB). They
            are never transmitted to, backed up by, or accessible through the congregation cloud or
            overseers.
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
            Enabling publishers and service groups to track street and household territory coverage
            accurately.
          </li>
          <li>
            Generating official congregation reports, S-13 assignment registers, and coverage
            analytics for Service Overseers and Territory Servants without demographic profiling.
          </li>
          <li>
            Enabling seamless offline data entry and automatic background synchronization when
            internet connectivity is restored.
          </li>
          <li>
            Enforcing role-based access permissions so only authorized congregation overseers and
            servants can view sensitive congregation management data.
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
          <li>
            <strong className="text-foreground">Client-Side Notebook Sandboxing:</strong> Personal
            ministry notes remain sandboxed inside your local device&apos;s browser storage
            (IndexedDB). They cannot be accessed by cloud database queries, security rules, or
            congregation overseers.
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
            territory boundaries, physical household listings, and anonymous visit updates are
            visible to authorized congregation roles. Congregation activity streams (such as Recent
            Ministry Activity and shared visits) are anonymized—individual publisher identities are
            not broadcast to fellow publishers on congregation dashboards.
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
    title: '6. Household Service Notes & Do-Not-Call Requests',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>We recognize the critical importance of handling householder preferences with care:</p>
        <p>
          Addresses designated as &ldquo;Do Not Call&rdquo; (DNC) or sensitive locations are
          strictly flagged across the system to ensure congregation members respect
          householders&apos; requests. In compliance with data minimization, DNC records are
          restricted solely to the physical address, request date, and physical access cautions—no
          resident names or personal data are recorded on DNC registers. Visit notes logged on
          households are intended strictly for physical property access and general non-personal
          ministry topics.
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
          <li>
            <strong className="text-foreground">Personal Notebook Sovereignty:</strong> You maintain
            full ownership and control over your on-device Personal Notebook. You can export all
            your notes at any time as CSV or JSON, or permanently delete individual notes or your
            entire local notebook without needing administrator permission.
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
            Last updated: September 4, 2026. Learn how Kanataran safeguards personal information and
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
