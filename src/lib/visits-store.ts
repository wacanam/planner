/**
 * Visit-specific store helpers.
 * Thin wrapper around idb-store for domain-specific operations.
 */

import { queueWrite, getPendingWrites, clearPendingWrite, registerSync } from './offline-store';

// Type exports
export interface PendingWrite<T = unknown> {
  id: string;
  data: T;
  createdAt: string;
}

// ─── Queue pending visits ─────────────────────────────────────────────────────

export async function queueVisit(data: Record<string, unknown>): Promise<string> {
  const id = crypto.randomUUID();
  await queueWrite('pending-visits', data);
  // Trigger SW sync in background
  await registerSync('visits-sync');
  return id;
}

export async function getPendingVisits(): Promise<PendingWrite<Record<string, unknown>>[]> {
  return getPendingWrites('pending-visits');
}

export async function clearPendingVisit(id: string): Promise<void> {
  return clearPendingWrite('pending-visits', id);
}

// ─── Queue pending households ─────────────────────────────────────────────────

export async function queueHousehold(data: Record<string, unknown>): Promise<string> {
  const id = crypto.randomUUID();
  await queueWrite('pending-households', data);
  // Trigger SW sync in background
  await registerSync('visits-sync');
  return id;
}

export async function getPendingHouseholds(): Promise<PendingWrite<Record<string, unknown>>[]> {
  return getPendingWrites('pending-households');
}

export async function clearPendingHousehold(id: string): Promise<void> {
  return clearPendingWrite('pending-households', id);
}

// ─── Register background sync ─────────────────────────────────────────────────

export async function registerVisitSync(): Promise<void> {
  return registerSync('visits-sync');
}

// ─── Queue pending encounters ─────────────────────────────────────────────────

export async function queueEncounter(data: Record<string, unknown>): Promise<string> {
  const id = crypto.randomUUID();
  await queueWrite('pending-encounters', data);
  await registerSync('visits-sync');
  return id;
}

export async function getPendingEncounters(): Promise<PendingWrite<Record<string, unknown>>[]> {
  return getPendingWrites('pending-encounters');
}

export async function clearPendingEncounter(id: string): Promise<void> {
  return clearPendingWrite('pending-encounters', id);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function hasPendingVisitsFlag(): boolean {
  // Simple check: return true if localStorage has flag
  return localStorage.getItem('pending-visits-flag') === 'true';
}

export function setPendingVisitsFlag(value: boolean): void {
  if (value) {
    localStorage.setItem('pending-visits-flag', 'true');
  } else {
    localStorage.removeItem('pending-visits-flag');
  }
}
