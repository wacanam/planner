/**
 * Visit-specific offline store helpers.
 * Delegates to the universal offline-store foundation.
 */

import {
  queueWrite,
  getPendingWrites,
  clearPendingWrite,
  cacheData,
  getCachedData,
  withOfflineCache,
  registerSync,
  hasPendingFlag,
  setPendingFlag,
  type PendingWrite,
} from './offline-store';
import type { Visit, Household } from '@/types/api';

export type { PendingWrite };

// ─── Write queue ──────────────────────────────────────────────────────────────

export async function queueVisit(data: Record<string, unknown>): Promise<string> {
  return queueWrite('pending-visits', data);
}

export async function getPendingVisits(): Promise<PendingWrite[]> {
  return getPendingWrites('pending-visits');
}

export async function clearPendingVisit(id: string): Promise<void> {
  return clearPendingWrite('pending-visits', id);
}

export async function queueHousehold(data: Record<string, unknown>): Promise<string> {
  return queueWrite('pending-households', data);
}

export async function getPendingHouseholds(): Promise<PendingWrite[]> {
  return getPendingWrites('pending-households');
}

export async function clearPendingHousehold(id: string): Promise<void> {
  return clearPendingWrite('pending-households', id);
}

// ─── Read cache ───────────────────────────────────────────────────────────────

export async function cacheVisits(territoryId: string, data: Visit[]): Promise<void> {
  return cacheData('visits-cache', territoryId, data);
}

export async function getCachedVisits(territoryId: string): Promise<Visit[] | null> {
  return getCachedData<Visit[]>('visits-cache', territoryId);
}

export async function cacheHouseholds(territoryId: string, data: Household[]): Promise<void> {
  return cacheData('households-cache', territoryId, data);
}

export async function getCachedHouseholds(territoryId: string): Promise<Household[] | null> {
  return getCachedData<Household[]>('households-cache', territoryId);
}

// ─── SWR fetcher wrappers (online + IDB fallback) ─────────────────────────────

export function visitsOfflineFetcher(
  territoryId: string,
  fetcher: (url: string) => Promise<Visit[]>
) {
  return withOfflineCache<Visit[]>('visits-cache', territoryId, fetcher);
}

export function householdsOfflineFetcher(
  territoryId: string,
  fetcher: (url: string) => Promise<Household[]>
) {
  return withOfflineCache<Household[]>('households-cache', territoryId, fetcher);
}

export async function queueEncounter(data: Record<string, unknown>): Promise<string> {
  return queueWrite('pending-encounters', data);
}

export async function getPendingEncounters(): Promise<PendingWrite[]> {
  return getPendingWrites('pending-encounters');
}

export async function clearPendingEncounter(id: string): Promise<void> {
  return clearPendingWrite('pending-encounters', id);
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export async function registerVisitSync(): Promise<void> {
  return registerSync('visits-sync');
}

export function hasPendingVisitsFlag(): boolean {
  return hasPendingFlag('visits');
}

export function setPendingVisitsFlag(value: boolean): void {
  setPendingFlag('visits', value);
}
