// mobile/src/lib/pdf-export.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { S13AssignmentRecord, Territory } from '@/types/api';

/**
 * Generates an official S-13 Congregation Territory Assignment Record HTML document.
 */
export function generateS13Html(
  records: S13AssignmentRecord[],
  congregationName = 'Congregation'
): string {
  const dateStr = new Date().toLocaleDateString();
  const activeCount = records.filter((r) => !r.returnedAt).length;
  const completedCount = records.filter(
    (r) => Boolean(r.returnedAt) || r.status === 'completed'
  ).length;

  const rowsHtml = records
    .map((r, index) => {
      const isEven = index % 2 === 0;
      const bg = isEven ? '#ffffff' : '#f8fafc';
      const assignedStr = r.assignedAt ? new Date(r.assignedAt).toLocaleDateString() : '—';
      const returnedStr = r.returnedAt
        ? new Date(r.returnedAt).toLocaleDateString()
        : '<span style="color:#2563eb;font-weight:bold;">Active</span>';
      const isComp = r.status === 'completed' || Boolean(r.returnedAt);
      const statusBadge = isComp
        ? '<span style="color:#16a34a;font-weight:bold;">COMPLETED</span>'
        : '<span style="color:#2563eb;font-weight:bold;">IN FIELD</span>';

      return `
        <tr style="background-color:${bg};border-bottom:1px solid #e2e8f0;font-size:10px;">
          <td style="padding:6px 8px;font-weight:bold;">#${r.territoryNumber}</td>
          <td style="padding:6px 8px;">${r.territoryName}</td>
          <td style="padding:6px 8px;${r.isGroupAssignment ? 'color:#2563eb;font-weight:bold;' : ''}">${r.isGroupAssignment ? `Group: ${r.groupName || r.assigneeName}` : r.assigneeName}</td>
          <td style="padding:6px 8px;text-align:center;color:#64748b;">${r.isGroupAssignment ? 'Group' : 'Personal'}</td>
          <td style="padding:6px 8px;text-align:center;">${assignedStr}</td>
          <td style="padding:6px 8px;text-align:center;">${returnedStr}</td>
          <td style="padding:6px 8px;text-align:center;color:#64748b;">${r.durationDays !== null ? `${r.durationDays}d` : '—'}</td>
          <td style="padding:6px 8px;text-align:center;font-weight:bold;">${Math.round(r.coverageAtReturn)}%</td>
          <td style="padding:6px 8px;text-align:center;">${statusBadge}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>S-13 Territory Record - ${congregationName}</title>
        <style>
          @page { size: landscape; margin: 8mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 12px; }
          .header-bar { background-color: #1e293b; color: #ffffff; padding: 10px 14px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
          .header-title { font-size: 14px; font-weight: bold; }
          .header-code { font-size: 9px; opacity: 0.85; }
          .sub-bar { display: flex; justify-content: space-between; font-size: 10px; margin-top: 6px; padding: 0 4px; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #334155; color: #ffffff; font-size: 9px; font-weight: 600; text-align: left; padding: 6px 8px; text-transform: uppercase; }
          .footer { margin-top: 14px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; }
        </style>
      </head>
      <body>
        <div class="header-bar">
          <div class="header-title">CONGREGATION TERRITORY ASSIGNMENT RECORD</div>
          <div class="header-code">FORM S-13 (8/19)</div>
        </div>
        <div class="sub-bar">
          <div>Congregation: <strong>${congregationName}</strong> &bull; Generated: ${dateStr}</div>
          <div>Total: ${records.length} &bull; Active: ${activeCount} &bull; Completed: ${completedCount}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:8%;">Terr. #</th>
              <th style="width:24%;">Territory Name / Locality</th>
              <th style="width:24%;">Assigned To</th>
              <th style="width:8%;text-align:center;">Type</th>
              <th style="width:9%;text-align:center;">Date Assigned</th>
              <th style="width:9%;text-align:center;">Date Returned</th>
              <th style="width:6%;text-align:center;">Duration</th>
              <th style="width:6%;text-align:center;">Coverage</th>
              <th style="width:6%;text-align:center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>Kanataran Mobile &bull; Official Territory Record</div>
          <div>Page 1</div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generates and shares an S-13 PDF using native Expo Print & Sharing.
 */
export async function exportS13Pdf(
  records: S13AssignmentRecord[],
  congregationName = 'Congregation'
): Promise<void> {
  const html = generateS13Html(records, congregationName);
  const { uri } = await Print.printToFileAsync({
    html,
    margins: { left: 20, top: 20, right: 20, bottom: 20 },
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  }
}

/**
 * Generates and shares a Territory Card PDF.
 */
export async function exportTerritoryCardPdf(
  territory: Territory,
  congregationName = 'Congregation'
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Territory Card #${territory.number}</title>
        <style>
          @page { size: portrait; margin: 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; padding: 10px; }
          .card { border: 2px solid #6b9ecc; border-radius: 8px; padding: 16px; background-color: #ffffff; }
          .header { display: flex; justify-content: space-between; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 10px; }
          .number { font-size: 24px; font-weight: bold; color: #6b9ecc; }
          .name { font-size: 16px; font-weight: bold; margin-top: 2px; }
          .city { font-size: 12px; color: #64748b; }
          .section { margin-top: 14px; font-size: 12px; }
          .notes { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-top: 6px; min-height: 80px; }
          .stats { display: flex; gap: 20px; margin-top: 12px; }
          .stat-box { background-color: #f5f3f0; border-radius: 6px; padding: 8px 14px; text-align: center; }
          .stat-val { font-size: 16px; font-weight: bold; color: #2d2d2d; }
          .stat-label { font-size: 10px; color: #9b9b9b; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div>
              <div class="number">Territory #${territory.number}</div>
              <div class="name">${territory.name}</div>
              <div class="city">${territory.city || congregationName}</div>
            </div>
            <div style="text-align:right;font-size:11px;color:#64748b;">
              <div>${congregationName}</div>
              <div style="margin-top:4px;">Status: <strong>${territory.status.toUpperCase()}</strong></div>
            </div>
          </div>

          <div class="stats">
            <div class="stat-box">
              <div class="stat-val">${territory.householdsCount}</div>
              <div class="stat-label">DOORS</div>
            </div>
            <div class="stat-box">
              <div class="stat-val">${territory.coveragePercent}%</div>
              <div class="stat-label">COVERAGE</div>
            </div>
          </div>

          <div class="section">
            <strong>Territory Notes & Boundaries:</strong>
            <div class="notes">${territory.notes || 'No special notes provided for this territory.'}</div>
          </div>

          <div style="margin-top:20px;font-size:10px;color:#94a3b8;text-align:center;">
            Kanataran Ministry Planner &bull; Territory Card
          </div>
        </div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  }
}
