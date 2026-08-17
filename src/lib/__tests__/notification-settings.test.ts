import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type User,
  type UserNotificationSettings,
} from '@/types/api';

describe('Notification Settings in Firebase DB', () => {
  it('has sensible default notification settings', () => {
    expect(DEFAULT_NOTIFICATION_SETTINGS.soundEnabled).toBe(true);
    expect(DEFAULT_NOTIFICATION_SETTINGS.soundStyle).toBe('chime');
    expect(DEFAULT_NOTIFICATION_SETTINGS.territoryUpdates).toBe(true);
    expect(DEFAULT_NOTIFICATION_SETTINGS.shareUpdates).toBe(true);
    expect(DEFAULT_NOTIFICATION_SETTINGS.membershipUpdates).toBe(true);
    expect(DEFAULT_NOTIFICATION_SETTINGS.accountUpdates).toBe(true);
    expect(DEFAULT_NOTIFICATION_SETTINGS.systemAnnouncements).toBe(true);
  });

  it('merges user settings correctly on top of defaults', () => {
    const userSettings: Partial<UserNotificationSettings> = {
      soundEnabled: false,
      soundStyle: 'ding',
      territoryUpdates: false,
    };

    const merged: UserNotificationSettings = {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...userSettings,
    };

    expect(merged.soundEnabled).toBe(false);
    expect(merged.soundStyle).toBe('ding');
    expect(merged.territoryUpdates).toBe(false);
    expect(merged.shareUpdates).toBe(true); // preserved default
    expect(merged.membershipUpdates).toBe(true); // preserved default
  });

  it('stores notification settings under User model definition', () => {
    const customSettings: UserNotificationSettings = {
      soundEnabled: true,
      soundStyle: 'pop',
      territoryUpdates: true,
      shareUpdates: false,
      membershipUpdates: true,
      accountUpdates: true,
      systemAnnouncements: false,
    };

    const user: User = {
      id: 'u-123',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'USER',
      isActive: true,
      createdAt: '2026-08-17T00:00:00Z',
      updatedAt: '2026-08-17T00:00:00Z',
      notificationSettings: customSettings,
    };

    expect(user.notificationSettings).toEqual(customSettings);
    expect(user.notificationSettings?.soundStyle).toBe('pop');
    expect(user.notificationSettings?.shareUpdates).toBe(false);
  });
});
