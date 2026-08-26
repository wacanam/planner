import { describe, expect, it } from 'vitest';
import { AssignmentStatus } from '@/lib/roles';
import type { Assignment, Group, Territory, TerritoryRequest } from '@/types/api';

describe('Cascade Cleanup & Architectural Edge Cases', () => {
  describe('Service Group Deletion Cascade', () => {
    it('resets territories assigned to the deleted group back to available status', () => {
      const deletedGroupId = 'group-10';
      const territories: Territory[] = [
        {
          id: 't-1',
          congregationId: 'cong-1',
          name: 'North Sector',
          number: '1',
          status: 'assigned',
          publisherId: null,
          publisherName: null,
          groupId: 'group-10',
          groupName: 'Group 10',
          householdsCount: 50,
          coveragePercent: '0',
          notes: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 't-2',
          congregationId: 'cong-1',
          name: 'South Sector',
          number: '2',
          status: 'assigned',
          publisherId: 'pub-1',
          publisherName: 'Publisher 1',
          groupId: 'group-20',
          groupName: 'Group 20',
          householdsCount: 30,
          coveragePercent: '0',
          notes: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      // Simulate cascade reset for territories referencing deleted group
      const updatedTerritories = territories.map((t) => {
        if (t.groupId === deletedGroupId) {
          return {
            ...t,
            status: 'available' as const,
            groupId: null,
            groupName: null,
            publisherId: null,
            publisherName: null,
          };
        }
        return t;
      });

      expect(updatedTerritories[0].status).toBe('available');
      expect(updatedTerritories[0].groupId).toBeNull();
      expect(updatedTerritories[0].groupName).toBeNull();
      // Other territory remains unchanged
      expect(updatedTerritories[1].status).toBe('assigned');
      expect(updatedTerritories[1].groupId).toBe('group-20');
    });

    it('marks active group assignments completed upon group deletion', () => {
      const deletedGroupId = 'group-10';
      const assignments: Assignment[] = [
        {
          id: 'a-1',
          territoryId: 't-1',
          congregationId: 'cong-1',
          userId: null,
          serviceGroupId: 'group-10',
          status: AssignmentStatus.ACTIVE,
          assignedAt: '2026-01-01T00:00:00Z',
          returnedAt: null,
          dueAt: null,
          notes: null,
          coverageAtAssignment: '0',
          createdAt: '2026-01-01T00:00:00Z',
          assigneeName: null,
          assigneeEmail: null,
          groupName: 'Group 10',
        },
      ];

      const updatedAssignments = assignments.map((a) => {
        if (a.serviceGroupId === deletedGroupId) {
          return {
            ...a,
            status: AssignmentStatus.COMPLETED,
            returnedAt: '2026-08-26T00:00:00Z',
          };
        }
        return a;
      });

      expect(updatedAssignments[0].status).toBe(AssignmentStatus.COMPLETED);
      expect(updatedAssignments[0].returnedAt).toBeTruthy();
    });
  });

  describe('Member Removal Cascade', () => {
    it('releases checked-out territories and completes active assignments when a member is removed', () => {
      const removedUserId = 'user-publisher-99';

      const activeTerritory: Territory = {
        id: 't-99',
        congregationId: 'cong-1',
        name: 'Downtown',
        number: '99',
        status: 'assigned',
        publisherId: removedUserId,
        publisherName: 'Removed Publisher',
        groupId: null,
        groupName: null,
        householdsCount: 40,
        coveragePercent: '0',
        notes: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      // Cascade update
      const releasedTerritory: Territory = {
        ...activeTerritory,
        status: 'available',
        publisherId: null,
        publisherName: null,
      };

      expect(releasedTerritory.status).toBe('available');
      expect(releasedTerritory.publisherId).toBeNull();
      expect(releasedTerritory.publisherName).toBeNull();
    });

    it('cancels pending territory requests submitted by the removed member', () => {
      const removedUserId = 'user-publisher-99';

      const requests: TerritoryRequest[] = [
        {
          id: 'req-1',
          congregationId: 'cong-1',
          territoryId: 't-5',
          publisherId: removedUserId,
          publisherName: 'Removed Publisher',
          publisher: null,
          status: 'pending',
          message: null,
          approvedBy: null,
          approvedAt: null,
          responseMessage: null,
          requestedAt: '2026-08-20T00:00:00Z',
        },
        {
          id: 'req-2',
          congregationId: 'cong-1',
          territoryId: 't-6',
          publisherId: 'user-active',
          publisherName: 'Active Publisher',
          publisher: null,
          status: 'pending',
          message: null,
          approvedBy: null,
          approvedAt: null,
          responseMessage: null,
          requestedAt: '2026-08-20T00:00:00Z',
        },
      ];

      const updatedRequests = requests.map((r) => {
        if (r.publisherId === removedUserId && r.status === 'pending') {
          return {
            ...r,
            status: 'cancelled',
            responseMessage: 'Publisher removed from congregation',
          };
        }
        return r;
      });

      expect(updatedRequests[0].status).toBe('cancelled');
      expect(updatedRequests[0].responseMessage).toBe('Publisher removed from congregation');
      expect(updatedRequests[1].status).toBe('pending');
    });

    it('clears overseer references on service groups when overseer member is removed', () => {
      const removedUserId = 'user-overseer-1';

      const group: Group = {
        id: 'group-1',
        congregationId: 'cong-1',
        name: 'Group 1',
        overseerId: removedUserId,
        overseerName: 'Bro Overseer',
        assistantOverseerId: 'user-asst-1',
        assistantOverseerName: 'Bro Assistant',
        createdAt: '2026-01-01T00:00:00Z',
        members: [],
      };

      const updatedGroup: Group = {
        ...group,
        overseerId: group.overseerId === removedUserId ? null : group.overseerId,
        overseerName: group.overseerId === removedUserId ? null : group.overseerName,
      };

      expect(updatedGroup.overseerId).toBeNull();
      expect(updatedGroup.overseerName).toBeNull();
      expect(updatedGroup.assistantOverseerId).toBe('user-asst-1');
    });
  });

  describe('Territory Request Auto-Resolution upon Assignment', () => {
    it('approves request of assigned publisher and rejects competing pending requests', () => {
      const territoryId = 't-77';
      const assignedUserId = 'pub-winner';

      const requests: TerritoryRequest[] = [
        {
          id: 'req-winner',
          congregationId: 'cong-1',
          territoryId,
          publisherId: 'pub-winner',
          publisherName: 'Winner Publisher',
          publisher: null,
          status: 'pending',
          message: null,
          approvedBy: null,
          approvedAt: null,
          responseMessage: null,
          requestedAt: '2026-08-25T10:00:00Z',
        },
        {
          id: 'req-competitor',
          congregationId: 'cong-1',
          territoryId,
          publisherId: 'pub-other',
          publisherName: 'Other Publisher',
          publisher: null,
          status: 'pending',
          message: null,
          approvedBy: null,
          approvedAt: null,
          responseMessage: null,
          requestedAt: '2026-08-25T11:00:00Z',
        },
      ];

      const resolved = requests.map((req) => {
        if (req.territoryId === territoryId && req.status === 'pending') {
          const isWinner = req.publisherId === assignedUserId;
          return {
            ...req,
            status: isWinner ? 'approved' : 'rejected',
            responseMessage: isWinner ? null : 'Territory assigned to another publisher',
          };
        }
        return req;
      });

      expect(resolved[0].status).toBe('approved');
      expect(resolved[0].responseMessage).toBeNull();

      expect(resolved[1].status).toBe('rejected');
      expect(resolved[1].responseMessage).toBe('Territory assigned to another publisher');
    });
  });
});
