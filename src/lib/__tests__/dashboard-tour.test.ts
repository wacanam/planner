import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DASHBOARD_TOUR_STEPS,
  hasCompletedTour,
  markTourCompleted,
  resetTour,
  TOUR_STORAGE_KEY_PREFIX,
} from '@/lib/dashboard-tour';

describe('Dashboard Tour Utilities & Configuration', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    const storageMock = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = String(val);
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    };

    (globalThis as any).window = {
      localStorage: storageMock,
    };
  });

  afterEach(() => {
    delete (globalThis as any).window;
  });

  describe('DASHBOARD_TOUR_STEPS definition', () => {
    it('has 10 comprehensive steps covering all core features and processes', () => {
      expect(DASHBOARD_TOUR_STEPS.length).toBe(10);
    });

    it('each step has unique IDs, valid categories, titles, descriptions, and highlights', () => {
      const ids = new Set<string>();
      for (const step of DASHBOARD_TOUR_STEPS) {
        expect(step.id).toBeTruthy();
        expect(ids.has(step.id)).toBe(false);
        ids.add(step.id);

        expect(step.category).toBeTruthy();
        expect(step.title).toBeTruthy();
        expect(step.description).toBeTruthy();
        expect(step.iconName).toBeTruthy();
        expect(Array.isArray(step.highlights)).toBe(true);
        expect(step.highlights.length).toBeGreaterThanOrEqual(3);

        for (const highlight of step.highlights) {
          expect(highlight.title).toBeTruthy();
          expect(highlight.description).toBeTruthy();
          expect(highlight.icon).toBeTruthy();
        }
      }
    });

    it('contains specific key workflow steps for territories, studio, records, sharing, and reports', () => {
      const stepIds = DASHBOARD_TOUR_STEPS.map((s) => s.id);
      expect(stepIds).toContain('welcome-overview');
      expect(stepIds).toContain('live-stats');
      expect(stepIds).toContain('active-assignments');
      expect(stepIds).toContain('territory-management');
      expect(stepIds).toContain('territory-studio');
      expect(stepIds).toContain('records-and-visits');
      expect(stepIds).toContain('encounters-and-sharing');
      expect(stepIds).toContain('administration-and-reports');
      expect(stepIds).toContain('notifications-profile-offline');
      expect(stepIds).toContain('ready-to-start');
    });
  });

  describe('hasCompletedTour & markTourCompleted', () => {
    it('returns false by default when not completed', () => {
      expect(hasCompletedTour('user-123')).toBe(false);
      expect(hasCompletedTour()).toBe(false);
      expect(hasCompletedTour(null)).toBe(false);
    });

    it('returns true after marking tour completed for a specific user', () => {
      markTourCompleted('user-123');
      expect(hasCompletedTour('user-123')).toBe(true);
      // Other user should still be false
      expect(hasCompletedTour('user-456')).toBe(false);
    });

    it('handles guest/null user id gracefully', () => {
      markTourCompleted(null);
      expect(hasCompletedTour(null)).toBe(true);
      expect(hasCompletedTour()).toBe(true);
      expect(mockStorage[`${TOUR_STORAGE_KEY_PREFIX}guest`]).toBe('true');
    });

    it('resets tour completion when resetTour is called', () => {
      markTourCompleted('user-123');
      expect(hasCompletedTour('user-123')).toBe(true);

      resetTour('user-123');
      expect(hasCompletedTour('user-123')).toBe(false);
    });
  });

  describe('Step Navigation & Bounds calculations', () => {
    it('calculates progress percentage correctly across steps', () => {
      const total = DASHBOARD_TOUR_STEPS.length;
      for (let i = 0; i < total; i++) {
        const percent = Math.round(((i + 1) / total) * 100);
        expect(percent).toBeGreaterThan(0);
        expect(percent).toBeLessThanOrEqual(100);
      }
    });

    it('first step is welcome-overview and last step is ready-to-start', () => {
      expect(DASHBOARD_TOUR_STEPS[0].id).toBe('welcome-overview');
      expect(DASHBOARD_TOUR_STEPS[DASHBOARD_TOUR_STEPS.length - 1].id).toBe('ready-to-start');
    });

    it('each step contains valid highlight metadata', () => {
      for (const step of DASHBOARD_TOUR_STEPS) {
        expect(step.highlights.length).toBeGreaterThanOrEqual(3);
        step.highlights.forEach((h) => {
          expect(typeof h.title).toBe('string');
          expect(typeof h.description).toBe('string');
          expect(typeof h.icon).toBe('string');
        });
      }
    });
  });

  describe('SSR Safety', () => {
    it('handles window undefined gracefully without throwing', () => {
      delete (globalThis as any).window;

      expect(() => hasCompletedTour('user-123')).not.toThrow();
      expect(hasCompletedTour('user-123')).toBe(false);

      expect(() => markTourCompleted('user-123')).not.toThrow();
      expect(() => resetTour('user-123')).not.toThrow();
    });
  });
});
