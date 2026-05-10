import type { LocalSyncStatus } from './types';

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

export function pendingStatus(status: LocalSyncStatus): boolean {
  return status !== 'synced';
}

export function syncErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}