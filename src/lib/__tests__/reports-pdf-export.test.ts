import { describe, expect, it } from 'vitest';
import { exportFullCongregationReportPDF } from '../full-report-pdf-export';
import { exportS13ToPDF } from '../s13-pdf-export';
import type { S13AssignmentRecord } from '@/types/api';

describe('PDF Export Utilities', () => {
  it('generates official S-13 PDF without throwing errors', () => {
    const mockRecords: S13AssignmentRecord[] = [
      {
        id: 'a1',
        territoryId: 't1',
        territoryNumber: '101',
        territoryName: 'Downtown North Boulevard',
        assigneeName: 'Bro. John Doe',
        assigneeEmail: 'john@example.com',
        isGroupAssignment: false,
        groupName: null,
        assignedAt: '2026-01-15T00:00:00Z',
        dueAt: '2026-05-15T00:00:00Z',
        returnedAt: '2026-03-20T00:00:00Z',
        coverageAtAssignment: 0,
        coverageAtReturn: 100,
        durationDays: 64,
        status: 'completed',
      },
      {
        id: 'a2',
        territoryId: 't2',
        territoryNumber: '102',
        territoryName: 'Westside Heights',
        assigneeName: 'Group 1',
        assigneeEmail: null,
        isGroupAssignment: true,
        groupName: 'Group 1 — North',
        assignedAt: '2026-04-01T00:00:00Z',
        dueAt: '2026-08-01T00:00:00Z',
        returnedAt: null,
        coverageAtAssignment: 20,
        coverageAtReturn: 65,
        durationDays: 45,
        status: 'assigned',
      },
    ];

    expect(() => exportS13ToPDF(mockRecords, 'Central Congregation')).not.toThrow();
  });

  it('handles multi-page assignments with empty or large record sets', () => {
    const records: S13AssignmentRecord[] = Array.from({ length: 45 }, (_, i) => ({
      id: `rec-${i}`,
      territoryId: `t-${i}`,
      territoryNumber: `${100 + i}`,
      territoryName: `Territory Area Number ${i + 1}`,
      assigneeName: `Publisher Name ${i + 1}`,
      assigneeEmail: `publisher${i}@example.com`,
      isGroupAssignment: i % 3 === 0,
      groupName: i % 3 === 0 ? `Service Group ${(i % 4) + 1}` : null,
      assignedAt: '2026-01-10T00:00:00Z',
      dueAt: '2026-05-10T00:00:00Z',
      returnedAt: i % 2 === 0 ? '2026-03-15T00:00:00Z' : null,
      coverageAtAssignment: 0,
      coverageAtReturn: 80,
      durationDays: 64,
      status: i % 2 === 0 ? 'completed' : 'assigned',
    }));

    expect(() => exportS13ToPDF(records, 'South Congregation')).not.toThrow();
  });

  it('generates full multi-page congregation report PDF with page breaks without throwing errors', () => {
    const result = exportFullCongregationReportPDF({
      congregationName: 'Central Congregation',
      coverageData: {
        totalTerritories: 15,
        avgCoveragePercent: 72,
        totalDoors: 1450,
        workedDoors: 1044,
        unworkedDoors: 406,
        activeAssignmentRate: 80,
        avgTurnaroundDays: 42,
        byStatus: { available: 3, assigned: 10, completed: 2, archived: 0 },
        byHealth: { fresh: 8, active: 4, dormant: 2, stale: 1 },
        territories: [
          {
            id: 't1',
            number: '101',
            name: 'Downtown North',
            status: 'assigned',
            coveragePercent: 85,
            householdsCount: 120,
            workedDoors: 102,
            unworkedDoors: 18,
            lastWorkedDate: '2026-08-10T00:00:00Z',
            assignedAt: '2026-07-01T00:00:00Z',
            publisherName: 'Bro. John Doe',
            healthStatus: 'fresh',
            daysSinceWorked: 7,
          },
        ],
      },
      s13Records: [
        {
          id: 'a1',
          territoryId: 't1',
          territoryNumber: '101',
          territoryName: 'Downtown North',
          assigneeName: 'Bro. John Doe',
          assigneeEmail: 'john@example.com',
          isGroupAssignment: false,
          groupName: null,
          assignedAt: '2026-01-15T00:00:00Z',
          dueAt: '2026-05-15T00:00:00Z',
          returnedAt: '2026-03-20T00:00:00Z',
          coverageAtAssignment: 0,
          coverageAtReturn: 100,
          durationDays: 64,
          status: 'completed',
        },
      ],
      groupsData: [
        {
          groupId: 'g1',
          name: 'Group 1 — North',
          overseerName: 'Bro. John Doe',
          assistantOverseerName: 'Bro. James Smith',
          memberCount: 12,
          assignedTerritoriesCount: 3,
          totalDoors: 350,
          workedDoors: 280,
          avgCoveragePercent: 80,
          territoryNumbers: ['#101', '#102', '#103'],
        },
      ],
      publishersData: [
        {
          userId: 'u1',
          name: 'Bro. John Doe',
          email: 'john@example.com',
          role: 'SERVICE_OVERSEER',
          groupName: 'Group 1',
          activeAssignments: 2,
          totalCompleted: 5,
          totalVisits: 48,
          lastActiveDate: '2026-08-15T00:00:00Z',
          territories: ['#101 Downtown North'],
        },
      ],
      doorData: {
        totalDoors: 1450,
        workedDoors: 1044,
        unworkedDoors: 406,
        doNotCallCount: 8,
        returnVisitsCount: 34,
        outcomeCounts: {
          notHome: 450,
          contacted: 400,
          placedLiterature: 120,
          returnVisit: 34,
          busy: 32,
          doNotCall: 8,
          other: 0,
        },
        topStreets: [{ streetName: 'Main Street', doorsCount: 120, workedCount: 100 }],
      },
      activityData: {
        assignments: [
          {
            id: 'act1',
            territoryName: 'Downtown North',
            territoryNumber: '101',
            publisherName: 'Bro. John Doe',
            assignedAt: '2026-08-01T00:00:00Z',
          },
        ],
        returns: [],
      },
    });

    expect(result).toBeDefined();
  });
});
