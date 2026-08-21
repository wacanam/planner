import { jsPDF } from 'jspdf';
import type {
  ActivityReport,
  CoverageReport,
  DoorAnalyticsReport,
  GroupReportStats,
  PublisherStats,
  S13AssignmentRecord,
} from '@/types/api';

export interface FullReportExportData {
  congregationName: string;
  coverageData?: CoverageReport | null;
  s13Records?: S13AssignmentRecord[];
  groupsData?: GroupReportStats[];
  publishersData?: PublisherStats[];
  doorData?: DoorAnalyticsReport | null;
  activityData?: ActivityReport | null;
}

/**
 * Generates a comprehensive, multi-page Congregation Analytics & S-13 PDF report
 * with explicit page breaks between major sections and direct browser download.
 */
export function exportFullCongregationReportPDF(data: FullReportExportData): jsPDF {
  const {
    congregationName = 'Congregation',
    coverageData,
    s13Records = [],
    groupsData = [],
    publishersData = [],
    doorData,
    activityData,
  } = data;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const marginLeft = 14;
  const marginRight = 14;
  const marginTop = 14;
  const marginBottom = 14;
  const contentWidth = pageWidth - marginLeft - marginRight; // 269mm

  const totalPages = 0;

  const drawPageFooter = (pageNum: number, totalExpected: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate-400

    const footerY = pageHeight - 7;
    doc.text(
      `Kanataran • Congregation Ministry Intelligence Report • ${congregationName}`,
      marginLeft,
      footerY
    );
    doc.text(`Page ${pageNum}`, marginLeft + contentWidth, footerY, { align: 'right' });
  };

  const drawSectionHeader = (title: string, subtitle: string, tag?: string) => {
    // Slate background banner
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(marginLeft, marginTop, contentWidth, 16, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(title, marginLeft + 6, marginTop + 6.5);

    // Tag (optional)
    if (tag) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(tag, marginLeft + contentWidth - 6, marginTop + 6.5, { align: 'right' });
    }

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(subtitle, marginLeft + 6, marginTop + 12);
  };

  // =========================================================================
  // PAGE 1: EXECUTIVE OVERVIEW & TERRITORY HEALTH
  // =========================================================================
  let pageNumber = 1;

  drawSectionHeader(
    'CONGREGATION EXECUTIVE OVERVIEW & TERRITORY HEALTH',
    `Congregation: ${congregationName}   •   Generated: ${new Date().toLocaleDateString()}`,
    'EXECUTIVE SUMMARY'
  );

  let currentY = marginTop + 21;

  // 4 KPI Summary Cards (Clean pure white background with slate border)
  const kpiWidth = (contentWidth - 9) / 4; // ~64.5mm each
  const kpiHeight = 22;

  // Helper to draw clean white card container
  const drawKpiCardContainer = (x: number, y: number, w: number, h: number) => {
    doc.setFillColor(255, 255, 255); // Pure white card
    doc.setDrawColor(203, 213, 225); // Slate-300 border
    doc.setLineWidth(0.35);
    doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  };

  // KPI 1: Live Coverage
  drawKpiCardContainer(marginLeft, currentY, kpiWidth, kpiHeight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text('TOTAL COVERAGE', marginLeft + 4, currentY + 5.5);
  doc.setFontSize(14);
  doc.setTextColor(29, 78, 216); // High-contrast Blue-700
  doc.text(`${coverageData?.avgCoveragePercent ?? 0}%`, marginLeft + 4, currentY + 13);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(
    `${coverageData?.workedDoors ?? 0} / ${coverageData?.totalDoors ?? 0} doors worked`,
    marginLeft + 4,
    currentY + 18
  );

  // KPI 2: Active Rotation
  const kpi2X = marginLeft + kpiWidth + 3;
  drawKpiCardContainer(kpi2X, currentY, kpiWidth, kpiHeight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text('ACTIVE ROTATION RATE', kpi2X + 4, currentY + 5.5);
  doc.setFontSize(14);
  doc.setTextColor(4, 120, 87); // High-contrast Emerald-700
  doc.text(`${coverageData?.activeAssignmentRate ?? 0}%`, kpi2X + 4, currentY + 13);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(
    `${coverageData?.byStatus.assigned ?? 0} territories assigned`,
    kpi2X + 4,
    currentY + 18
  );

  // KPI 3: Avg Turnaround
  const kpi3X = kpi2X + kpiWidth + 3;
  drawKpiCardContainer(kpi3X, currentY, kpiWidth, kpiHeight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text('AVG TURNAROUND', kpi3X + 4, currentY + 5.5);
  doc.setFontSize(14);
  doc.setTextColor(180, 83, 9); // High-contrast Amber-700
  doc.text(`${coverageData?.avgTurnaroundDays ?? 45} Days`, kpi3X + 4, currentY + 13);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text('Target cycle: ~60-90 days', kpi3X + 4, currentY + 18);

  // KPI 4: Health Recency
  const kpi4X = kpi3X + kpiWidth + 3;
  drawKpiCardContainer(kpi4X, currentY, kpiWidth, kpiHeight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text('TERRITORY HEALTH INDEX', kpi4X + 4, currentY + 5.5);
  doc.setFontSize(10);
  doc.setTextColor(4, 120, 87); // Emerald-700
  doc.text(`${coverageData?.byHealth.fresh ?? 0} Fresh`, kpi4X + 4, currentY + 12);
  doc.setTextColor(29, 78, 216); // Blue-700
  doc.text(`• ${coverageData?.byHealth.active ?? 0} Active`, kpi4X + 22, currentY + 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(190, 18, 60); // Rose-700
  doc.text(
    `${coverageData?.byHealth.stale ?? 0} Stale / Overdue (>180d)`,
    kpi4X + 4,
    currentY + 18
  );

  currentY += kpiHeight + 6;

  // Territory Completion Table Header on Page 1
  doc.setFillColor(51, 65, 85);
  doc.rect(marginLeft, currentY, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Terr. #', marginLeft + 3, currentY + 4.8);
  doc.text('Territory Name', marginLeft + 24, currentY + 4.8);
  doc.text('Status', marginLeft + 85, currentY + 4.8);
  doc.text('Health', marginLeft + 115, currentY + 4.8);
  doc.text('Doors', marginLeft + 145, currentY + 4.8, { align: 'center' });
  doc.text('Coverage %', marginLeft + 175, currentY + 4.8, { align: 'center' });
  doc.text('Assigned To', marginLeft + 200, currentY + 4.8);
  doc.text('Last Worked', marginLeft + contentWidth - 4, currentY + 4.8, { align: 'right' });

  currentY += 7;

  const territoriesList = coverageData?.territories || [];
  const maxRowsPage1 = 15;
  const page1Rows = territoriesList.slice(0, maxRowsPage1);

  page1Rows.forEach((t, i) => {
    const isEven = i % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(marginLeft, currentY, contentWidth, 6.2, 'F');

    doc.setDrawColor(226, 232, 240);
    doc.line(marginLeft, currentY + 6.2, marginLeft + contentWidth, currentY + 6.2);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`#${t.number}`, marginLeft + 3, currentY + 4.2);

    doc.setFont('helvetica', 'normal');
    const nameStr = t.name.length > 30 ? `${t.name.slice(0, 28)}…` : t.name;
    doc.text(nameStr, marginLeft + 24, currentY + 4.2);

    doc.setTextColor(100, 116, 139);
    doc.text(t.status.toUpperCase(), marginLeft + 85, currentY + 4.2);

    // Health text with color
    if (t.healthStatus === 'fresh') {
      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
    } else if (t.healthStatus === 'active') {
      doc.setTextColor(37, 99, 235);
      doc.setFont('helvetica', 'bold');
    } else if (t.healthStatus === 'dormant') {
      doc.setTextColor(245, 158, 11);
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setTextColor(225, 29, 72);
      doc.setFont('helvetica', 'bold');
    }
    doc.text(t.healthStatus.toUpperCase(), marginLeft + 115, currentY + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`${t.workedDoors}/${t.householdsCount}`, marginLeft + 145, currentY + 4.2, {
      align: 'center',
    });

    doc.setFont('helvetica', 'bold');
    doc.text(`${Math.round(t.coveragePercent)}%`, marginLeft + 175, currentY + 4.2, {
      align: 'center',
    });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const assignee = t.publisherName || t.groupName || '—';
    doc.text(
      assignee.length > 25 ? `${assignee.slice(0, 23)}…` : assignee,
      marginLeft + 200,
      currentY + 4.2
    );

    const workedStr = t.daysSinceWorked !== null ? `${t.daysSinceWorked}d ago` : 'Never';
    doc.text(workedStr, marginLeft + contentWidth - 4, currentY + 4.2, { align: 'right' });

    currentY += 6.2;
  });

  drawPageFooter(pageNumber, '3+');

  // =========================================================================
  // PAGE 2: OFFICIAL S-13 CONGREGATION TERRITORY RECORD (PAGE BREAK)
  // =========================================================================
  doc.addPage();
  pageNumber++;
  currentY = marginTop;

  drawSectionHeader(
    'OFFICIAL S-13 CONGREGATION TERRITORY ASSIGNMENT RECORD',
    `Congregation: ${congregationName}   •   Total Records: ${s13Records.length}`,
    'FORM S-13 (8/19)'
  );

  currentY += 21;

  // S-13 Columns
  const s13Columns = [
    { header: 'Terr. #', width: 20, align: 'left' },
    { header: 'Territory Name / Locality', width: 55, align: 'left' },
    { header: 'Assigned To', width: 58, align: 'left' },
    { header: 'Type', width: 22, align: 'center' },
    { header: 'Date Assigned', width: 25, align: 'center' },
    { header: 'Date Returned', width: 25, align: 'center' },
    { header: 'Duration', width: 20, align: 'center' },
    { header: 'Coverage', width: 20, align: 'center' },
    { header: 'Status', width: 24, align: 'center' },
  ];

  const drawS13Header = () => {
    doc.setFillColor(51, 65, 85);
    doc.rect(marginLeft, currentY, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    let x = marginLeft;
    for (const col of s13Columns) {
      if (col.align === 'center') {
        doc.text(col.header, x + col.width / 2, currentY + 4.8, { align: 'center' });
      } else if (col.align === 'right') {
        doc.text(col.header, x + col.width - 2, currentY + 4.8, { align: 'right' });
      } else {
        doc.text(col.header, x + 2.5, currentY + 4.8);
      }
      x += col.width;
    }
    currentY += 7;
  };

  drawS13Header();

  s13Records.forEach((r, i) => {
    if (currentY + 6.5 > pageHeight - marginBottom) {
      drawPageFooter(pageNumber, '3+');
      doc.addPage();
      pageNumber++;
      currentY = marginTop;

      // Continuation Header
      doc.setFillColor(241, 245, 249);
      doc.rect(marginLeft, currentY, contentWidth, 6.5, 'F');
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(
        `S-13 Territory Record — ${congregationName} (Continued)`,
        marginLeft + 4,
        currentY + 4.5
      );
      currentY += 9;
      drawS13Header();
    }

    const isEven = i % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(marginLeft, currentY, contentWidth, 6.2, 'F');

    doc.setDrawColor(226, 232, 240);
    doc.line(marginLeft, currentY + 6.2, marginLeft + contentWidth, currentY + 6.2);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);

    let x = marginLeft;
    doc.text(`#${r.territoryNumber}`, x + 2.5, currentY + 4.2);
    x += s13Columns[0].width;

    doc.setFont('helvetica', 'normal');
    const name = r.territoryName.length > 32 ? `${r.territoryName.slice(0, 30)}…` : r.territoryName;
    doc.text(name, x + 2, currentY + 4.2);
    x += s13Columns[1].width;

    const assignee = r.isGroupAssignment
      ? `Group: ${r.groupName || r.assigneeName}`
      : r.assigneeName;
    const truncatedAssignee = assignee.length > 34 ? `${assignee.slice(0, 32)}…` : assignee;
    if (r.isGroupAssignment) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
    }
    doc.text(truncatedAssignee, x + 2, currentY + 4.2);
    x += s13Columns[2].width;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(
      r.isGroupAssignment ? 'Group' : 'Personal',
      x + s13Columns[3].width / 2,
      currentY + 4.2,
      {
        align: 'center',
      }
    );
    x += s13Columns[3].width;

    const assignedStr = r.assignedAt ? new Date(r.assignedAt).toLocaleDateString() : '—';
    doc.text(assignedStr, x + s13Columns[4].width / 2, currentY + 4.2, { align: 'center' });
    x += s13Columns[4].width;

    if (r.returnedAt) {
      doc.setTextColor(30, 41, 59);
      doc.text(
        new Date(r.returnedAt).toLocaleDateString(),
        x + s13Columns[5].width / 2,
        currentY + 4.2,
        {
          align: 'center',
        }
      );
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('Active', x + s13Columns[5].width / 2, currentY + 4.2, { align: 'center' });
    }
    x += s13Columns[5].width;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(
      r.durationDays !== null ? `${r.durationDays}d` : '—',
      x + s13Columns[6].width / 2,
      currentY + 4.2,
      {
        align: 'center',
      }
    );
    x += s13Columns[6].width;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${Math.round(r.coverageAtReturn)}%`, x + s13Columns[7].width / 2, currentY + 4.2, {
      align: 'center',
    });
    x += s13Columns[7].width;

    const isComp = r.status === 'completed' || Boolean(r.returnedAt);
    if (isComp) {
      doc.setTextColor(22, 163, 74);
      doc.text('COMPLETED', x + s13Columns[8].width / 2, currentY + 4.2, { align: 'center' });
    } else {
      doc.setTextColor(37, 99, 235);
      doc.text('IN FIELD', x + s13Columns[8].width / 2, currentY + 4.2, { align: 'center' });
    }

    currentY += 6.2;
  });

  drawPageFooter(pageNumber, '3+');

  // =========================================================================
  // PAGE 3: SERVICE GROUPS & PUBLISHER PERFORMANCE (PAGE BREAK)
  // =========================================================================
  doc.addPage();
  pageNumber++;
  currentY = marginTop;

  drawSectionHeader(
    'SERVICE GROUPS & PUBLISHERS ACTIVITY LEADERBOARD',
    `Congregation: ${congregationName}   •   Groups: ${groupsData.length}   •   Publishers: ${publishersData.length}`,
    'MINISTRY FORCE'
  );

  currentY += 21;

  // Service Groups Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Service Groups Summary', marginLeft, currentY);
  currentY += 4;

  doc.setFillColor(51, 65, 85);
  doc.rect(marginLeft, currentY, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Group Name', marginLeft + 3, currentY + 4.5);
  doc.text('Group Overseer', marginLeft + 65, currentY + 4.5);
  doc.text('Assistant Overseer', marginLeft + 120, currentY + 4.5);
  doc.text('Publishers', marginLeft + 175, currentY + 4.5, { align: 'center' });
  doc.text('Territories', marginLeft + 205, currentY + 4.5, { align: 'center' });
  doc.text('Avg Coverage', marginLeft + contentWidth - 4, currentY + 4.5, { align: 'right' });

  currentY += 6.5;

  groupsData.forEach((g, i) => {
    const isEven = i % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(marginLeft, currentY, contentWidth, 6, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(marginLeft, currentY + 6, marginLeft + contentWidth, currentY + 6);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(g.name, marginLeft + 3, currentY + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.text(g.overseerName || 'Unassigned', marginLeft + 65, currentY + 4.2);
    doc.text(g.assistantOverseerName || 'None', marginLeft + 120, currentY + 4.2);

    doc.text(`${g.memberCount}`, marginLeft + 175, currentY + 4.2, { align: 'center' });
    doc.text(`${g.assignedTerritoriesCount}`, marginLeft + 205, currentY + 4.2, {
      align: 'center',
    });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(
      `${Math.round(g.avgCoveragePercent)}%`,
      marginLeft + contentWidth - 4,
      currentY + 4.2,
      {
        align: 'right',
      }
    );

    currentY += 6;
  });

  currentY += 8;

  // Publishers Leaderboard
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Publishers Ministry Activity', marginLeft, currentY);
  currentY += 4;

  doc.setFillColor(51, 65, 85);
  doc.rect(marginLeft, currentY, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Publisher Name', marginLeft + 3, currentY + 4.5);
  doc.text('Service Group', marginLeft + 70, currentY + 4.5);
  doc.text('Active Territories', marginLeft + 130, currentY + 4.5, { align: 'center' });
  doc.text('Completed', marginLeft + 165, currentY + 4.5, { align: 'center' });
  doc.text('Visits Logged', marginLeft + 200, currentY + 4.5, { align: 'center' });
  doc.text('Last Active', marginLeft + contentWidth - 4, currentY + 4.5, { align: 'right' });

  currentY += 6.5;

  const maxPublishers = 12;
  publishersData.slice(0, maxPublishers).forEach((p, i) => {
    const isEven = i % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(marginLeft, currentY, contentWidth, 5.8, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(marginLeft, currentY + 5.8, marginLeft + contentWidth, currentY + 5.8);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(p.name, marginLeft + 3, currentY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(p.groupName || '—', marginLeft + 70, currentY + 4);

    doc.setTextColor(15, 23, 42);
    doc.text(`${p.activeAssignments}`, marginLeft + 130, currentY + 4, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text(`${p.totalCompleted}`, marginLeft + 165, currentY + 4, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`${p.totalVisits}`, marginLeft + 200, currentY + 4, { align: 'center' });

    doc.setTextColor(100, 116, 139);
    const lastActive = p.lastActiveDate ? new Date(p.lastActiveDate).toLocaleDateString() : '—';
    doc.text(lastActive, marginLeft + contentWidth - 4, currentY + 4, { align: 'right' });

    currentY += 5.8;
  });

  drawPageFooter(pageNumber, '3+');

  // =========================================================================
  // PAGE 4: HOUSEHOLD DEMOGRAPHICS & EVENT AUDIT TIMELINE (PAGE BREAK)
  // =========================================================================
  doc.addPage();
  pageNumber++;
  currentY = marginTop;

  drawSectionHeader(
    'DOOR DEMOGRAPHICS & MINISTRY EVENT AUDIT TIMELINE',
    `Congregation: ${congregationName}   •   Total Mapped Doors: ${doorData?.totalDoors ?? 0}`,
    'FIELD INTELLIGENCE'
  );

  currentY += 21;

  // Left Column: Door Demographics (width = 130mm)
  const leftColWidth = 128;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Visit Outcome Demographics', marginLeft, currentY);

  let leftY = currentY + 4;
  const outcomes = [
    {
      label: 'Contacted & Discussed',
      count: doorData?.outcomeCounts.contacted ?? 0,
      color: [16, 185, 129],
    },
    {
      label: 'Bible Study Conducted',
      count: doorData?.outcomeCounts.studyConducted ?? 0,
      color: [139, 92, 246],
    },
    {
      label: 'Return Visits Planned',
      count: doorData?.outcomeCounts.returnVisit ?? doorData?.returnVisitsCount ?? 0,
      color: [99, 102, 241],
    },
    { label: 'Not Home', count: doorData?.outcomeCounts.notHome ?? 0, color: [245, 158, 11] },
    { label: 'Busy / Call Back', count: doorData?.outcomeCounts.busy ?? 0, color: [249, 115, 22] },
    {
      label: 'Literature Placed',
      count: doorData?.outcomeCounts.placedLiterature ?? 0,
      color: [37, 99, 235],
    },
    {
      label: 'Foreign Language',
      count: doorData?.outcomeCounts.foreignLanguage ?? doorData?.foreignLanguageCount ?? 0,
      color: [6, 182, 212],
    },
    {
      label: 'Inaccessible / Gated',
      count: doorData?.outcomeCounts.inaccessible ?? doorData?.inaccessibleCount ?? 0,
      color: [120, 113, 108],
    },
    {
      label: 'Vacant / Unoccupied',
      count: doorData?.outcomeCounts.vacant ?? doorData?.vacantCount ?? 0,
      color: [100, 116, 139],
    },
    {
      label: 'Do Not Call (DNC)',
      count: doorData?.outcomeCounts.doNotCall ?? doorData?.doNotCallCount ?? 0,
      color: [225, 29, 72],
    },
  ];

  outcomes.forEach((out) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginLeft, leftY, leftColWidth, 6.8, 1.2, 1.2, 'FD');

    doc.setFillColor(out.color[0], out.color[1], out.color[2]);
    doc.circle(marginLeft + 3.5, leftY + 3.4, 1.3, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(out.label, marginLeft + 7, leftY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${out.count}`, marginLeft + leftColWidth - 4, leftY + 4.5, { align: 'right' });

    leftY += 7.8;
  });

  // Right Column: Recent Audit Log (width = 130mm)
  const rightX = marginLeft + leftColWidth + 10;
  const rightColWidth = contentWidth - leftColWidth - 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Recent Assignment Activity Log', rightX, currentY);

  let rightY = currentY + 4;
  const recentAssignments = activityData?.assignments?.slice(0, 6) || [];

  if (recentAssignments.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No recent territory assignments logged.', rightX, rightY + 6);
  } else {
    recentAssignments.forEach((act) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(rightX, rightY, rightColWidth, 9.5, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(37, 99, 235);
      doc.text(`#${act.territoryNumber} ${act.territoryName}`, rightX + 3, rightY + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Assigned to ${act.publisherName}`, rightX + 3, rightY + 7.8);

      const dateStr = act.assignedAt ? new Date(act.assignedAt).toLocaleDateString() : 'Recent';
      doc.text(dateStr, rightX + rightColWidth - 3, rightY + 4.2, { align: 'right' });

      rightY += 11;
    });
  }

  drawPageFooter(pageNumber, `${pageNumber}`);

  // Download Trigger
  const filename = `Congregation_Reports_Analytics_${congregationName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  if (typeof window !== 'undefined') {
    doc.save(filename);
  }

  return doc;
}
