'use client';

import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock,
  HelpCircle,
  Mail,
  MessageSquare,
  Send,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const contactChannels = [
  {
    icon: Mail,
    title: 'General Support',
    email: 'support@kanataran.app',
    description: 'Help with account access, navigation, role questions, and general inquiries.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: Users,
    title: 'Congregation Onboarding',
    email: 'onboarding@kanataran.app',
    description: 'Guidance for Service Overseers setting up territories, members, and groups.',
    color: 'bg-accent/30 text-accent-foreground',
  },
  {
    icon: Sparkles,
    title: 'Feedback & Ideas',
    email: 'feedback@kanataran.app',
    description: 'Suggestions for new field ministry features, maps, or S-13 export improvements.',
    color: 'bg-secondary/30 text-secondary-foreground',
  },
];

const faqs = [
  {
    question: 'How does our congregation get started with Kanataran?',
    answer:
      'A Service Overseer or elder can create an account, register your congregation profile, and begin importing or creating territory cards and adding congregation members.',
  },
  {
    question: 'Does Kanataran work completely offline in the field?',
    answer:
      'Yes! Kanataran uses offline-first architecture. Publishers can view territory maps, record door-to-door visits, and write notes without internet. Everything automatically synchronizes once you reconnect.',
  },
  {
    question: 'How do role permissions work?',
    answer:
      'Kanataran provides dedicated role views for Service Overseers, Territory Servants, Group Overseers, and Publishers. Each role only accesses the features and records necessary for their ministry responsibilities.',
  },
  {
    question: 'Is our congregation data safe and private?',
    answer:
      'Absolutely. Data is isolated per congregation and protected by strict database security rules and encryption. We do not sell data or run third-party advertisements.',
  },
  {
    question: 'Is Kanataran free for congregations?',
    answer:
      'Yes, Kanataran is built as a non-profit ministry tool to support congregations in organizing their field service territories.',
  },
];

