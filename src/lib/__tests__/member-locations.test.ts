import { describe, expect, it } from 'vitest';
import { canViewMemberLocations, filterVisibleMemberLocations } from '@/lib/permissions';
import { UserRole } from '@/lib/roles';
import type { Group, SharedMemberLocation } from '@/types/api';

describe('Member Real-Time and Last Known Location Scoping', () => {
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
      updatedAt: '2026-08-21T10:00:00Z',
      lastSeenAt: '2026-08-21T10:00:00Z',
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
      isSharing: false,
      updatedAt: '2026-08-21T09:30:00Z',
      lastSeenAt: '2026-08-21T09:30:00Z',
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
      updatedAt: '2026-08-21T10:05:00Z',
      lastSeenAt: '2026-08-21T10:05:00Z',
    },
  ];

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
    it('returns all congregation locations for Service Overseer', () => {
      const user = { id: 'so-user', role: UserRole.SERVICE_OVERSEER };
      const visible = filterVisibleMemberLocations(user, mockGroups, mockLocations);
      expect(visible).toHaveLength(3);
      expect(visible.map((l) => l.userId)).toEqual(['member-1', 'member-2', 'member-3']);
    });

    it('returns all congregation locations for Territory Servant', () => {
      const user = { id: 'ts-user', role: UserRole.TERRITORY_SERVANT };
      const visible = filterVisibleMemberLocations(user, mockGroups, mockLocations);
      expect(visible).toHaveLength(3);
    });

    it('scopes visibility for Group Overseer to only their group members and self', () => {
      const user = { id: 'overseer-user-1', role: UserRole.USER };
      const visible = filterVisibleMemberLocations(user, mockGroups, mockLocations);
      expect(visible).toHaveLength(2);
      expect(visible.map((l) => l.userId)).toContain('member-1');
      expect(visible.map((l) => l.userId)).toContain('member-2');
      expect(visible.map((l) => l.userId)).not.toContain('member-3');
    });

    it('scopes visibility for Group 2 Overseer to only Group 2 members', () => {
      const user = { id: 'overseer-user-2', role: UserRole.USER };
      const visible = filterVisibleMemberLocations(user, mockGroups, mockLocations);
      expect(visible).toHaveLength(1);
      expect(visible[0].userId).toBe('member-3');
    });

    it('scopes visibility for regular Publisher to only their own shared location', () => {
      const user = { id: 'member-1', role: UserRole.USER };
      const visible = filterVisibleMemberLocations(user, mockGroups, mockLocations);
      expect(visible).toHaveLength(1);
      expect(visible[0].userId).toBe('member-1');
    });

    it('handles empty inputs safely', () => {
      expect(filterVisibleMemberLocations(null, mockGroups, mockLocations)).toEqual([]);
      expect(filterVisibleMemberLocations({ id: 'user-1', role: UserRole.USER }, [], [])).toEqual([]);
    });
  });
});
