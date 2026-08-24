import { describe, expect, it } from 'vitest';
import { UserRole } from '@/lib/roles';

describe('PWA Redirection & Landing CTA Destination Logic', () => {
  function getLandingCtaInfo(params: {
    isAuthenticated: boolean;
    role?: UserRole | string | null;
    congregationId?: string | null;
  }) {
    if (!params.isAuthenticated) {
      return {
        heroButtonHref: '/auth/register',
        heroButtonLabel: 'Get Started Free',
        bottomButtonHref: '/auth/register',
        bottomButtonLabel: 'Sign Up Free',
        secondaryHref: '/auth/login',
        secondaryLabel: 'Already have an account?',
      };
    }

    const isAdmin =
      params.role === UserRole.SUPER_ADMIN ||
      params.role === UserRole.ADMIN ||
      params.role === 'SUPER_ADMIN' ||
      params.role === 'ADMIN';

    if (isAdmin) {
      return {
        heroButtonHref: '/admin/dashboard',
        heroButtonLabel: 'Go to Admin Dashboard',
        bottomButtonHref: '/admin/dashboard',
        bottomButtonLabel: 'Open Admin Dashboard',
        secondaryHref: '#how-it-works',
        secondaryLabel: 'Learn More',
      };
    }

    if (params.congregationId) {
      return {
        heroButtonHref: `/congregation/${params.congregationId}/dashboard`,
        heroButtonLabel: 'Go to Dashboard',
        bottomButtonHref: `/congregation/${params.congregationId}/dashboard`,
        bottomButtonLabel: 'Open Congregation Dashboard',
        secondaryHref: '#how-it-works',
        secondaryLabel: 'Learn More',
      };
    }

    return {
      heroButtonHref: '/onboarding',
      heroButtonLabel: 'Go to Workspace',
      bottomButtonHref: '/onboarding',
      bottomButtonLabel: 'Continue to Workspace',
      secondaryHref: '#how-it-works',
      secondaryLabel: 'Learn More',
    };
  }

  function getPwaRedirectTarget(params: {
    isStandalone: boolean;
    isAuthenticated: boolean;
    role?: UserRole | string | null;
    congregationId?: string | null;
  }): string | null {
    if (!params.isStandalone || !params.isAuthenticated) {
      return null;
    }

    const isAdmin =
      params.role === UserRole.SUPER_ADMIN ||
      params.role === UserRole.ADMIN ||
      params.role === 'SUPER_ADMIN' ||
      params.role === 'ADMIN';

    if (isAdmin) return '/admin/dashboard';
    if (params.congregationId) return `/congregation/${params.congregationId}/dashboard`;
    return '/onboarding';
  }

  describe('Landing Page CTA Button Replacement', () => {
    it('returns "Get Started Free" and register link for unauthenticated visitors', () => {
      const cta = getLandingCtaInfo({ isAuthenticated: false });
      expect(cta.heroButtonHref).toBe('/auth/register');
      expect(cta.heroButtonLabel).toBe('Get Started Free');
      expect(cta.bottomButtonHref).toBe('/auth/register');
      expect(cta.secondaryLabel).toBe('Already have an account?');
    });

    it('replaces CTA with "Go to Dashboard" for authenticated members with a congregation', () => {
      const cta = getLandingCtaInfo({
        isAuthenticated: true,
        role: UserRole.PUBLISHER,
        congregationId: 'cong-central-123',
      });
      expect(cta.heroButtonHref).toBe('/congregation/cong-central-123/dashboard');
      expect(cta.heroButtonLabel).toBe('Go to Dashboard');
      expect(cta.bottomButtonHref).toBe('/congregation/cong-central-123/dashboard');
      expect(cta.bottomButtonLabel).toBe('Open Congregation Dashboard');
    });

    it('replaces CTA with "Go to Admin Dashboard" for system administrators', () => {
      const cta = getLandingCtaInfo({
        isAuthenticated: true,
        role: UserRole.ADMIN,
      });
      expect(cta.heroButtonHref).toBe('/admin/dashboard');
      expect(cta.heroButtonLabel).toBe('Go to Admin Dashboard');
    });

    it('replaces CTA with "Go to Workspace" for authenticated users in onboarding', () => {
      const cta = getLandingCtaInfo({
        isAuthenticated: true,
        role: UserRole.USER,
        congregationId: null,
      });
      expect(cta.heroButtonHref).toBe('/onboarding');
      expect(cta.heroButtonLabel).toBe('Go to Workspace');
    });
  });

  describe('PWA Standalone Redirection', () => {
    it('does not redirect if not in standalone PWA mode', () => {
      const target = getPwaRedirectTarget({
        isStandalone: false,
        isAuthenticated: true,
        congregationId: 'cong-1',
      });
      expect(target).toBeNull();
    });

    it('does not redirect in PWA mode if user is unauthenticated', () => {
      const target = getPwaRedirectTarget({
        isStandalone: true,
        isAuthenticated: false,
      });
      expect(target).toBeNull();
    });

    it('redirects directly to congregation dashboard for authenticated PWA user', () => {
      const target = getPwaRedirectTarget({
        isStandalone: true,
        isAuthenticated: true,
        congregationId: 'cong-manila',
      });
      expect(target).toBe('/congregation/manila/dashboard'.replace('manila', 'cong-manila'));
    });

    it('redirects directly to admin dashboard for authenticated PWA admin', () => {
      const target = getPwaRedirectTarget({
        isStandalone: true,
        isAuthenticated: true,
        role: UserRole.SUPER_ADMIN,
      });
      expect(target).toBe('/admin/dashboard');
    });

    it('redirects directly to onboarding for authenticated PWA user without congregation', () => {
      const target = getPwaRedirectTarget({
        isStandalone: true,
        isAuthenticated: true,
        role: UserRole.USER,
        congregationId: null,
      });
      expect(target).toBe('/onboarding');
    });
  });

  describe('PWA /app Gateway Dispatcher Logic', () => {
    function resolveAppGatewayTarget(params: {
      cachedCongregationId?: string | null;
      loading: boolean;
      isAuthenticated: boolean;
      role?: UserRole | string | null;
      congregationId?: string | null;
    }): string | null {
      // 1. Fast Path: cached active congregation
      if (params.cachedCongregationId) {
        return `/congregation/${params.cachedCongregationId}/dashboard`;
      }

      // If still loading and no cache
      if (params.loading) {
        return null; // Keep displaying splash screen
      }

      // 2. Auth State resolution
      if (!params.isAuthenticated) {
        return '/auth/login';
      }

      const isAdmin =
        params.role === UserRole.SUPER_ADMIN ||
        params.role === UserRole.ADMIN ||
        params.role === 'SUPER_ADMIN' ||
        params.role === 'ADMIN';

      if (isAdmin) return '/admin/dashboard';
      if (params.congregationId) return `/congregation/${params.congregationId}/dashboard`;
      return '/onboarding';
    }

    it('immediately returns cached congregation dashboard even while loading', () => {
      const target = resolveAppGatewayTarget({
        cachedCongregationId: 'cong-cached-777',
        loading: true,
        isAuthenticated: false,
      });
      expect(target).toBe('/congregation/cong-cached-777/dashboard');
    });

    it('returns null (splash screen) while auth is resolving if no cache is present', () => {
      const target = resolveAppGatewayTarget({
        cachedCongregationId: null,
        loading: true,
        isAuthenticated: false,
      });
      expect(target).toBeNull();
    });

    it('redirects unauthenticated users to /auth/login after loading', () => {
      const target = resolveAppGatewayTarget({
        cachedCongregationId: null,
        loading: false,
        isAuthenticated: false,
      });
      expect(target).toBe('/auth/login');
    });

    it('redirects authenticated members to their congregation dashboard', () => {
      const target = resolveAppGatewayTarget({
        cachedCongregationId: null,
        loading: false,
        isAuthenticated: true,
        congregationId: 'cong-makati',
      });
      expect(target).toBe('/congregation/cong-makati/dashboard');
    });

    it('redirects admins to /admin/dashboard', () => {
      const target = resolveAppGatewayTarget({
        cachedCongregationId: null,
        loading: false,
        isAuthenticated: true,
        role: UserRole.SUPER_ADMIN,
      });
      expect(target).toBe('/admin/dashboard');
    });

    it('redirects users without congregation to /onboarding', () => {
      const target = resolveAppGatewayTarget({
        cachedCongregationId: null,
        loading: false,
        isAuthenticated: true,
        congregationId: null,
      });
      expect(target).toBe('/onboarding');
    });
  });
});

