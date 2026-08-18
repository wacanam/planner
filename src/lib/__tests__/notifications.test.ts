import { describe, expect, it } from 'vitest';
import { notificationFromData } from '@/hooks/use-notifications';
import {
  formatNotificationTime,
  getNotificationRoute,
  getNotificationVisuals,
  parseNotificationData,
} from '@/lib/notifications';
import { NotificationType } from '@/lib/roles';
import type { Notification } from '@/types/api';

describe('Notification Utilities', () => {
  describe('parseNotificationData', () => {
    it('returns empty object when data is null or undefined', () => {
      expect(parseNotificationData(null)).toEqual({});
      expect(parseNotificationData(undefined)).toEqual({});
      expect(parseNotificationData({ data: null })).toEqual({});
    });

    it('parses valid JSON string data', () => {
      const payload = { congregationId: 'cong-123', territoryId: 't-456', mode: 'transfer' };
      expect(parseNotificationData({ data: JSON.stringify(payload) })).toEqual(payload);
    });

    it('returns empty object when JSON parsing fails', () => {
      expect(parseNotificationData({ data: 'invalid-json-string' })).toEqual({});
    });

    it('handles already parsed object in data', () => {
      const payload = { congregationId: 'cong-123' };
      expect(parseNotificationData({ data: payload as any })).toEqual(payload);
    });
  });

  describe('formatNotificationTime', () => {
    it('returns empty string for missing or invalid timestamps', () => {
      expect(formatNotificationTime(null)).toBe('');
      expect(formatNotificationTime(undefined)).toBe('');
      expect(formatNotificationTime('invalid-date')).toBe('');
    });

    it('returns "Just now" for recent timestamps within 45s', () => {
      const now = new Date().toISOString();
      expect(formatNotificationTime(now)).toBe('Just now');
    });

    it('returns "5m ago" for timestamps 5 minutes in the past', () => {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatNotificationTime(fiveMinsAgo)).toBe('5m ago');
    });

    it('returns "3h ago" for timestamps 3 hours in the past', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
      expect(formatNotificationTime(threeHoursAgo)).toBe('3h ago');
    });

    it('returns "Yesterday" for timestamps 24-48 hours ago', () => {
      const yesterday = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
      expect(formatNotificationTime(yesterday)).toBe('Yesterday');
    });

    it('returns "4d ago" for timestamps 4 days ago', () => {
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString();
      expect(formatNotificationTime(fourDaysAgo)).toBe('4d ago');
    });
  });

  describe('getNotificationRoute', () => {
    it('prefers explicit url in notification data if present', () => {
      const notif: Partial<Notification> = {
        type: NotificationType.TERRITORY_APPROVED,
        data: JSON.stringify({ url: '/custom-destination' }),
      };
      expect(getNotificationRoute(notif, 'cong-1')).toBe('/custom-destination');
    });

    it('routes territory approved to my-assignments', () => {
      const notif: Partial<Notification> = {
        type: NotificationType.TERRITORY_APPROVED,
        data: JSON.stringify({ congregationId: 'cong-100', territoryId: 't-1' }),
      };
      expect(getNotificationRoute(notif)).toBe('/congregation/cong-100/my-assignments');
    });

    it('routes territory endorsed to members endorsements tab and returned to territories list', () => {
      const endorsed: Partial<Notification> = {
        type: NotificationType.TERRITORY_ENDORSED,
        data: JSON.stringify({ congregationId: 'cong-100' }),
      };
      expect(getNotificationRoute(endorsed)).toBe(
        '/congregation/cong-100/members?tab=endorsements'
      );

      const returned: Partial<Notification> = {
        type: NotificationType.TERRITORY_RETURNED,
        data: JSON.stringify({ congregationId: 'cong-100' }),
      };
      expect(getNotificationRoute(returned)).toBe('/congregation/cong-100/territories');
    });

    it('routes share requests to households records', () => {
      const share: Partial<Notification> = {
        type: NotificationType.SHARE_REQUEST,
        data: JSON.stringify({ congregationId: 'cong-100', shareId: 's-1' }),
      };
      expect(getNotificationRoute(share)).toBe('/congregation/cong-100/records/households');
    });

    it('routes join requests to members page for overseers', () => {
      const joinReq: Partial<Notification> = {
        type: NotificationType.JOIN_REQUEST,
        data: JSON.stringify({ congregationId: 'cong-100' }),
      };
      expect(getNotificationRoute(joinReq)).toBe('/congregation/cong-100/members');
    });

    it('routes join approved to congregation dashboard', () => {
      const approved: Partial<Notification> = {
        type: NotificationType.JOIN_APPROVED,
        data: JSON.stringify({ congregationId: 'cong-100' }),
      };
      expect(getNotificationRoute(approved)).toBe('/congregation/cong-100/dashboard');
    });

    it('routes join rejected to onboarding', () => {
      const rejected: Partial<Notification> = {
        type: NotificationType.JOIN_REJECTED,
      };
      expect(getNotificationRoute(rejected)).toBe('/onboarding');
    });

    it('uses fallback congregation ID if not in data', () => {
      const notif: Partial<Notification> = {
        type: NotificationType.TERRITORY_APPROVED,
        data: null,
      };
      expect(getNotificationRoute(notif, 'fallback-cong')).toBe(
        '/congregation/fallback-cong/my-assignments'
      );
    });
  });

  describe('getNotificationVisuals', () => {
    it('returns visual metadata for territory types', () => {
      const visuals = getNotificationVisuals(NotificationType.TERRITORY_APPROVED);
      expect(visuals.category).toBe('Territory');
      expect(visuals.badgeLabel).toBe('Assignment Approved');
      expect(visuals.iconName).toBe('check-circle');
    });

    it('returns visual metadata for share types', () => {
      const visuals = getNotificationVisuals(NotificationType.SHARE_REQUEST);
      expect(visuals.category).toBe('Sharing');
      expect(visuals.badgeLabel).toBe('Share Request');
      expect(visuals.iconName).toBe('share');
    });

    it('returns visual metadata for membership types', () => {
      const visuals = getNotificationVisuals(NotificationType.JOIN_REQUEST);
      expect(visuals.category).toBe('Membership');
      expect(visuals.iconName).toBe('users');
    });

    it('returns fallback system notice visuals for unknown types', () => {
      const visuals = getNotificationVisuals('unknown_type');
      expect(visuals.category).toBe('System');
      expect(visuals.iconName).toBe('bell');
    });
  });

  describe('notificationFromData', () => {
    it('maps Partial<Notification> to complete Notification structure', () => {
      const notif = notificationFromData('n-1', {
        userId: 'user-1',
        type: NotificationType.TERRITORY_APPROVED,
        title: 'Territory Assigned',
        body: 'Territory 5 assigned',
        isRead: true,
        readAt: '2026-08-17T12:00:00Z',
      });

      expect(notif.id).toBe('n-1');
      expect(notif.userId).toBe('user-1');
      expect(notif.type).toBe(NotificationType.TERRITORY_APPROVED);
      expect(notif.isRead).toBe(true);
      expect(notif.readAt).toBe('2026-08-17T12:00:00Z');
      expect(notif.title).toBe('Territory Assigned');
    });

    it('provides sensible defaults for missing fields', () => {
      const notif = notificationFromData('n-2', {});
      expect(notif.id).toBe('n-2');
      expect(notif.userId).toBe('');
      expect(notif.title).toBe('Notification');
      expect(notif.body).toBe('');
      expect(notif.isRead).toBe(false);
      expect(notif.readAt).toBeNull();
      expect(notif.createdAt).toBeDefined();
    });
  });
});
