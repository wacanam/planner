export function nowIso() {
  return new Date().toISOString();
}

export function nullableString(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

export function nullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function isoDate(value: unknown, fallback = nowIso()): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.length > 0) return value;
  return fallback;
}

