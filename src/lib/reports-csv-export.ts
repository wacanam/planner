import { formatDate } from './date-utils';
import type {
  CoverageTerritory,
  GroupReportStats,
  PublisherStats,
  S13AssignmentRecord,
} from '@/types/api';

/**
 * Escapes a cell value for standard CSV formatting (RFC 4180).
 */
function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Triggers a file download in the browser.
 */
export function triggerCsvDownload(filename: string, csvContent: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads the official S-13 Congregation Territory Assignment Record CSV.
 */
export function exportS13ToCSV(
  records: S13AssignmentRecord[],
  congregationName = 'Congregation',
  serviceYear?: number | 'all'
): void {
  const headers = [
    'Territory Number',
    'Territory Name',
    'Assigned To',
    'Type',
    'Service Group',
    'Service Year',
    'Date Assigned',
    'Date Due',
    'Date Returned',
    'Coverage At Assignment (%)',
    'Coverage At Return (%)',
    'Duration (Days)',
    'Status',
  ];

  const rows = records.map((r) => [
    escapeCsvCell(r.territoryNumber),
    escapeCsvCell(r.territoryName),
    escapeCsvCell(r.assigneeName),
    escapeCsvCell(r.isGroupAssignment ? 'Service Group' : 'Personal'),
    escapeCsvCell(r.groupName || '—'),
    escapeCsvCell(r.serviceYear ? `SY ${r.serviceYear}` : '—'),
    escapeCsvCell(r.assignedAt ? formatDate(r.assignedAt) : '—'),
    escapeCsvCell(r.dueAt ? formatDate(r.dueAt) : '—'),
    escapeCsvCell(r.returnedAt ? formatDate(r.returnedAt) : 'Active'),
    escapeCsvCell(r.coverageAtAssignment),
    escapeCsvCell(r.coverageAtReturn),
    escapeCsvCell(r.durationDays !== null ? r.durationDays : '—'),
    escapeCsvCell(r.status.toUpperCase()),
  ]);

  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const sySuffix = serviceYear && serviceYear !== 'all' ? `_SY${serviceYear}` : '';
  const filename = `S-13_Territory_Record_${congregationName.replace(/\s+/g, '_')}${sySuffix}_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerCsvDownload(filename, csv);
}

/**
 * Generates and downloads the Territory Coverage Breakdown CSV.
 */
export function exportCoverageToCSV(
  territories: CoverageTerritory[],
  congregationName = 'Congregation',
  serviceYear?: number | 'all'
): void {
  const headers = [
    'Territory Number',
    'Territory Name',
    'Status',
    'Coverage (%)',
    'Worked in SY',
    'Total Doors',
    'Worked Doors',
    'Unworked Doors',
    'Health Status',
    'Last Worked Date',
    'Days Since Worked',
    'Assigned To',
    'Service Group',
  ];

  const rows = territories.map((t) => [
    escapeCsvCell(t.number),
    escapeCsvCell(t.name),
    escapeCsvCell(t.status.toUpperCase()),
    escapeCsvCell(Math.round(t.coveragePercent)),
    escapeCsvCell(t.isWorkedInServiceYear ? 'Yes' : 'No'),
    escapeCsvCell(t.householdsCount),
    escapeCsvCell(t.workedDoors),
    escapeCsvCell(t.unworkedDoors),
    escapeCsvCell(t.healthStatus.toUpperCase()),
    escapeCsvCell(t.lastWorkedDate ? formatDate(t.lastWorkedDate) : 'Never'),
    escapeCsvCell(t.daysSinceWorked !== null ? t.daysSinceWorked : '—'),
    escapeCsvCell(t.publisherName || '—'),
    escapeCsvCell(t.groupName || '—'),
  ]);

  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const sySuffix = serviceYear && serviceYear !== 'all' ? `_SY${serviceYear}` : '';
  const filename = `Territory_Coverage_${congregationName.replace(/\s+/g, '_')}${sySuffix}_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerCsvDownload(filename, csv);
}

/**
 * Generates and downloads the Publisher Activity Summary CSV.
 */
export function exportPublishersToCSV(
  publishers: PublisherStats[],
  congregationName = 'Congregation'
): void {
  const headers = [
    'Publisher Name',
    'Email',
    'Congregation Role',
    'Service Group',
    'Active Territory Assignments',
    'Completed Territories Count',
    'Total Visits Logged',
    'Last Active Date',
    'Assigned Territories',
  ];

  const rows = publishers.map((p) => [
    escapeCsvCell(p.name),
    escapeCsvCell(p.email),
    escapeCsvCell(p.role || 'Publisher'),
    escapeCsvCell(p.groupName || '—'),
    escapeCsvCell(p.activeAssignments),
    escapeCsvCell(p.totalCompleted),
    escapeCsvCell(p.totalVisits),
    escapeCsvCell(p.lastActiveDate ? formatDate(p.lastActiveDate) : '—'),
    escapeCsvCell(p.territories.join('; ') || 'None'),
  ]);

  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const filename = `Publishers_Activity_${congregationName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerCsvDownload(filename, csv);
}

/**
 * Generates and downloads the Service Groups Performance CSV.
 */
export function exportGroupsToCSV(
  groups: GroupReportStats[],
  congregationName = 'Congregation'
): void {
  const headers = [
    'Service Group Name',
    'Group Overseer',
    'Assistant Overseer',
    'Publishers Count',
    'Assigned Territories Count',
    'Total Doors',
    'Worked Doors',
    'Average Coverage (%)',
    'Territories',
  ];

  const rows = groups.map((g) => [
    escapeCsvCell(g.name),
    escapeCsvCell(g.overseerName || 'Unassigned'),
    escapeCsvCell(g.assistantOverseerName || 'None'),
    escapeCsvCell(g.memberCount),
    escapeCsvCell(g.assignedTerritoriesCount),
    escapeCsvCell(g.totalDoors),
    escapeCsvCell(g.workedDoors),
    escapeCsvCell(Math.round(g.avgCoveragePercent)),
    escapeCsvCell(g.territoryNumbers.join('; ') || 'None'),
  ]);

  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const filename = `Service_Groups_Performance_${congregationName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerCsvDownload(filename, csv);
}

/**
 * Generates and downloads the Teaching & Follow-up Ministry Analytics CSV.
 */
export function exportTeachingAnalyticsToCSV(
  report: {
    totals: any;
    byGroup: any[];
    byPublisher: any[];
  },
  congregationName = 'Congregation',
  serviceYear?: number | 'all'
): void {
  const headers = [
    'Category',
    'Name',
    'Role / Group',
    'Interested Contacts',
    'RV Completed',
    'RV Missed / Overdue',
    'RV Upcoming',
    'Studies Conducted',
    'Studies Offered',
    'Studies Missed',
    'Active Studies',
  ];

  const groupRows = (report.byGroup || []).map((g) => [
    escapeCsvCell('Service Group'),
    escapeCsvCell(g.name),
    escapeCsvCell(g.overseerName ? `Overseer: ${g.overseerName}` : '—'),
    escapeCsvCell(g.metrics.interestedContacts.total),
    escapeCsvCell(g.metrics.returnVisits.visited),
    escapeCsvCell(g.metrics.returnVisits.missed),
    escapeCsvCell(g.metrics.returnVisits.upcoming),
    escapeCsvCell(g.metrics.bibleStudies.conducted),
    escapeCsvCell(g.metrics.bibleStudies.offered),
    escapeCsvCell(g.metrics.bibleStudies.missed),
    escapeCsvCell(g.metrics.bibleStudies.activeCount),
  ]);

  const publisherRows = (report.byPublisher || []).map((p) => [
    escapeCsvCell('Publisher'),
    escapeCsvCell(p.name),
    escapeCsvCell(p.groupName || p.role || '—'),
    escapeCsvCell(p.metrics.interestedContacts.total),
    escapeCsvCell(p.metrics.returnVisits.visited),
    escapeCsvCell(p.metrics.returnVisits.missed),
    escapeCsvCell(p.metrics.returnVisits.upcoming),
    escapeCsvCell(p.metrics.bibleStudies.conducted),
    escapeCsvCell(p.metrics.bibleStudies.offered),
    escapeCsvCell(p.metrics.bibleStudies.missed),
    escapeCsvCell(p.metrics.bibleStudies.activeCount),
  ]);

  const totalRow = [
    escapeCsvCell('CONGREGATION TOTAL'),
    escapeCsvCell(congregationName),
    escapeCsvCell('All Members'),
    escapeCsvCell(report.totals?.interestedContacts?.total ?? 0),
    escapeCsvCell(report.totals?.returnVisits?.visited ?? 0),
    escapeCsvCell(report.totals?.returnVisits?.missed ?? 0),
    escapeCsvCell(report.totals?.returnVisits?.upcoming ?? 0),
    escapeCsvCell(report.totals?.bibleStudies?.conducted ?? 0),
    escapeCsvCell(report.totals?.bibleStudies?.offered ?? 0),
    escapeCsvCell(report.totals?.bibleStudies?.missed ?? 0),
    escapeCsvCell(report.totals?.bibleStudies?.activeCount ?? 0),
  ];

  const allRows = [totalRow, ...groupRows, ...publisherRows];
  const csv = [headers.join(','), ...allRows.map((row) => row.join(','))].join('\r\n');
  const sySuffix = serviceYear && serviceYear !== 'all' ? `_SY${serviceYear}` : '';
  const filename = `Teaching_Ministry_Analytics_${congregationName.replace(/\s+/g, '_')}${sySuffix}_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerCsvDownload(filename, csv);
}
