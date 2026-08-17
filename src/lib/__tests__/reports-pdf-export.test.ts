import { describe, expect, it } from 'vitest';
import { exportS13ToPDF } from '../s13-pdf-export';
import type { S13AssignmentRecord } from '@/types/api';

describe('S-13 PDF Export Utility', () => {
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
      groupName: i % 3 === 0 ? `Service Group ${((i % 4) + 1)}` : null,
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
});
