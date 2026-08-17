import { describe, expect, it } from 'vitest';
import { joinRequestFromMember, memberFromData } from '@/hooks/use-congregation-members';
import { MemberStatus, NotificationType, UserRole } from '@/lib/roles';
import type { Group, Member } from '@/types/api';

describe('useCongregationMembers helpers', () => {
  describe('memberFromData', () => {
    it('normalizes "approved" status to "active"', () => {
      const member = memberFromData('member-123', {
        id: 'member-123',
        userId: 'user-123',
        congregationId: 'cong-1',
        status: 'approved',
      });

      expect(member.status).toBe('active');
      expect(member.userId).toBe('user-123');
      expect(member.congregationId).toBe('cong-1');
    });

    it('defaults status to "active" if status is missing', () => {
      const member = memberFromData('member-123', {
        userId: 'user-123',
      });

      expect(member.status).toBe('active');
    });

    it('preserves "pending" and "rejected" statuses', () => {
      const pending = memberFromData('p-1', { status: MemberStatus.PENDING });
      const rejected = memberFromData('r-1', { status: MemberStatus.REJECTED });

      expect(pending.status).toBe('pending');
      expect(rejected.status).toBe('rejected');
    });

    it('falls back to doc id if userId is not provided', () => {
      const member = memberFromData('doc-xyz', {
        congregationId: 'cong-1',
      });

      expect(member.userId).toBe('doc-xyz');
      expect(member.id).toBe('doc-xyz');
    });

    it('populates fallback user object if user property is missing', () => {
      const member = memberFromData('user-456', {
        id: 'user-456',
        congregationId: 'cong-1',
        user: null,
      });

      expect(member.user).toEqual({
        id: 'user-456',
        name: null,
        email: null,
        role: null,
      });
    });
  });

  describe('joinRequestFromMember', () => {
    it('transforms member into a JoinRequest object correctly', () => {
      const member: Member = {
        id: 'user-789',
        userId: 'user-789',
        congregationId: 'cong-1',
        congregationRole: null,
        status: 'pending',
        joinMessage: 'Hello, please approve my request',
        joinedAt: '2026-08-17T00:00:00.000Z',
        user: {
          id: 'user-789',
          name: 'John Doe',
          email: 'john@example.com',
          role: UserRole.PUBLISHER,
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      };

      const joinRequest = joinRequestFromMember(member);

      expect(joinRequest.id).toBe('user-789');
      expect(joinRequest.userId).toBe('user-789');
      expect(joinRequest.congregationId).toBe('cong-1');
      expect(joinRequest.status).toBe('pending');
      expect(joinRequest.joinMessage).toBe('Hello, please approve my request');
      expect(joinRequest.user?.name).toBe('John Doe');
      expect(joinRequest.user?.email).toBe('john@example.com');
      expect(joinRequest.user?.avatarUrl).toBe('https://example.com/avatar.jpg');
    });
  });

  describe('Service Overseer Group Assignment Filtering', () => {
    it('allows newly approved members to be available for group assignment', () => {
      const members: Member[] = [
        memberFromData('user-1', {
          id: 'user-1',
          userId: 'user-1',
          congregationId: 'cong-1',
          status: 'active',
          user: { id: 'user-1', name: 'Alice', email: 'alice@example.com', role: UserRole.PUBLISHER },
        }),
        memberFromData('user-2', {
          id: 'user-2',
          userId: 'user-2',
          congregationId: 'cong-1',
          status: 'approved', // Legacy or direct approved status normalized to active
          user: { id: 'user-2', name: 'Bob', email: 'bob@example.com', role: UserRole.PUBLISHER },
        }),
        memberFromData('user-3', {
          id: 'user-3',
          userId: 'user-3',
          congregationId: 'cong-1',
          status: 'pending',
          user: { id: 'user-3', name: 'Charlie', email: 'charlie@example.com', role: UserRole.PUBLISHER },
        }),
      ];

      const groups: Group[] = [
        {
          id: 'group-1',
          congregationId: 'cong-1',
          name: 'Group 1',
          createdAt: '2026-08-17T00:00:00.000Z',
          members: [
            {
              id: 'user-1',
              userId: 'user-1',
              role: 'member',
              user: { name: 'Alice', email: 'alice@example.com' },
            },
          ],
        },
      ];

      // Active members filter: active or approved
      const activeMembers = members.filter((m) => m.status === 'active' || m.status === 'approved');
      expect(activeMembers.length).toBe(2);
      expect(activeMembers.map((m) => m.userId)).toEqual(['user-1', 'user-2']);

      // memberGroupMap calculation
      const memberGroupMap = new Map<string, { groupId: string; groupName: string }>();
      for (const g of groups) {
        for (const gm of g.members || []) {
          if (gm.userId) {
            memberGroupMap.set(gm.userId, { groupId: g.id, groupName: g.name });
          }
        }
      }

      // Available members for new group creation (only unassigned)
      const availableForNewGroup = activeMembers.filter((m) => {
        const uid = m.userId || m.id;
        return !memberGroupMap.has(uid);
      });

      expect(availableForNewGroup.length).toBe(1);
      expect(availableForNewGroup[0].userId).toBe('user-2');
      expect(availableForNewGroup[0].user?.name).toBe('Bob');
    });
  });
});