export function ContactClient() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [congregation, setCongregation] = useState('');
  const [role, setRole] = useState('');
  const [category, setCategory] = useState('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!name.trim()) newErrors.name = 'Please enter your name';
    if (!email.trim()) {
      newErrors.email = 'Please enter your email address';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!subject.trim()) newErrors.subject = 'Please enter a subject';
    if (!message.trim()) {
      newErrors.message = 'Please enter your message';
    } else if (message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    // Simulate brief processing
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSubmitting(false);
    setIsSubmitted(true);
    toast.success('Message sent successfully! We will get back to you soon.');
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setCongregation('');
    setRole('');
    setCategory('general');
    setSubject('');
    setMessage('');
    setErrors({});
    setIsSubmitted(false);
  };

  return (
    <div className="min-h-screen py-12 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
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

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20">
            <MessageSquare size={13} />
            We&apos;re Here to Help
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
            Contact Our Team
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Have questions about Kanataran, need assistance setting up your congregation, or want to
            suggest an improvement? Reach out below.
          </p>
        </div>

        {/* Contact Channels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {contactChannels.map((channel) => {
            const Icon = channel.icon;
            return (
              <Card
                key={channel.title}
                className="bg-card border-border/80 shadow-xs hover:shadow-md transition-all duration-300"
              >
                <CardContent className="p-6">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${channel.color}`}
                  >
                    <Icon size={20} />
                  </div>
                  <h3 className="font-semibold text-foreground text-base mb-1">{channel.title}</h3>
                  <a
                    href={`mailto:${channel.email}`}
                    className="text-xs font-medium text-primary hover:underline block mb-2"
                  >
                    {channel.email}
                  </a>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {channel.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content: Form & FAQ Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Form Column */}
          <div className="lg:col-span-7">
            <Card className="bg-card border-border/80 shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-foreground">
                  Send Us a Message
                </CardTitle>
                <CardDescription>
                  Fill out the form below and we will respond as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSubmitted ? (
                  <div className="py-8 text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                      <CheckCircle2 size={32} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-foreground">
                        Thank you for reaching out!
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Your message has been received. Our team typically replies within 24–48
                        hours.
                      </p>
                    </div>
                    <div className="pt-4">
                      <Button variant="outline" onClick={handleReset} className="rounded-xl">
                        Send Another Message
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-xs font-medium">
                          Your Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="name"
                          placeholder="e.g. John Doe"
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                          }}
                          className={errors.name ? 'border-destructive' : ''}
                        />
                        {errors.name && (
                          <p className="text-[11px] text-destructive">{errors.name}</p>
                        )}
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs font-medium">
                          Email Address <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                          }}
                          className={errors.email ? 'border-destructive' : ''}
                        />
                        {errors.email && (
                          <p className="text-[11px] text-destructive">{errors.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Congregation Name (Optional) */}
                      <div className="space-y-1.5">
                        <Label htmlFor="congregation" className="text-xs font-medium">
                          Congregation <span className="text-muted-foreground">(Optional)</span>
                        </Label>
                        <Input
                          id="congregation"
                          placeholder="e.g. Central City Congregation"
                          value={congregation}
                          onChange={(e) => setCongregation(e.target.value)}
                        />
                      </div>

                      {/* Role (Optional) */}
                      <div className="space-y-1.5">
                        <Label htmlFor="role" className="text-xs font-medium">
                          Your Role <span className="text-muted-foreground">(Optional)</span>
                        </Label>
                        <Select value={role} onValueChange={setRole}>
                          <SelectTrigger id="role" className="w-full">
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="service_overseer">Service Overseer</SelectItem>
                            <SelectItem value="territory_servant">Territory Servant</SelectItem>
                            <SelectItem value="group_overseer">Group Overseer</SelectItem>
                            <SelectItem value="publisher">Publisher</SelectItem>
                            <SelectItem value="elder_servant">
                              Elder / Ministerial Servant
                            </SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Topic / Category */}
                    <div className="space-y-1.5">
                      <Label htmlFor="category" className="text-xs font-medium">
                        Topic Category
                      </Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger id="category" className="w-full">
                          <SelectValue placeholder="Select a topic" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Inquiry</SelectItem>
                          <SelectItem value="onboarding">
                            Congregation Setup & Onboarding
                          </SelectItem>
                          <SelectItem value="support">Technical Support / Bug Report</SelectItem>
                          <SelectItem value="feature">Feature Request & Feedback</SelectItem>
                          <SelectItem value="privacy">Privacy & Account Inquiry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Subject */}
                    <div className="space-y-1.5">
                      <Label htmlFor="subject" className="text-xs font-medium">
                        Subject <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="subject"
                        placeholder="Brief summary of your inquiry"
                        value={subject}
                        onChange={(e) => {
                          setSubject(e.target.value);
                          if (errors.subject) setErrors((prev) => ({ ...prev, subject: '' }));
                        }}
                        className={errors.subject ? 'border-destructive' : ''}
                      />
                      {errors.subject && (
                        <p className="text-[11px] text-destructive">{errors.subject}</p>
                      )}
                    </div>

                    {/* Message */}
                    <div className="space-y-1.5">
                      <Label htmlFor="message" className="text-xs font-medium">
                        Message <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="message"
                        rows={4}
                        placeholder="Describe how we can help your congregation or any details regarding your question..."
                        value={message}
                        onChange={(e) => {
                          setMessage(e.target.value);
                          if (errors.message) setErrors((prev) => ({ ...prev, message: '' }));
                        }}
                        aria-invalid={!!errors.message}
                      />
                      {errors.message && (
                        <p className="text-[11px] text-destructive">{errors.message}</p>
                      )}
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full sm:w-auto px-6 rounded-xl font-semibold gap-2"
                      >
                        <Send size={16} />
                        {isSubmitting ? 'Sending Message…' : 'Send Message'}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* FAQ / Info Column */}
          <div className="lg:col-span-5 space-y-6">
            {/* Quick Response Notice */}
            <div className="p-5 rounded-2xl bg-accent/15 border border-accent/30 flex items-start gap-3.5">
              <Clock size={20} className="text-accent-foreground flex-shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed text-foreground">
                <p className="font-semibold mb-0.5">Prompt Responses</p>
                <p className="text-muted-foreground">
                  Our team reviews inquiries daily. For urgent congregation territory setup
                  assistance, please select the &ldquo;Congregation Setup & Onboarding&rdquo;
                  category.
                </p>
              </div>
            </div>

            {/* FAQ List */}
            <div>
              <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <HelpCircle size={18} className="text-primary" />
                Frequently Asked Questions
              </h2>
              <div className="space-y-3">
                {faqs.map((faq, index) => {
                  const isOpen = openFaq === index;
                  return (
                    <div
                      key={faq.question}
                      className="border border-border/80 rounded-xl bg-card overflow-hidden transition-all duration-200"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                        className="w-full text-left p-4 flex items-center justify-between gap-3 text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors"
                      >
                        <span>{faq.question}</span>
                        <ChevronDown
                          size={16}
                          className={`text-muted-foreground transition-transform duration-200 flex-shrink-0 ${
                            isOpen ? 'transform rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-border/40">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
