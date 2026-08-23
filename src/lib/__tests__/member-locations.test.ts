import { describe, expect, it } from 'vitest';
import { canViewMemberLocations, filterVisibleMemberLocations, isLocationActive } from '@/lib/permissions';
import { UserRole } from '@/lib/roles';
import type { Group, SharedMemberLocation } from '@/types/api';

describe('Member Real-Time Location Sharing & Expiry Scoping', () => {
  const baseTime = 1755763200000; // Fixed timestamp for tests

  const mockGroups: Group[] = [
    {
      id: 'group-1',
      congregationId: 'cong-1',
      name: 'Group 1 - Downtown',
      overseerId: 'overseer-user-1',
      overseerName: 'Brother Overseer 1',
      assistantOverseerId: 'assistant-user-1',
      assistantOverseerName: 'Brother Assistant 1',
      createdAt: '2026-01-01T00:00:00Z',
      members: [
        { id: 'member-1', userId: 'member-1', role: 'member', user: { name: 'Publisher One', email: null } },
        { id: 'member-2', userId: 'member-2', role: 'member', user: { name: 'Publisher Two', email: null } },
        { id: 'member-expired', userId: 'member-expired', role: 'member', user: { name: 'Publisher Expired', email: null } },
      ],
    },
    {
      id: 'group-2',
      congregationId: 'cong-1',
      name: 'Group 2 - Uptown',
      overseerId: 'overseer-user-2',
      overseerName: 'Brother Overseer 2',
      createdAt: '2026-01-01T00:00:00Z',
      members: [
        { id: 'member-3', userId: 'member-3', role: 'member', user: { name: 'Publisher Three', email: null } },
      ],
    },
  ];

  const mockLocations: SharedMemberLocation[] = [
    {
      id: 'cong-1_member-1',
      userId: 'member-1',
      congregationId: 'cong-1',
      userName: 'Publisher One',
      groupId: 'group-1',
      groupName: 'Group 1 - Downtown',
      latitude: 14.5995,
      longitude: 120.9842,
      accuracy: 10,
      heading: 90,
      isSharing: true,
      durationMinutes: 120,
      expiresAt: new Date(baseTime + 60 * 60 * 1000).toISOString(), // 1 hr in future
      updatedAt: new Date(baseTime).toISOString(),
      lastSeenAt: new Date(baseTime).toISOString(),
    },
    {
      id: 'cong-1_member-2',
      userId: 'member-2',
      congregationId: 'cong-1',
      userName: 'Publisher Two',
      groupId: 'group-1',
      groupName: 'Group 1 - Downtown',
      latitude: 14.5998,
      longitude: 120.9845,
      accuracy: 15,
      heading: null,
      isSharing: false, // Stopped sharing -> must disappear from map
      updatedAt: new Date(baseTime - 30 * 60 * 1000).toISOString(),
      lastSeenAt: new Date(baseTime - 30 * 60 * 1000).toISOString(),
    },
    {
      id: 'cong-1_member-expired',
      userId: 'member-expired',
      congregationId: 'cong-1',
      userName: 'Publisher Expired',
      groupId: 'group-1',
      groupName: 'Group 1 - Downtown',
      latitude: 14.6000,
      longitude: 120.9850,
      accuracy: 12,
      heading: null,
      isSharing: true,
      durationMinutes: 30,
      expiresAt: new Date(baseTime - 5 * 60 * 1000).toISOString(), // Expired 5 mins ago
      updatedAt: new Date(baseTime - 35 * 60 * 1000).toISOString(),
      lastSeenAt: new Date(baseTime - 35 * 60 * 1000).toISOString(),
    },
    {
      id: 'cong-1_member-3',
      userId: 'member-3',
      congregationId: 'cong-1',
      userName: 'Publisher Three',
      groupId: 'group-2',
      groupName: 'Group 2 - Uptown',
      latitude: 14.6100,
      longitude: 120.9900,
      accuracy: 8,
      heading: 180,
      isSharing: true,
      durationMinutes: 60,
      expiresAt: new Date(baseTime + 30 * 60 * 1000).toISOString(), // 30 mins in future
      updatedAt: new Date(baseTime).toISOString(),
      lastSeenAt: new Date(baseTime).toISOString(),
    },
  ];

  describe('isLocationActive', () => {
    it('returns true for active, non-expired location', () => {
      expect(isLocationActive(mockLocations[0], baseTime)).toBe(true);
    });

    it('returns false when user stopped sharing (isSharing = false)', () => {
      expect(isLocationActive(mockLocations[1], baseTime)).toBe(false);
    });

    it('returns false when duration has expired (expiresAt <= now)', () => {
      expect(isLocationActive(mockLocations[2], baseTime)).toBe(false);
    });
  });

  describe('canViewMemberLocations', () => {
    it('allows Service Overseer to view member locations', () => {
      const user = { id: 'so-user', role: UserRole.SERVICE_OVERSEER };
      expect(canViewMemberLocations(user, mockGroups)).toBe(true);
    });

    it('allows Territory Servant to view member locations', () => {
      const user = { id: 'ts-user', role: UserRole.TERRITORY_SERVANT };
      expect(canViewMemberLocations(user, mockGroups)).toBe(true);
    });

    it('allows Admin and Super Admin to view member locations', () => {
      expect(canViewMemberLocations({ id: 'admin-user', role: UserRole.ADMIN }, mockGroups)).toBe(true);
      expect(canViewMemberLocations({ id: 'super-admin-user', role: UserRole.SUPER_ADMIN }, mockGroups)).toBe(true);
    });

    it('allows Group Overseer to view member locations', () => {
      const user = { id: 'overseer-user-1', role: UserRole.USER };
      expect(canViewMemberLocations(user, mockGroups)).toBe(true);
    });

    it('allows Assistant Group Overseer to view member locations', () => {
      const user = { id: 'assistant-user-1', role: UserRole.USER };
      expect(canViewMemberLocations(user, mockGroups)).toBe(true);
    });

    it('denies regular Publisher who is not an overseer or servant', () => {
      const user = { id: 'member-1', role: UserRole.USER };
      expect(canViewMemberLocations(user, mockGroups)).toBe(false);
    });
  });

  describe('filterVisibleMemberLocations', () => {
    it('returns only active, non-expired locations across congregation for Service Overseer', () => {
      const user = { id: 'so-user', role: UserRole.SERVICE_OVERSEER };
      const visible = filterVisibleMemberLocations(user, mockGroups, mockLocations, baseTime);
      // member-2 (stopped) and member-expired (expired) must not appear!
      expect(visible).toHaveLength(2);
      expect(visible.map((l) => l.userId)).toEqual(['member-1', 'member-3']);
    });

    it('returns only active, non-expired locations across congregation for Territory Servant', () => {
      const user = { id: 'ts-user', role: UserRole.TERRITORY_SERVANT };
      const visible = filterVisibleMemberLocations(user, mockGroups, mockLocations, baseTime);
      expect(visible).toHaveLength(2);
      expect(visible.map((l) => l.userId)).toEqual(['member-1', 'member-3']);
    });

    it('scopes visibility for Group Overseer to only active, non-expired group members', () => {
      const user = { id: 'overseer-user-1', role: UserRole.USER };
      const visible = filterVisibleMemberLocations(user, mockGroups, mockLocations, baseTime);
      expect(visible).toHaveLength(1);
      expect(visible[0].userId).toBe('member-1');
    });

    it('scopes visibility for Group 2 Overseer to only Group 2 active members', () => {
      const user = { id: 'overseer-user-2', role: UserRole.USER };
      const visible = filterVisibleMemberLocations(user, mockGroups, mockLocations, baseTime);
      expect(visible).toHaveLength(1);
      expect(visible[0].userId).toBe('member-3');
    });

    it('scopes visibility for regular Publisher to only their own active location', () => {
      const user = { id: 'member-1', role: UserRole.USER };
      const visible = filterVisibleMemberLocations(user, mockGroups, mockLocations, baseTime);
      expect(visible).toHaveLength(1);
      expect(visible[0].userId).toBe('member-1');
    });

    it('returns empty array when user stopped sharing their location', () => {
      const user = { id: 'member-2', role: UserRole.USER };
      const visible = filterVisibleMemberLocations(user, mockGroups, mockLocations, baseTime);
      expect(visible).toHaveLength(0);
    });

    it('handles empty inputs safely', () => {
      expect(filterVisibleMemberLocations(null, mockGroups, mockLocations, baseTime)).toEqual([]);
      expect(filterVisibleMemberLocations({ id: 'user-1', role: UserRole.USER }, [], [], baseTime)).toEqual([]);
    });
  });

  describe('Profile Avatar Aspect Ratio & Real-Time Sync', () => {
    it('calculates aspect-ratio-preserving cover dimensions for landscape images', () => {
      const PREVIEW_SIZE = 192;
      const naturalWidth = 1920;
      const naturalHeight = 1080;
      const rotation = 0;

      const isRotated90or270 = rotation % 180 !== 0;
      const baseCoverScale = isRotated90or270
        ? Math.max(PREVIEW_SIZE / naturalHeight, PREVIEW_SIZE / naturalWidth)
        : Math.max(PREVIEW_SIZE / naturalWidth, PREVIEW_SIZE / naturalHeight);

      const previewBaseWidth = naturalWidth * baseCoverScale;
      const previewBaseHeight = naturalHeight * baseCoverScale;

      expect(previewBaseWidth / previewBaseHeight).toBeCloseTo(naturalWidth / naturalHeight, 5);
      expect(previewBaseWidth).toBeGreaterThanOrEqual(PREVIEW_SIZE);
      expect(previewBaseHeight).toBeGreaterThanOrEqual(PREVIEW_SIZE);
    });

    it('calculates aspect-ratio-preserving cover dimensions for portrait images', () => {
      const PREVIEW_SIZE = 192;
      const naturalWidth = 1080;
      const naturalHeight = 1920;
      const rotation = 0;

      const isRotated90or270 = rotation % 180 !== 0;
      const baseCoverScale = isRotated90or270
        ? Math.max(PREVIEW_SIZE / naturalHeight, PREVIEW_SIZE / naturalWidth)
        : Math.max(PREVIEW_SIZE / naturalWidth, PREVIEW_SIZE / naturalHeight);

      const previewBaseWidth = naturalWidth * baseCoverScale;
      const previewBaseHeight = naturalHeight * baseCoverScale;

      expect(previewBaseWidth / previewBaseHeight).toBeCloseTo(naturalWidth / naturalHeight, 5);
      expect(previewBaseWidth).toBeGreaterThanOrEqual(PREVIEW_SIZE);
      expect(previewBaseHeight).toBeGreaterThanOrEqual(PREVIEW_SIZE);
    });

    it('calculates aspect-ratio-preserving cover dimensions when rotated 90 or 270 degrees', () => {
      const PREVIEW_SIZE = 192;
      const naturalWidth = 1920;
      const naturalHeight = 1080;

      for (const rotation of [90, 270]) {
        const isRotated90or270 = rotation % 180 !== 0;
        const baseCoverScale = isRotated90or270
          ? Math.max(PREVIEW_SIZE / naturalHeight, PREVIEW_SIZE / naturalWidth)
          : Math.max(PREVIEW_SIZE / naturalWidth, PREVIEW_SIZE / naturalHeight);

        const previewBaseWidth = naturalWidth * baseCoverScale;
        const previewBaseHeight = naturalHeight * baseCoverScale;

        expect(previewBaseWidth / previewBaseHeight).toBeCloseTo(naturalWidth / naturalHeight, 5);
        expect(previewBaseHeight).toBeGreaterThanOrEqual(PREVIEW_SIZE);
        expect(previewBaseWidth).toBeGreaterThanOrEqual(PREVIEW_SIZE);
      }
    });

    it('enriches current user location with latest local avatarUrl', () => {
      const currentUser = {
        id: 'member-1',
        name: 'Publisher One Updated',
        avatarUrl: 'https://example.com/new-avatar.jpg',
      };

      const enriched = mockLocations.map((loc) => {
        if (loc.userId === currentUser.id) {
          return {
            ...loc,
            userName: currentUser.name || loc.userName,
            avatarUrl: currentUser.avatarUrl !== undefined ? currentUser.avatarUrl : loc.avatarUrl,
          };
        }
        return loc;
      });

      expect(enriched[0].avatarUrl).toBe('https://example.com/new-avatar.jpg');
      expect(enriched[0].userName).toBe('Publisher One Updated');
    });
  });
});
