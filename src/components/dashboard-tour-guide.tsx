'use client';

import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Edit3,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Home,
  Info,
  Layers,
  Lightbulb,
  Lock,
  Map,
  MapPin,
  Maximize2,
  PlusCircle,
  Printer,
  Search,
  Send,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useId, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { TourHighlight, TourStep } from '@/lib/dashboard-tour';

// Icon resolver helper
function renderTourIcon(iconName: string, className = 'w-5 h-5'): React.ReactNode {
  switch (iconName) {
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'Building2':
      return <Building2 className={className} />;
    case 'Shield':
      return <Shield className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'BarChart3':
      return <BarChart3 className={className} />;
    case 'MapPin':
      return <MapPin className={className} />;
    case 'Compass':
      return <Compass className={className} />;
    case 'Home':
      return <Home className={className} />;
    case 'Users':
      return <Users className={className} />;
    case 'Map':
      return <Map className={className} />;
    case 'Clock':
      return <Clock className={className} />;
    case 'CheckCircle2':
      return <CheckCircle2 className={className} />;
    case 'Search':
      return <Search className={className} />;
    case 'PlusCircle':
      return <PlusCircle className={className} />;
    case 'Send':
      return <Send className={className} />;
    case 'Layers':
      return <Layers className={className} />;
    case 'Edit3':
      return <Edit3 className={className} />;
    case 'Printer':
      return <Printer className={className} />;
    case 'Maximize2':
      return <Maximize2 className={className} />;
    case 'FileText':
      return <FileText className={className} />;
    case 'BookOpen':
      return <BookOpen className={className} />;
    case 'UserCheck':
      return <UserCheck className={className} />;
    case 'Share2':
      return <Share2 className={className} />;
    case 'Lock':
      return <Lock className={className} />;
    case 'ShieldCheck':
      return <ShieldCheck className={className} />;
    case 'UserPlus':
      return <UserPlus className={className} />;
    case 'FolderOpen':
      return <FolderOpen className={className} />;
    case 'FileSpreadsheet':
      return <FileSpreadsheet className={className} />;
    case 'Bell':
      return <Bell className={className} />;
    case 'Wifi':
      return <Wifi className={className} />;
    case 'WifiOff':
      return <WifiOff className={className} />;
    case 'User':
      return <User className={className} />;
    default:
      return <Info className={className} />;
  }
}

export interface DashboardTourGuideProps {
  isOpen: boolean;
  currentStepIndex: number;
  totalSteps: number;
  activeStep: TourStep;
  isFirstStep: boolean;
  isLastStep: boolean;
  progressPercent: number;
  steps: TourStep[];
  onNext: () => void;
  onPrev: () => void;
  onGoToStep: (index: number) => void;
  onSkip: () => void;
  onComplete: () => void;
}

export function DashboardTourGuide({
  isOpen,
  currentStepIndex,
  totalSteps,
  activeStep,
  isFirstStep,
  isLastStep,
  progressPercent,
  steps,
  onNext,
  onPrev,
  onGoToStep,
  onSkip,
  onComplete,
}: DashboardTourGuideProps) {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scroll when tour is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <Card className="relative w-full max-w-2xl bg-card border-border shadow-2xl rounded-3xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Top Gradient Header & Category Bar */}
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-5 sm:px-7 pt-5 pb-3 border-b border-border/70 shrink-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="text-xs uppercase font-extrabold px-2.5 py-0.5 bg-primary/10 text-primary border-primary/30"
              >
                {activeStep.category}
              </Badge>
              <span className="text-xs font-semibold text-muted-foreground">
                Step {currentStepIndex + 1} of {totalSteps}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Close tour"
              >
                <X size={16} />
              </Button>
            </div>
          </div>

          {/* Progress Bar & Interactive Step Dots */}
          <div className="space-y-2">
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Clickable Step Pills / Dots */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto py-1 scrollbar-none">
              {steps.map((step, idx) => {
                const isActive = idx === currentStepIndex;
                const isPassed = idx < currentStepIndex;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => onGoToStep(idx)}
                    className={`group flex items-center justify-center h-6 min-w-6 px-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/30'
                        : isPassed
                          ? 'bg-primary/20 text-primary hover:bg-primary/30'
                          : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                    }`}
                    title={`${idx + 1}. ${step.title}`}
                    aria-label={`Go to step ${idx + 1}: ${step.title}`}
                  >
                    {isPassed ? <Check size={11} className="stroke-[3]" /> : idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-7 space-y-5 overflow-y-auto min-h-0 flex-1">
          {/* Main Title & Icon Header */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0 shadow-xs border border-primary/20">
              {renderTourIcon(activeStep.iconName, 'w-6 h-6')}
            </div>

            <div className="min-w-0 space-y-1">
              <h2
                id={titleId}
                className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight"
              >
                {activeStep.title}
              </h2>
              {activeStep.subtitle && (
                <p className="text-xs sm:text-sm font-semibold text-primary">
                  {activeStep.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <p id={descId} className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {activeStep.description}
          </p>

          {/* Feature Highlights Grid */}
          {activeStep.highlights && activeStep.highlights.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {activeStep.highlights.map((highlight: TourHighlight, i: number) => (
                <div
                  key={i}
                  className="p-3 rounded-2xl border border-border/80 bg-muted/40 flex items-start gap-3 transition-colors hover:border-primary/30 hover:bg-muted/60"
                >
                  <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    {renderTourIcon(highlight.icon, 'w-3.5 h-3.5')}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-bold text-foreground truncate">{highlight.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {highlight.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pro Tip Box */}
          {activeStep.tip && (
            <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-2.5 text-xs text-foreground/90">
              <Lightbulb size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-bold text-foreground mr-1">Tip:</span>
                <span className="text-muted-foreground">{activeStep.tip}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-5 sm:px-7 py-4 bg-muted/30 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-xs text-muted-foreground hover:text-foreground h-9 px-3 rounded-xl"
            >
              Skip Tour
            </Button>

            <span className="text-[11px] text-muted-foreground/80 hidden sm:inline">
              Use <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">←</kbd>{' '}
              <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">→</kbd> to navigate
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {!isFirstStep && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPrev}
                className="text-xs font-semibold h-9 px-3.5 rounded-xl gap-1.5 flex-1 sm:flex-initial"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </Button>
            )}

            {isLastStep ? (
              <Button
                type="button"
                size="sm"
                onClick={onComplete}
                className="text-xs font-bold h-9 px-5 rounded-xl gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 flex-1 sm:flex-initial"
              >
                <span>Get Started</span>
                <Check size={14} className="stroke-[3]" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={onNext}
                className="text-xs font-bold h-9 px-4 rounded-xl gap-1.5 shadow-sm flex-1 sm:flex-initial"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
