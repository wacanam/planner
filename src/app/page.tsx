import Link from 'next/link';
import {
  Map,
  WifiOff,
  ClipboardCheck,
  BarChart3,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  UserCog,
  Users,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Map,
    title: 'Territory Management',
    description:
      'Organize ministry territories with intuitive maps and location-based assignments. Never lose track of a block.',
    color: 'bg-primary/15 text-primary',
  },
  {
    icon: WifiOff,
    title: 'Offline-First',
    description:
      'Works without internet. Record visits and sync automatically when you reconnect. Perfect for field work.',
    color: 'bg-accent/30 text-accent-foreground',
  },
  {
    icon: ClipboardCheck,
    title: 'Visit Tracking',
    description:
      'Log every door, note responses, and track follow-ups. Comprehensive records for every territory.',
    color: 'bg-secondary/40 text-secondary-foreground',
  },
  {
    icon: BarChart3,
    title: 'Coverage Analytics',
    description:
      'See which areas need attention. Visual completion rates and activity dashboards at a glance.',
    color: 'bg-primary/15 text-primary',
  },
  {
    icon: ShieldCheck,
    title: 'RBAC & Security',
    description:
      'Role-based access for Service Overseers, Territory Servants, and Publishers. Secure by design.',
    color: 'bg-accent/30 text-accent-foreground',
  },
  {
    icon: Smartphone,
    title: 'Mobile-Friendly',
    description:
      'Fully responsive design for phones, tablets, and desktops. Use it seamlessly on any device.',
    color: 'bg-secondary/40 text-secondary-foreground',
  },
];

const steps = [
  {
    icon: UserCog,
    step: '01',
    title: 'Service Overseer sets up',
    description: 'Create territories, add congregation members, and configure roles in minutes.',
  },
  {
    icon: Users,
    step: '02',
    title: 'Territory Servants assign',
    description:
      'Assign territory cards to publishers, track active assignments, and manage returns.',
  },
  {
    icon: ClipboardCheck,
    step: '03',
    title: 'Publishers log visits',
    description: 'Record every door worked, note results, and mark streets as completed offline.',
  },
];

const userTypes = [
  {
    icon: UserCog,
    title: 'Service Overseer',
    color: 'border-primary/30 bg-primary/5',
    iconColor: 'bg-primary/20 text-primary',
    benefits: [
      'Full territory management dashboard',
      'Assign and track all congregation members',
      'Coverage reports and analytics',
      'User role management',
      'Territory history and audit logs',
    ],
  },
  {
    icon: Users,
    title: 'Territory Servant',
    color: 'border-accent/40 bg-accent/5',
    iconColor: 'bg-accent/30 text-accent-foreground',
    benefits: [
      'Manage assigned territory cards',
      'Assign territories to publishers',
      'Track returns and completion',
      'View publisher activity',
      'Mobile-optimized workflow',
    ],
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 text-primary text-sm font-medium mb-8 border border-primary/20">
              <MapPin size={14} />
              Offline-first territory management
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 leading-tight">
              Organize Your{' '}
              <span className="text-primary">Congregation&apos;s</span>{' '}
              Ministry
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              The offline-first platform for territory management, visit tracking, and congregation
              coordination. Works anywhere — even without internet.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" asChild>
                <Link href="/auth/register">
                  Get Started Free
                  <ChevronRight size={16} />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#how-it-works">Learn More</Link>
              </Button>
            </div>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <WifiOff size={14} className="text-accent-foreground" />
                Works offline
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-primary" />
                Secure & private
              </span>
              <span className="flex items-center gap-1.5">
                <Smartphone size={14} className="text-secondary-foreground" />
                Mobile friendly
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything you need to run your ministry
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for congregations of all sizes. Simple to use, powerful when you need it.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-default bg-card"
                >
                  <CardContent className="p-6">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}
                    >
                      <Icon size={20} />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">How it works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From setup to field work in three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop) */}
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-border" />

            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex flex-col items-center text-center relative">
                  <div className="relative mb-5">
                    <div className="w-20 h-20 rounded-2xl bg-card border-2 border-primary/20 flex items-center justify-center shadow-sm">
                      <Icon size={28} className="text-primary" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* User Types Section */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Built for every role
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Different access levels tailored to each person&apos;s responsibilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {userTypes.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.title}
                  className={`rounded-2xl border-2 p-8 ${type.color} transition-all duration-300 hover:shadow-md`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${type.iconColor}`}>
                    <Icon size={22} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-4">{type.title}</h3>
                  <ul className="space-y-3">
                    {type.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <span className="mt-0.5 w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        </span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Ready to simplify your ministry?
          </h2>
          <p className="text-lg text-muted-foreground mb-10">
            Join your congregation on Ministry Planner and start managing territories with ease.
            Free to get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild>
              <Link href="/auth/register">
                Sign Up Free
                <ChevronRight size={16} />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link href="/auth/login">Already have an account?</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
