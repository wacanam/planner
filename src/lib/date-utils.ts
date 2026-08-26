/**
 * Formats a date string, timestamp, or Date object into short text format:
 * e.g. "Jan 1, 2026"
 *
 * @param date - The date value to format
 * @param fallback - The fallback string when date is null/undefined/invalid (default: '—')
 */
export function formatDate(
  date?: string | number | Date | null,
  fallback = '—'
): string {
  if (!date) return fallback;

  // Handle YYYY-MM-DD string directly to avoid UTC midnight timezone rollback
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    const [year, month, day] = date.trim().split('-').map(Number);
    const d = new Date(year, month - 1, day);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return fallback;

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a date with time into short text format:
 * e.g. "Jan 1, 2026, 10:30 AM"
 */
export function formatDateTime(
  date?: string | number | Date | null,
  fallback = '—'
): string {
  if (!date) return fallback;
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return fallback;

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Formats a date into a compact relative days string:
 * e.g. "Today", "1d ago", "14d ago"
 *
 * @param date - The date value to format
 * @param fallback - Fallback text if date is null/undefined/invalid (default: 'No activity yet')
 */
export function formatDaysAgo(
  date?: string | number | Date | null,
  fallback = 'No activity yet'
): string {
  if (!date) return fallback;

  let d: Date;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    const [year, month, day] = date.trim().split('-').map(Number);
    d = new Date(year, month - 1, day);
  } else {
    d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  }

  if (isNaN(d.getTime())) return fallback;

  const now = new Date();
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetDateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const diffDays = Math.max(0, Math.floor((nowDateOnly - targetDateOnly) / (1000 * 60 * 60 * 24)));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1d ago';
  return `${diffDays}d ago`;
}
