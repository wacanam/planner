/**
 * Formats a date string, timestamp, or Date object into short text format:
 * e.g. "Jan 1, 2026"
 *
 * @param date - The date value to format
 * @param fallback - The fallback string when date is null/undefined/invalid (default: '—')
 */
export function formatDate(date?: string | number | Date | null, fallback = '—'): string {
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
export function formatDateTime(date?: string | number | Date | null, fallback = '—'): string {
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

export interface DueStatus {
  status: 'overdue' | 'due-soon' | 'normal' | 'none';
  label: string;
  diffDays: number;
}

/**
 * Calculates urgency and relative due status for assignments
 */
export function getDueStatus(date?: string | number | Date | null): DueStatus {
  if (!date) {
    return { status: 'none', label: '', diffDays: 0 };
  }

  let d: Date;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    const [year, month, day] = date.trim().split('-').map(Number);
    d = new Date(year, month - 1, day);
  } else {
    d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  }

  if (isNaN(d.getTime())) {
    return { status: 'none', label: '', diffDays: 0 };
  }

  const now = new Date();
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetDateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const diffDays = Math.round((targetDateOnly - nowDateOnly) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      status: 'overdue',
      label: absDays === 1 ? 'Overdue by 1 day' : `Overdue by ${absDays} days`,
      diffDays,
    };
  }

  if (diffDays === 0) {
    return {
      status: 'due-soon',
      label: 'Due today',
      diffDays,
    };
  }

  if (diffDays === 1) {
    return {
      status: 'due-soon',
      label: 'Due tomorrow',
      diffDays,
    };
  }

  if (diffDays <= 14) {
    return {
      status: 'due-soon',
      label: `Due in ${diffDays} days`,
      diffDays,
    };
  }

  if (diffDays <= 60) {
    const weeks = Math.round(diffDays / 7);
    return {
      status: 'normal',
      label: `Due in ${weeks}w (${formatDate(date)})`,
      diffDays,
    };
  }

  return {
    status: 'normal',
    label: `Due ${formatDate(date)}`,
    diffDays,
  };
}

/**
 * Formats duration between assignment and return date into human-readable text
 * e.g., "14 days", "3 weeks", "2.5 months"
 */
export function formatAssignmentDuration(
  assignedAt?: string | number | Date | null,
  returnedAt?: string | number | Date | null
): string | null {
  if (!assignedAt || !returnedAt) return null;
  const start =
    typeof assignedAt === 'string' || typeof assignedAt === 'number'
      ? new Date(assignedAt)
      : assignedAt;
  const end =
    typeof returnedAt === 'string' || typeof returnedAt === 'number'
      ? new Date(returnedAt)
      : returnedAt;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const diffMs = Math.max(0, end.getTime() - start.getTime());
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) return '1 day';
  if (diffDays < 14) return `${diffDays} days`;
  if (diffDays < 60) {
    const weeks = Math.round(diffDays / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
  }
  const months = (diffDays / 30.4375).toFixed(1).replace(/\.0$/, '');
  return `${months} ${months === '1' ? 'month' : 'months'}`;
}
