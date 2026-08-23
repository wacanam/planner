import { describe, expect, it } from 'vitest';
import { UserRole } from '@/lib/roles';

describe('Email Verification Enforcement Logic', () => {
  type AuthProvider = 'password' | 'google.com';

  interface UserAuthState {
    isAuthenticated: boolean;
    provider: AuthProvider;
    emailVerified: boolean;
    role?: UserRole;
    congregationId?: string | null;
  }

  function getPostAuthRedirect(state: UserAuthState): string {
    if (!state.isAuthenticated) {
      return '/auth/login';
    }

    // Google accounts are inherently verified via OAuth
    const isVerified = state.provider === 'google.com' || state.emailVerified;
    if (!isVerified) {
      return '/auth/verify-email';
    }

    if (state.role === UserRole.SUPER_ADMIN || state.role === UserRole.ADMIN) {
      return '/admin/dashboard';
    }

    if (state.congregationId) {
      return `/congregation/${state.congregationId}/dashboard`;
    }

    return '/onboarding';
  }

  function evaluateProtectedPageAccess(state: UserAuthState): {
    canAccess: boolean;
    redirectTo: string | null;
  } {
    if (!state.isAuthenticated) {
      return { canAccess: false, redirectTo: '/auth/login' };
    }

    const isVerified = state.provider === 'google.com' || state.emailVerified;
    if (!isVerified) {
      return { canAccess: false, redirectTo: '/auth/verify-email' };
    }

    return { canAccess: true, redirectTo: null };
  }

  function calculateCooldownRemaining(
    lastSentTimestampMs: number,
    nowMs: number,
    cooldownSeconds = 60
  ): number {
    const elapsedSeconds = Math.floor((nowMs - lastSentTimestampMs) / 1000);
    if (elapsedSeconds < cooldownSeconds) {
      return cooldownSeconds - elapsedSeconds;
    }
    return 0;
  }

  describe('Post-Auth Redirection', () => {
    it('redirects unauthenticated users to login', () => {
      const target = getPostAuthRedirect({
        isAuthenticated: false,
        provider: 'password',
        emailVerified: false,
      });
      expect(target).toBe('/auth/login');
    });

    it('redirects unverified email/password users to /auth/verify-email', () => {
      const target = getPostAuthRedirect({
        isAuthenticated: true,
        provider: 'password',
        emailVerified: false,
      });
      expect(target).toBe('/auth/verify-email');
    });

    it('redirects unverified email/password users even if they have a congregation assigned', () => {
      const target = getPostAuthRedirect({
        isAuthenticated: true,
        provider: 'password',
        emailVerified: false,
        congregationId: 'cong-123',
        role: UserRole.PUBLISHER,
      });
      expect(target).toBe('/auth/verify-email');
    });

    it('redirects verified email/password users without congregation to /onboarding', () => {
      const target = getPostAuthRedirect({
        isAuthenticated: true,
        provider: 'password',
        emailVerified: true,
        congregationId: null,
      });
      expect(target).toBe('/onboarding');
    });

    it('redirects verified email/password users with congregation to congregation dashboard', () => {
      const target = getPostAuthRedirect({
        isAuthenticated: true,
        provider: 'password',
        emailVerified: true,
        congregationId: 'cong-central',
        role: UserRole.PUBLISHER,
      });
      expect(target).toBe('/congregation/cong-central/dashboard');
    });

    it('allows Google OAuth users to bypass verification to onboarding or dashboard', () => {
      const toOnboarding = getPostAuthRedirect({
        isAuthenticated: true,
        provider: 'google.com',
        emailVerified: true,
        congregationId: null,
      });
      expect(toOnboarding).toBe('/onboarding');

      const toDashboard = getPostAuthRedirect({
        isAuthenticated: true,
        provider: 'google.com',
        emailVerified: true,
        congregationId: 'cong-east',
        role: UserRole.SERVICE_OVERSEER,
      });
      expect(toDashboard).toBe('/congregation/cong-east/dashboard');
    });
  });

  describe('Protected Route Interceptor', () => {
    it('blocks access and redirects to /auth/verify-email for unverified password users', () => {
      const access = evaluateProtectedPageAccess({
        isAuthenticated: true,
        provider: 'password',
        emailVerified: false,
      });
      expect(access.canAccess).toBe(false);
      expect(access.redirectTo).toBe('/auth/verify-email');
    });

    it('allows access for verified password users', () => {
      const access = evaluateProtectedPageAccess({
        isAuthenticated: true,
        provider: 'password',
        emailVerified: true,
      });
      expect(access.canAccess).toBe(true);
      expect(access.redirectTo).toBeNull();
    });

    it('allows access for Google users', () => {
      const access = evaluateProtectedPageAccess({
        isAuthenticated: true,
        provider: 'google.com',
        emailVerified: true,
      });
      expect(access.canAccess).toBe(true);
      expect(access.redirectTo).toBeNull();
    });
  });

  describe('Resend Cooldown Calculation', () => {
    it('returns full 60 seconds when just requested', () => {
      const now = Date.now();
      const remaining = calculateCooldownRemaining(now, now, 60);
      expect(remaining).toBe(60);
    });

    it('returns remaining seconds when within cooldown window', () => {
      const now = Date.now();
      const sent20sAgo = now - 20 * 1000;
      const remaining = calculateCooldownRemaining(sent20sAgo, now, 60);
      expect(remaining).toBe(40);
    });

    it('returns 0 seconds when cooldown period has elapsed', () => {
      const now = Date.now();
      const sent75sAgo = now - 75 * 1000;
      const remaining = calculateCooldownRemaining(sent75sAgo, now, 60);
      expect(remaining).toBe(0);
    });
  });
});
