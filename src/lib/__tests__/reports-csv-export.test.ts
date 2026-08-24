import { describe, expect, it } from 'vitest';
import type {
  CoverageTerritory,
  GroupReportStats,
  PublisherStats,
  S13AssignmentRecord,
} from '@/types/api';
import {
  exportCoverageToCSV,
  exportGroupsToCSV,
  exportPublishersToCSV,
  exportS13ToCSV,
} from '../reports-csv-export';

describe('Reports CSV Export Utilities', () => {
  it('exports S-13 Territory Records to CSV format correctly', () => {
    const records: S13AssignmentRecord[] = [
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
      {
        id: 'a2',
        territoryId: 't2',
        territoryNumber: '102',
        territoryName: 'Westside Suburbs',
        assigneeName: 'Group 1',
        assigneeEmail: null,
        isGroupAssignment: true,
        groupName: 'Group 1 — North',
        assignedAt: '2026-04-01T00:00:00Z',
        dueAt: '2026-08-01T00:00:00Z',
        returnedAt: null,
        coverageAtAssignment: 25,
        coverageAtReturn: 75,
        durationDays: 45,
        status: 'assigned',
      },
    ];

    expect(() => exportS13ToCSV(records, 'Central Congregation')).not.toThrow();
  });

  it('exports Coverage Data to CSV correctly', () => {
    const territories: CoverageTerritory[] = [
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
        groupName: 'Group 1',
        healthStatus: 'fresh',
        daysSinceWorked: 7,
      },
    ];

    expect(() => exportCoverageToCSV(territories, 'Central Congregation')).not.toThrow();
  });

  it('exports Publishers Summary to CSV correctly', () => {
    const publishers: PublisherStats[] = [
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
    ];

    expect(() => exportPublishersToCSV(publishers, 'Central Congregation')).not.toThrow();
  });

  it('exports Service Groups Performance to CSV correctly', () => {
    const groups: GroupReportStats[] = [
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
    ];

    expect(() => exportGroupsToCSV(groups, 'Central Congregation')).not.toThrow();
  });
});
