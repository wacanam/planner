import { ArrowLeft, FileCheck, FileText, Mail, Scale, ShieldCheck, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Terms of Service | Kanataran',
  description:
    'Review the terms and conditions for using the Kanataran congregation territory management platform.',
};

const keyPrinciples = [
  {
    icon: ShieldCheck,
    title: 'Congregation Focused',
    description:
      'Designed solely to support congregations in organizing ministry territories and assignments.',
  },
  {
    icon: Users,
    title: 'Role-Based Integrity',
    description:
      'Users access and manage records corresponding to their authorized role in the congregation.',
  },
  {
    icon: FileCheck,
    title: 'Householder Respect',
    description:
      'Strict adherence to householder preferences, privacy, and Do Not Call designations.',
  },
  {
    icon: Scale,
    title: 'Data Ownership',
    description:
      'Congregations retain full ownership and discretion over their congregation data and territory maps.',
  },
];

const termSections = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          By accessing or using <strong className="text-foreground">Kanataran</strong> (the
          &ldquo;Service&rdquo;), you agree to be bound by these Terms of Service
          (&ldquo;Terms&rdquo;). If you do not agree to these Terms, you should not access or use
          the Service.
        </p>
        <p>
          These Terms apply to all visitors, registered users, publishers, and congregation
          administrators who access or use the platform.
        </p>
      </div>
    ),
  },
  {
    id: 'purpose',
    title: '2. Purpose of the Platform',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          Kanataran is provided as an organizational and workflow tool for Christian congregations
          to manage field ministry territories, coordinate publisher assignments, record
          door-to-door visits offline, and generate standard ministry records (such as S-13
          registers and coverage reports).
        </p>
        <p>
          The Service must be used solely for legitimate congregation ministry activities and in
          harmony with your congregation&apos;s guidelines and policies.
        </p>
      </div>
    ),
  },
  {
    id: 'accounts',
    title: '3. User Accounts & Congregation Access',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>To use most features of Kanataran, you must register for an account:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>You must provide accurate and complete registration details.</li>
          <li>
            Access to congregation territories requires joining a specific congregation and being
            approved by an authorized congregation administrator (Service Overseer or Territory
            Servant).
          </li>
          <li>
            You are responsible for maintaining the confidentiality of your login credentials and
            for all activities that occur under your account.
          </li>
          <li>
            If you suspect unauthorized access to your account, you must notify your congregation
            overseer or contact us immediately.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'roles-conduct',
    title: '4. Role-Based Permissions & User Conduct',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>Users must respect their assigned role boundaries:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-foreground">Service Overseers:</strong> Supervise overall
            territory coverage, assign servant roles, and manage congregation membership settings
            responsibly.
          </li>
          <li>
            <strong className="text-foreground">Territory Servants:</strong> Maintain territory card
            accuracy, manage assignments, track returns, and handle print/export operations in
            harmony with congregation standards.
          </li>
          <li>
            <strong className="text-foreground">Group Overseers:</strong> Review, endorse, and
            coordinate territory work for their respective field service groups.
          </li>
          <li>
            <strong className="text-foreground">Publishers:</strong> Work assigned territory cards
            diligently, record visits accurately, and return completed assignments in a timely
            manner.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'territory-integrity',
    title: '5. Territory Records & Householder Privacy',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>Maintaining the sanctity and privacy of field service records is vital:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-foreground">Do Not Call Requests:</strong> Users must promptly
            mark and strictly honor all requests by householders who ask not to be called upon.
          </li>
          <li>
            <strong className="text-foreground">Visit Notes:</strong> Notes recorded in the app must
            be factual, respectful, and limited to relevant ministry follow-up information.
          </li>
          <li>
            <strong className="text-foreground">Prohibition of Commercial Exploitation:</strong> You
            may not scrape, export, or use addresses or contact data for commercial marketing, spam,
            or any purpose outside authorized congregation activities.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'offline-sync',
    title: '6. Offline Capability & Data Synchronization',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          Kanataran features offline-first technology to facilitate field service in areas without
          reliable network coverage:
        </p>
        <p>
          While the application is designed to preserve and queue changes made offline, users are
          encouraged to connect to the internet periodically to ensure all visit records,
          endorsements, and status changes are synchronized with the central congregation database.
        </p>
      </div>
    ),
  },
  {
    id: 'ownership',
    title: '7. Data Ownership & Intellectual Property',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          <strong className="text-foreground">Congregation Data:</strong> All congregation records,
          territory boundary definitions, assignment histories, and visit records remain the sole
          property and responsibility of your local congregation.
        </p>
        <p>
          <strong className="text-foreground">Platform Property:</strong> The Kanataran software,
          branding, UI design, icons, and code are protected by applicable copyright, trademark, and
          intellectual property laws.
        </p>
      </div>
    ),
  },
  {
    id: 'disclaimers',
    title: '8. Disclaimers & Limitation of Liability',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          Kanataran is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis
          without warranties of any kind, either express or implied. While we strive for 100% uptime
          and reliable data persistence, we cannot guarantee uninterrupted operation or complete
          absence of network or software errors.
        </p>
        <p>
          To the maximum extent permitted by applicable law, Kanataran and its contributors shall
          not be liable for any indirect, incidental, special, or consequential damages resulting
          from the use or inability to use the Service.
        </p>
      </div>
    ),
  },
  {
    id: 'termination',
    title: '9. Account Termination & Deactivation',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          You may stop using the Service at any time. Congregation administrators reserve the right
          to revoke member access or reassign roles if a publisher moves or changes congregation.
        </p>
        <p>
          We also reserve the right to suspend or terminate accounts that violate these Terms or
          engage in abusive or harmful behavior.
        </p>
      </div>
    ),
  },
  {
    id: 'updates-contact',
    title: '10. Changes to Terms & Contact Information',
    content: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          We may update these Terms from time to time. Continued use of Kanataran following any
          modifications constitutes acceptance of the revised Terms.
        </p>
        <p>
          For questions or clarifications concerning these Terms, please reach out via our{' '}
          <Link href="/contact" className="text-primary font-medium hover:underline">
            Contact Page
          </Link>{' '}
          or email{' '}
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

export default function TermsOfServicePage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 text-secondary-foreground text-xs font-semibold mb-4 border border-secondary/30">
            <FileText size={13} />
            Legal Agreement
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
            Terms of Service
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Last updated: August 18, 2026. Please read these terms carefully before using Kanataran
            for your congregation ministry.
          </p>
        </div>

        {/* Key Principles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {keyPrinciples.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="bg-card border-border/80 shadow-xs">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-secondary/20 text-secondary-foreground flex items-center justify-center flex-shrink-0 mt-0.5">
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

        {/* Terms Sections */}
        <div className="space-y-8">
          {termSections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="p-6 sm:p-8 rounded-2xl bg-card border border-border/70 shadow-xs space-y-4"
            >
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                {section.title}
              </h2>
              {section.content}
            </section>
          ))}
        </div>

        {/* Bottom Help Card */}
        <div className="mt-12 p-8 rounded-2xl bg-secondary/10 border border-secondary/20 text-center">
          <h3 className="text-lg font-bold text-foreground mb-2">
            Need clarification on our terms?
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            If you or your congregation elders have any questions, our support team is happy to
            assist.
          </p>
          <Button asChild>
            <Link href="/contact">
              <Mail size={16} />
              Get in Touch
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
