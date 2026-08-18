import { describe, expect, it } from 'vitest';
import { canApproveAssignments, canEndorseAssignment } from '@/lib/permissions';
import { AssignmentStatus, EndorsementStatus, UserRole } from '@/lib/roles';
import { declineEndorsementSchema } from '@/schemas/member';
import type { Assignment } from '@/types/api';

describe('Territory Endorsements Flow & Congregation Scoping', () => {
  describe('Decline Endorsement Schema Validation', () => {
    it('requires a non-empty reason when declining an endorsement', () => {
      const emptyResult = declineEndorsementSchema.safeParse({ reason: '' });
      expect(emptyResult.success).toBe(false);

      const validResult = declineEndorsementSchema.safeParse({
        reason: 'Publisher already has 2 active territories.',
      });
      expect(validResult.success).toBe(true);
      if (validResult.success) {
        expect(validResult.data.reason).toBe('Publisher already has 2 active territories.');
      }
    });

    it('rejects reasons exceeding 500 characters', () => {
      const longReason = 'a'.repeat(501);
      const result = declineEndorsementSchema.safeParse({ reason: longReason });
      expect(result.success).toBe(false);
    });
  });

  describe('Permission Rules for Endorsements and Approvals', () => {
    it('allows Territory Servant, Service Overseer, and Admin to endorse assignments', () => {
      expect(canEndorseAssignment(UserRole.TERRITORY_SERVANT)).toBe(true);
      expect(canEndorseAssignment(UserRole.SERVICE_OVERSEER)).toBe(true);
      expect(canEndorseAssignment(UserRole.ADMIN)).toBe(true);
      expect(canEndorseAssignment(UserRole.SUPER_ADMIN)).toBe(true);
    });

    it('denies regular publishers from creating endorsements directly', () => {
      expect(canEndorseAssignment(UserRole.USER)).toBe(false);
      expect(canEndorseAssignment('PUBLISHER')).toBe(false);
      expect(canEndorseAssignment(null)).toBe(false);
    });

    it('allows only Service Overseers and Admins to approve/decline endorsements', () => {
      expect(canApproveAssignments(UserRole.SERVICE_OVERSEER)).toBe(true);
      expect(canApproveAssignments(UserRole.ADMIN)).toBe(true);
      expect(canApproveAssignments(UserRole.SUPER_ADMIN)).toBe(true);
    });

    it('denies regular publishers and territory servants from approving/declining endorsements', () => {
      expect(canApproveAssignments(UserRole.TERRITORY_SERVANT)).toBe(false);
      expect(canApproveAssignments(UserRole.USER)).toBe(false);
      expect(canApproveAssignments(null)).toBe(false);
    });
  });

  describe('Assignment & Endorsement Data Structure', () => {
    it('contains all required fields for congregation-scoped endorsement with endorser and decliner info', () => {
      const pendingAssignment: Assignment = {
        id: 'assign-1',
        territoryId: 't-101',
        congregationId: 'cong-alpha',
        territoryNumber: '101',
        territoryName: 'Downtown North',
        userId: 'pub-1',
        serviceGroupId: null,
        status: AssignmentStatus.PENDING_APPROVAL,
        endorsementStatus: EndorsementStatus.PENDING_APPROVAL,
        endorsedBy: 'servant-1',
        endorsedByName: 'Brother Servant',
        endorsedAt: '2026-08-18T10:00:00Z',
        approvedBy: null,
        approvedByName: null,
        approvedAt: null,
        rejectedBy: null,
        rejectedByName: null,
        rejectedAt: null,
        rejectionReason: null,
        assignedAt: '2026-08-18T10:00:00Z',
        dueAt: null,
        returnedAt: null,
        notes: 'Priority campaign territory',
        coverageAtAssignment: '0',
        createdAt: '2026-08-18T10:00:00Z',
        assigneeName: 'John Publisher',
        assigneeEmail: 'john@example.com',
        groupName: null,
      };

      expect(pendingAssignment.congregationId).toBe('cong-alpha');
      expect(pendingAssignment.endorsedByName).toBe('Brother Servant');
      expect(pendingAssignment.endorsementStatus).toBe('pending_approval');
      expect(pendingAssignment.rejectionReason).toBeNull();
    });

    it('records decline metadata and reason when an endorsement is declined', () => {
      const declinedAssignment: Assignment = {
        id: 'assign-1',
        territoryId: 't-101',
        congregationId: 'cong-alpha',
        territoryNumber: '101',
        territoryName: 'Downtown North',
        userId: 'pub-1',
        serviceGroupId: null,
        status: AssignmentStatus.REJECTED,
        endorsementStatus: EndorsementStatus.REJECTED,
        endorsedBy: 'servant-1',
        endorsedByName: 'Brother Servant',
        endorsedAt: '2026-08-18T10:00:00Z',
        approvedBy: null,
        approvedByName: null,
        approvedAt: null,
        rejectedBy: 'overseer-1',
        rejectedByName: 'Brother Overseer',
        rejectedAt: '2026-08-18T11:00:00Z',
        rejectionReason: 'Territory reserved for special weekend campaign.',
        assignedAt: '2026-08-18T10:00:00Z',
        dueAt: null,
        returnedAt: null,
        notes: null,
        coverageAtAssignment: '0',
        createdAt: '2026-08-18T10:00:00Z',
        assigneeName: 'John Publisher',
        assigneeEmail: 'john@example.com',
        groupName: null,
      };

      expect(declinedAssignment.status).toBe(AssignmentStatus.REJECTED);
      expect(declinedAssignment.endorsementStatus).toBe(EndorsementStatus.REJECTED);
      expect(declinedAssignment.rejectedByName).toBe('Brother Overseer');
      expect(declinedAssignment.rejectionReason).toBe(
        'Territory reserved for special weekend campaign.'
      );
    });

    it('properly filters assignments by congregation ID', () => {
      const allAssignments: Assignment[] = [
        {
          id: '1',
          territoryId: 't-1',
          congregationId: 'cong-A',
          userId: 'u-1',
          serviceGroupId: null,
          status: AssignmentStatus.PENDING_APPROVAL,
          endorsementStatus: EndorsementStatus.PENDING_APPROVAL,
          assignedAt: '2026-08-18T10:00:00Z',
          dueAt: null,
          returnedAt: null,
          notes: null,
          coverageAtAssignment: '0',
          createdAt: '2026-08-18T10:00:00Z',
          assigneeName: 'Pub A',
          assigneeEmail: null,
          groupName: null,
        },
        {
          id: '2',
          territoryId: 't-2',
          congregationId: 'cong-B',
          userId: 'u-2',
          serviceGroupId: null,
          status: AssignmentStatus.PENDING_APPROVAL,
          endorsementStatus: EndorsementStatus.PENDING_APPROVAL,
          assignedAt: '2026-08-18T10:00:00Z',
          dueAt: null,
          returnedAt: null,
          notes: null,
          coverageAtAssignment: '0',
          createdAt: '2026-08-18T10:00:00Z',
          assigneeName: 'Pub B',
          assigneeEmail: null,
          groupName: null,
        },
      ];

      const congAAssignments = allAssignments.filter(
        (a) =>
          a.congregationId === 'cong-A' &&
          a.endorsementStatus === EndorsementStatus.PENDING_APPROVAL
      );
      expect(congAAssignments).toHaveLength(1);
      expect(congAAssignments[0].assigneeName).toBe('Pub A');

      const congBAssignments = allAssignments.filter(
        (a) =>
          a.congregationId === 'cong-B' &&
          a.endorsementStatus === EndorsementStatus.PENDING_APPROVAL
      );
      expect(congBAssignments).toHaveLength(1);
      expect(congBAssignments[0].assigneeName).toBe('Pub B');
    });
  });
});
