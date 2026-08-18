'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DASHBOARD_TOUR_STEPS,
  hasCompletedTour,
  markTourCompleted,
  type TourStep,
} from '@/lib/dashboard-tour';

export interface UseDashboardTourOptions {
  userId?: string | null;
  autoStart?: boolean;
  delayMs?: number;
}

export function useDashboardTour({
  userId,
  autoStart = true,
  delayMs = 600,
}: UseDashboardTourOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const totalSteps = DASHBOARD_TOUR_STEPS.length;
  const activeStep: TourStep = DASHBOARD_TOUR_STEPS[currentStepIndex] || DASHBOARD_TOUR_STEPS[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  // Measure and highlight the target element if specified
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !activeStep.targetSelector) {
      setTargetRect(null);
      return;
    }

    try {
      const el = document.querySelector(activeStep.targetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
        // Gently scroll into view if out of viewport
        if (rect.top < 60 || rect.bottom > window.innerHeight - 60) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        setTargetRect(null);
      }
    } catch {
      setTargetRect(null);
    }
  }, [isOpen, activeStep.targetSelector]);

  // Recalculate target rect on step change or window resize
  useEffect(() => {
    if (!isOpen) return;

    // Small delay to allow layout animations/DOM changes to settle
    const timer = setTimeout(() => {
      updateTargetRect();
    }, 150);

    const handleResize = () => updateTargetRect();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen, currentStepIndex, updateTargetRect]);

  // Auto-start tour on first visit
  useEffect(() => {
    if (!autoStart) return;

    const timer = setTimeout(() => {
      if (!hasCompletedTour(userId)) {
        setIsOpen(true);
        setCurrentStepIndex(0);
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [autoStart, userId, delayMs]);

  const startTour = useCallback((stepIndex = 0) => {
    setCurrentStepIndex(Math.max(0, Math.min(stepIndex, DASHBOARD_TOUR_STEPS.length - 1)));
    setIsOpen(true);
  }, []);

  const completeTour = useCallback(() => {
    markTourCompleted(userId);
    setIsOpen(false);
  }, [userId]);

  const skipTour = useCallback(() => {
    markTourCompleted(userId);
    setIsOpen(false);
  }, [userId]);

  const closeTourWithoutMarking = useCallback(() => {
    setIsOpen(false);
  }, []);

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalSteps) {
        setCurrentStepIndex(index);
      }
    },
    [totalSteps]
  );

  const nextStep = useCallback(() => {
    if (isLastStep) {
      completeTour();
    } else {
      setCurrentStepIndex((prev) => Math.min(prev + 1, totalSteps - 1));
    }
  }, [isLastStep, completeTour, totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input or textarea
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

      if (e.key === 'ArrowRight' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStep();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        skipTour();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, nextStep, prevStep, skipTour]);

  return useMemo(
    () => ({
      isOpen,
      currentStepIndex,
      totalSteps,
      activeStep,
      isFirstStep,
      isLastStep,
      progressPercent,
      targetRect,
      steps: DASHBOARD_TOUR_STEPS,
      startTour,
      nextStep,
      prevStep,
      goToStep,
      skipTour,
      completeTour,
      closeTourWithoutMarking,
    }),
    [
      isOpen,
      currentStepIndex,
      totalSteps,
      activeStep,
      isFirstStep,
      isLastStep,
      progressPercent,
      targetRect,
      startTour,
      nextStep,
      prevStep,
      goToStep,
      skipTour,
      completeTour,
      closeTourWithoutMarking,
    ]
  );
}
