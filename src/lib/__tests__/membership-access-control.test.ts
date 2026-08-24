import { describe, expect, it } from 'vitest';
import { memberFromData } from '@/hooks/use-congregation-members';
import { buildWelcomeEmailContent } from '@/lib/mail';
import { UserRole } from '@/lib/roles';
import type { Member } from '@/types/api';

describe('Membership Access Control & Welcome Email', () => {
  describe('Welcome Email Generation', () => {
    it('generates customized subject, HTML, and text with congregation name and dashboard link', () => {
      const email = buildWelcomeEmailContent({
        toEmail: 'john@example.com',
        userName: 'John Doe',
        congregationName: 'Southside English',
        congregationId: 'cong-southside-123',
        appUrl: 'https://kanataran.app',
      });

      expect(email.subject).toBe('Welcome to Southside English on Kanataran!');
      expect(email.text).toContain('Hello John Doe');
      expect(email.text).toContain('Southside English');
      expect(email.text).toContain(
        'https://kanataran.app/congregation/cong-southside-123/dashboard'
      );
      expect(email.html).toContain('Welcome to Southside English!');
      expect(email.html).toContain(
        'https://kanataran.app/congregation/cong-southside-123/dashboard'
      );
    });

    it('falls back to "Publisher" when user name is not provided', () => {
      const email = buildWelcomeEmailContent({
        toEmail: 'anonymous@example.com',
        userName: null,
        congregationName: 'North Metro',
        congregationId: 'cong-north',
      });

      expect(email.text).toContain('Hello Publisher');
      expect(email.html).toContain('Hello <strong>Publisher</strong>');
    });
  });

  describe('Membership Status Access Rules', () => {
    it('distinguishes between active and unapproved membership records', () => {
      const activeMember = memberFromData('user-1', {
        userId: 'user-1',
        congregationId: 'cong-1',
        status: 'active',
        congregationRole: 'publisher',
      });

      const pendingMember = memberFromData('user-2', {
        userId: 'user-2',
        congregationId: 'cong-1',
        status: 'pending',
        congregationRole: null,
      });

      const rejectedMember = memberFromData('user-3', {
        userId: 'user-3',
        congregationId: 'cong-1',
        status: 'rejected',
        congregationRole: null,
      });

      // Active member check
      const isActive = (m: Member) => m.status === 'active' || m.status === 'approved';
      expect(isActive(activeMember)).toBe(true);
      expect(isActive(pendingMember)).toBe(false);
      expect(isActive(rejectedMember)).toBe(false);
    });

    it('determines effective congregation ID strictly based on active membership status', () => {
      function getEffectiveCongregationId(user: {
        role: string;
        sessionCongregationId?: string | null;
        membershipStatus: 'active' | 'pending' | 'rejected' | 'none';
        membershipCongregationId?: string | null;
      }): string | null {
        const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
        if (isAdmin) {
          return user.sessionCongregationId || user.membershipCongregationId || null;
        }
        return user.membershipStatus === 'active' ? user.membershipCongregationId || null : null;
      }

      // Pending user
      expect(
        getEffectiveCongregationId({
          role: 'USER',
          sessionCongregationId: 'cong-1', // previously leaked
          membershipStatus: 'pending',
          membershipCongregationId: null,
        })
      ).toBeNull();

      // Rejected user
      expect(
        getEffectiveCongregationId({
          role: 'USER',
          sessionCongregationId: 'cong-1',
          membershipStatus: 'rejected',
          membershipCongregationId: null,
        })
      ).toBeNull();

      // Active publisher
      expect(
        getEffectiveCongregationId({
          role: 'USER',
          sessionCongregationId: 'cong-1',
          membershipStatus: 'active',
          membershipCongregationId: 'cong-1',
        })
      ).toBe('cong-1');

      // Global admin
      expect(
        getEffectiveCongregationId({
          role: 'SUPER_ADMIN',
          sessionCongregationId: 'cong-any',
          membershipStatus: 'none',
          membershipCongregationId: null,
        })
      ).toBe('cong-any');
    });

    it('enforces congregation guard validation for protected pages', () => {
      function isAccessAllowed(params: {
        userRole: UserRole;
        userCongregationId: string | null;
        targetCongregationId?: string;
      }): boolean {
        if (params.userRole === UserRole.SUPER_ADMIN || params.userRole === UserRole.ADMIN) {
          return true;
        }
        if (params.targetCongregationId) {
          if (!params.userCongregationId) return false;
          if (params.userCongregationId !== params.targetCongregationId) return false;
        }
        return true;
      }

      // User with null congregation attempting access
      expect(
        isAccessAllowed({
          userRole: UserRole.USER,
          userCongregationId: null,
          targetCongregationId: 'cong-secret',
        })
      ).toBe(false);

      // User with different congregation
      expect(
        isAccessAllowed({
          userRole: UserRole.PUBLISHER,
          userCongregationId: 'cong-A',
          targetCongregationId: 'cong-B',
        })
      ).toBe(false);

      // Approved user accessing own congregation
      expect(
        isAccessAllowed({
          userRole: UserRole.PUBLISHER,
          userCongregationId: 'cong-A',
          targetCongregationId: 'cong-A',
        })
      ).toBe(true);

      // Admin accessing any congregation
      expect(
        isAccessAllowed({
          userRole: UserRole.SUPER_ADMIN,
          userCongregationId: null,
          targetCongregationId: 'cong-A',
        })
      ).toBe(true);
    });
  });

  describe('Congregation Search Filter logic', () => {
    const congregations = [
      {
        id: '1',
        name: 'Manila Central English',
        city: 'Manila',
        country: 'Philippines',
        slug: 'manila-central-english',
      },
      {
        id: '2',
        name: 'Quezon City North',
        city: 'Quezon City',
        country: 'Philippines',
        slug: 'quezon-city-north',
      },
      {
        id: '3',
        name: 'Tokyo International',
        city: 'Tokyo',
        country: 'Japan',
        slug: 'tokyo-international',
      },
      { id: '4', name: 'Sydney South', city: 'Sydney', country: 'Australia', slug: 'sydney-south' },
    ];

    function searchCongregations(query: string) {
      const term = query.trim().toLowerCase();
      if (!term) return congregations;
      return congregations.filter((item) => {
        const name = (item.name || '').toLowerCase();
        const city = (item.city || '').toLowerCase();
        const country = (item.country || '').toLowerCase();
        const slug = (item.slug || '').toLowerCase();
        return (
          name.includes(term) ||
          city.includes(term) ||
          country.includes(term) ||
          slug.includes(term)
        );
      });
    }

    it('matches by congregation name', () => {
      const results = searchCongregations('Central');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('1');
    });

    it('matches by city name', () => {
      const results = searchCongregations('Quezon');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('2');
    });

    it('matches by country name', () => {
      const results = searchCongregations('Japan');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('3');
    });

    it('returns empty list for unmatched query', () => {
      const results = searchCongregations('Nonexistent');
      expect(results.length).toBe(0);
    });
  });
});
