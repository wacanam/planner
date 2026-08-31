import { describe, expect, it } from 'vitest';
import {
  calculateMinistryTeachingMetrics,
  buildTeachingAnalyticsReport,
  isInterestedContact,
} from '@/lib/teaching-metrics';
import type { Encounter, Group, Household, Member, Visit } from '@/types/api';

describe('teaching-metrics', () => {
  describe('isInterestedContact', () => {
    it('returns true for receptive or study accepted encounters', () => {
      expect(isInterestedContact({ response: 'receptive' } as any)).toBe(true);
      expect(isInterestedContact({ response: 'study_accepted' } as any)).toBe(true);
      expect(isInterestedContact({ response: 'study_offered' } as any)).toBe(true);
      expect(isInterestedContact({ bibleStudyInterest: true } as any)).toBe(true);
      expect(isInterestedContact({ returnVisitRequested: true } as any)).toBe(true);
    });

    it('returns false for not_home, busy, moved, or do_not_visit', () => {
      expect(isInterestedContact({ response: 'not_home' } as any)).toBe(false);
      expect(isInterestedContact({ response: 'busy' } as any)).toBe(false);
      expect(isInterestedContact({ response: 'moved' } as any)).toBe(false);
      expect(isInterestedContact({ response: 'do_not_visit' } as any)).toBe(false);
    });
  });

  describe('calculateMinistryTeachingMetrics', () => {
    it('returns 0 for empty arrays', () => {
      const metrics = calculateMinistryTeachingMetrics([], [], []);
      expect(metrics.interestedContacts.total).toBe(0);
      expect(metrics.returnVisits.visited).toBe(0);
      expect(metrics.returnVisits.missed).toBe(0);
      expect(metrics.bibleStudies.conducted).toBe(0);
      expect(metrics.bibleStudies.offered).toBe(0);
      expect(metrics.bibleStudies.activeCount).toBe(0);
    });

    it('counts interested contacts from households and encounters', () => {
      const households: Partial<Household>[] = [
        { id: 'h1', address: 'Door 1', status: 'return_visit' },
        { id: 'h2', address: 'Door 2', status: 'active', notes: 'Study interest' },
        { id: 'h3', address: 'Door 3', status: 'not_home' },
      ];
      const encounters: Partial<Encounter>[] = [
        { id: 'e1', name: 'Alice', response: 'receptive', householdId: 'h1' },
        { id: 'e2', name: 'Bob', bibleStudyInterest: true, householdId: 'h4' },
      ];

      const metrics = calculateMinistryTeachingMetrics(
        households as Household[],
        [],
        encounters as Encounter[]
      );

      expect(metrics.interestedContacts.total).toBe(3);
      expect(metrics.interestedContacts.studyInterested).toBe(2);
    });

    it('correctly tracks return visits and missed appointments', () => {
      const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

      const visits: Partial<Visit>[] = [
        // 1. Explicit completed return visit
        { id: 'v1', householdId: 'h1', outcome: 'return_visit', visitDate: '2026-08-10' },
        // 2. Explicit missed return visit
        { id: 'v2', householdId: 'h2', outcome: 'return_visit_missed', visitDate: '2026-08-11' },
        // 3. Overdue visit without subsequent visit
        {
          id: 'v3',
          householdId: 'h3',
          outcome: 'answered',
          nextVisitDate: pastDate,
          scheduledAppointmentType: 'return_visit',
          visitDate: '2026-08-01',
        },
        // 4. Upcoming scheduled visit
        {
          id: 'v4',
          householdId: 'h4',
          outcome: 'answered',
          nextVisitDate: futureDate,
          returnVisitPlanned: true,
          visitDate: '2026-08-15',
        },
      ];

      const households: Partial<Household>[] = [
        { id: 'h1', lastVisitDate: '2026-08-10' },
        { id: 'h2', lastVisitDate: '2026-08-11' },
        { id: 'h3', lastVisitDate: '2026-08-01' }, // didn't visit after nextVisitDate -> overdue
        { id: 'h4', lastVisitDate: '2026-08-15' },
      ];

      const metrics = calculateMinistryTeachingMetrics(
        households as Household[],
        visits as Visit[],
        []
      );

      expect(metrics.returnVisits.visited).toBe(1);
      expect(metrics.returnVisits.missed).toBe(2); // 1 explicit + 1 overdue
      expect(metrics.returnVisits.upcoming).toBe(1);
    });

    it('tracks Bible studies conducted, offered, missed, and active pipeline', () => {
      const visits: Partial<Visit>[] = [
        { id: 'v1', householdId: 'h1', outcome: 'study_conducted', visitDate: '2026-08-10' },
        { id: 'v2', householdId: 'h2', outcome: 'study_offered', visitDate: '2026-08-11' },
        { id: 'v3', householdId: 'h3', outcome: 'study_missed', visitDate: '2026-08-12' },
      ];

      const households: Partial<Household>[] = [
        { id: 'h1', status: 'return_visit', notes: 'Active Bible study in lesson 3' },
        { id: 'h2', status: 'return_visit' },
      ];

      const encounters: Partial<Encounter>[] = [
        { id: 'e1', name: 'Charlie', bibleStudyPublication: 'Enjoy Life Forever', bibleStudyInterest: true },
      ];

      const metrics = calculateMinistryTeachingMetrics(
        households as Household[],
        visits as Visit[],
        encounters as Encounter[]
      );

      expect(metrics.bibleStudies.conducted).toBe(1);
      expect(metrics.bibleStudies.offered).toBe(1);
      expect(metrics.bibleStudies.missed).toBe(1);
      expect(metrics.bibleStudies.activeCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('buildTeachingAnalyticsReport', () => {
    it('aggregates totals across service groups and publishers', () => {
      const groups: Partial<Group>[] = [
        { id: 'g1', name: 'Group 1', overseerName: 'Brother Alpha' },
        { id: 'g2', name: 'Group 2', overseerName: 'Brother Beta' },
      ];

      const members: Partial<Member>[] = [
        { id: 'm1', userId: 'u1', groupId: 'g1', user: { id: 'u1', name: 'Alice', email: 'alice@example.com', role: 'publisher' } },
        { id: 'm2', userId: 'u2', groupId: 'g2', user: { id: 'u2', name: 'Bob', email: 'bob@example.com', role: 'publisher' } },
      ];

      const households: Partial<Household>[] = [
        { id: 'h1', territoryId: 't1', status: 'return_visit' },
        { id: 'h2', territoryId: 't2', status: 'return_visit', notes: 'Study conducted' },
      ];

      const visits: Partial<Visit>[] = [
        {
          id: 'v1',
          userId: 'u1',
          householdId: 'h1',
          outcome: 'return_visit',
          visitDate: '2026-08-10',
        },
        {
          id: 'v2',
          userId: 'u2',
          householdId: 'h2',
          outcome: 'study_conducted',
          visitDate: '2026-08-12',
        },
      ];

      const report = buildTeachingAnalyticsReport(
        households as Household[],
        visits as Visit[],
        [],
        groups as Group[],
        members as Member[]
      );

      expect(report.totals.returnVisits.visited).toBe(1);
      expect(report.totals.bibleStudies.conducted).toBe(1);
      expect(report.byGroup.length).toBe(2);
      expect(report.byPublisher.length).toBe(2);

      const g1 = report.byGroup.find((g) => g.groupId === 'g1');
      expect(g1?.metrics.returnVisits.visited).toBe(1);

      const u2 = report.byPublisher.find((p) => p.userId === 'u2');
      expect(u2?.metrics.bibleStudies.conducted).toBe(1);
    });
  });
});
