import { jsPDF } from 'jspdf';
import { formatDate } from './date-utils';
import type { S13AssignmentRecord } from '@/types/api';

/**
 * Generates and downloads an authentic, official S-13 (8/19) Congregation
 * Territory Assignment Record in high-resolution vector PDF format.
 */
export function exportS13ToPDF(
  records: S13AssignmentRecord[],
  congregationName = 'Congregation',
  serviceYear?: number | 'all'
): jsPDF {
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

  interface ColumnDef {
    header: string;
    width: number;
    align: 'left' | 'center' | 'right';
  }

  // Column definitions (total = 269mm)
  const columns: ColumnDef[] = [
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

  const rowHeight = 7.5;
  const headerRowHeight = 8.5;

  let currentPage = 1;
  let currentY = marginTop;

  const syLabel =
    serviceYear && serviceYear !== 'all'
      ? `${serviceYear - 1}–${serviceYear} Service Year`
      : 'All Service Years';

  const drawHeader = (isFirstPage: boolean) => {
    if (isFirstPage) {
      // Top S-13 Form Title Bar
      doc.setFillColor(30, 41, 59); // Slate-800
      doc.rect(marginLeft, currentY, contentWidth, 18, 'F');

      // Title Text
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('CONGREGATION TERRITORY ASSIGNMENT RECORD', marginLeft + 6, currentY + 7.5);

      // Form Sub-code (Official S-13 form standard)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('FORM S-13 (8/19)', marginLeft + contentWidth - 6, currentY + 7.5, {
        align: 'right',
      });

      // Sub-bar with Congregation name & stats & Service Year
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Congregation: ${congregationName}   •   ${syLabel}   •   Generated: ${formatDate(new Date())}`,
        marginLeft + 6,
        currentY + 13.5
      );

      const activeCount = records.filter((r) => !r.returnedAt).length;
      const completedCount = records.filter(
        (r) => Boolean(r.returnedAt) || r.status === 'completed'
      ).length;
      doc.text(
        `Total: ${records.length}   |   Active: ${activeCount}   |   Completed: ${completedCount}`,
        marginLeft + contentWidth - 6,
        currentY + 13.5,
        { align: 'right' }
      );

      currentY += 22;
    } else {
      // Continuation Header on Subsequent Pages
      doc.setFillColor(241, 245, 249); // Slate-100
      doc.rect(marginLeft, currentY, contentWidth, 7, 'F');

      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(
        `S-13 Territory Record — ${congregationName} (Continued)`,
        marginLeft + 4,
        currentY + 4.8
      );

      currentY += 10;
    }

    // Draw Table Header
    doc.setFillColor(51, 65, 85); // Slate-700
    doc.rect(marginLeft, currentY, contentWidth, headerRowHeight, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    let x = marginLeft;
    for (const col of columns) {
      if (col.align === 'center') {
        doc.text(col.header, x + col.width / 2, currentY + 5.5, { align: 'center' });
      } else if (col.align === 'right') {
        doc.text(col.header, x + col.width - 2, currentY + 5.5, { align: 'right' });
      } else {
        doc.text(col.header, x + 2.5, currentY + 5.5);
      }
      x += col.width;
    }

    currentY += headerRowHeight;
  };

  const drawFooter = (pageNum: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate-400

    const footerY = pageHeight - 7;
    doc.text(`Kanataran • Official S-13 Territory Assignment Record`, marginLeft, footerY);
    doc.text(`Page ${pageNum}`, marginLeft + contentWidth, footerY, { align: 'right' });
  };

  // Draw initial page header
  drawHeader(true);

  // Draw Table Rows
  records.forEach((r, index) => {
    // Check for page overflow
    if (currentY + rowHeight > pageHeight - marginBottom) {
      drawFooter(currentPage);
      doc.addPage();
      currentPage++;
      currentY = marginTop;
      drawHeader(false);
    }

    // Alternating row background
    const isEven = index % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(marginLeft, currentY, contentWidth, rowHeight, 'F');

    // Row bottom border
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.2);
    doc.line(marginLeft, currentY + rowHeight, marginLeft + contentWidth, currentY + rowHeight);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59); // Slate-800

    let x = marginLeft;

    // Col 1: Terr. #
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`#${r.territoryNumber}`, x + 2.5, currentY + 5);
    x += columns[0].width;

    // Col 2: Territory Name
    doc.setFont('helvetica', 'normal');
    const truncatedName =
      r.territoryName.length > 32 ? `${r.territoryName.slice(0, 30)}…` : r.territoryName;
    doc.text(truncatedName, x + 2, currentY + 5);
    x += columns[1].width;

    // Col 3: Assigned To
    const displayName = r.isGroupAssignment
      ? `Group: ${r.groupName || r.assigneeName}`
      : r.assigneeName;
    const truncatedAssignee =
      displayName.length > 34 ? `${displayName.slice(0, 32)}…` : displayName;
    if (r.isGroupAssignment) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235); // Blue-600
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
    }
    doc.text(truncatedAssignee, x + 2, currentY + 5);
    x += columns[2].width;

    // Col 4: Type
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(r.isGroupAssignment ? 'Group' : 'Personal', x + columns[3].width / 2, currentY + 5, {
      align: 'center',
    });
    x += columns[3].width;

    // Col 5: Date Assigned
    const assignedStr = r.assignedAt ? formatDate(r.assignedAt) : '—';
    doc.text(assignedStr, x + columns[4].width / 2, currentY + 5, { align: 'center' });
    x += columns[4].width;

    // Col 6: Date Returned
    if (r.returnedAt) {
      doc.setTextColor(30, 41, 59);
      doc.text(formatDate(r.returnedAt), x + columns[5].width / 2, currentY + 5, {
        align: 'center',
      });
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235); // Blue-600
      doc.text('Active', x + columns[5].width / 2, currentY + 5, { align: 'center' });
    }
    x += columns[5].width;

    // Col 7: Duration
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(
      r.durationDays !== null ? `${r.durationDays}d` : '—',
      x + columns[6].width / 2,
      currentY + 5,
      { align: 'center' }
    );
    x += columns[6].width;

    // Col 8: Coverage
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${Math.round(r.coverageAtReturn)}%`, x + columns[7].width / 2, currentY + 5, {
      align: 'center',
    });
    x += columns[7].width;

    // Col 9: Status
    const isComp = r.status === 'completed' || Boolean(r.returnedAt);
    doc.setFont('helvetica', 'bold');
    if (isComp) {
      doc.setTextColor(22, 163, 74); // Emerald-600
      doc.text('COMPLETED', x + columns[8].width / 2, currentY + 5, { align: 'center' });
    } else {
      doc.setTextColor(37, 99, 235); // Blue-600
      doc.text('IN FIELD', x + columns[8].width / 2, currentY + 5, { align: 'center' });
    }

    currentY += rowHeight;
  });

  // Draw footer on last page
  drawFooter(currentPage);

  // Trigger browser download if in browser
  const sySuffix = serviceYear && serviceYear !== 'all' ? `_SY${serviceYear}` : '';
  const filename = `S-13_Territory_Record_${congregationName.replace(/\s+/g, '_')}${sySuffix}_${new Date().toISOString().slice(0, 10)}.pdf`;
  if (typeof window !== 'undefined') {
    doc.save(filename);
  }
  return doc;
}
