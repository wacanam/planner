import type { RxDocument } from 'rxdb';
import { apiClient } from '@/lib/api-client';
import type { Encounter, Household, Visit } from '@/types/api';
import { syncPendingAvatarUploads } from '@/lib/avatar-store';
import { getLocalFirstDB } from './database';
import { notifyLocalFirstChange, notifyLocalFirstSync } from './events';
import {
  applyRemoteEncounters,
  encounterPayload,
  markEncounterSynced,
} from './encounters';
import {
  applyRemoteHouseholds,
  householdPayload,
  markHouseholdSynced,
} from './households';
import { syncErrorMessage } from './shared';
import type { LocalEncounter, LocalFirstSyncResult, LocalHousehold, LocalVisit } from './types';
import { applyRemoteVisits, markVisitSynced, visitPayload } from './visits';

let currentSync: Promise<LocalFirstSyncResult> | null = null;
let syncTimer: number | null = null;

export function requestLocalFirstSync(delayMs = 400) {
  if (typeof window === 'undefined' || !navigator.onLine) return;
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    void syncLocalFirst();
  }, delayMs);
}

export async function getPendingLocalFirstCount(): Promise<number> {
  const database = await getLocalFirstDB();
  const [households, visits, encounters, avatars] = await Promise.all([
    database.households.find().exec(),
    database.visits.find().exec(),
    database.encounters.find().exec(),
    database.avataruploads.find().exec(),
  ]);

  return [...households, ...visits, ...encounters, ...avatars].filter((document) => {
    const record = document.toMutableJSON() as { syncStatus?: string; deletedAt?: string | null };
    return record.syncStatus && record.syncStatus !== 'synced';
  }).length;
}

export async function syncLocalFirst(): Promise<LocalFirstSyncResult> {
  if (currentSync) return currentSync;

  currentSync = runSync().finally(() => {
    currentSync = null;
  });

  return currentSync;
}

async function runSync(): Promise<LocalFirstSyncResult> {
  const result: LocalFirstSyncResult = { pushed: 0, pulled: 0, failed: 0, errors: [] };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return result;
  }

  notifyLocalFirstSync({ status: 'syncing' });

  try {
    result.pushed += await pushHouseholds(result);
    result.pushed += await pushVisits(result);
    result.pushed += await pushEncounters(result);
    result.pushed += await syncPendingAvatarUploads();
    result.pulled += await pullServerRecords(result);
    notifyLocalFirstSync({ status: 'synced', result });
  } catch (error) {
    result.failed += 1;
    result.errors.push(syncErrorMessage(error));
    notifyLocalFirstSync({ status: 'failed', result });
  } finally {
    notifyLocalFirstChange();
  }

  return result;
}

async function pushHouseholds(result: LocalFirstSyncResult): Promise<number> {
  const database = await getLocalFirstDB();
  const documents = await database.households.find().exec();
  let pushed = 0;

  for (const document of documents) {
    const record = document.toMutableJSON() as LocalHousehold;
    if (record.syncStatus === 'synced') continue;

    try {
      if (record.deletedAt) {
        if (record.serverId) {
          await apiClient.delete(`/api/households/${record.serverId}`);
        }
        await document.remove();
        pushed += 1;
        continue;
      }

      await document.incrementalPatch({ syncStatus: 'syncing', syncError: null });
      const synced = record.serverId
        ? await apiClient.put<Household>(`/api/households/${record.serverId}`, householdPayload(record))
        : await apiClient.post<Household>('/api/households', householdPayload(record));
      await markHouseholdSynced(document as RxDocument<LocalHousehold>, synced);
      pushed += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push(syncErrorMessage(error));
      await document.incrementalPatch({ syncStatus: 'failed', syncError: syncErrorMessage(error) });
    }
  }

  return pushed;
}

async function pushVisits(result: LocalFirstSyncResult): Promise<number> {
  const database = await getLocalFirstDB();
  const documents = await database.visits.find().exec();
  let pushed = 0;

  for (const document of documents) {
    const record = document.toMutableJSON() as LocalVisit;
    if (record.syncStatus === 'synced') continue;

    try {
      if (record.deletedAt) {
        if (record.serverId) {
          await apiClient.delete(`/api/visits/${record.serverId}`);
        }
        await document.remove();
        pushed += 1;
        continue;
      }

      const household = await database.households.findOne(record.householdId).exec();
      const householdData = household?.toMutableJSON() as LocalHousehold | undefined;
      const householdServerId = householdData?.serverId ?? record.householdServerId;
      if (!householdServerId) {
        throw new Error('Visit is waiting for its household to sync first.');
      }

      await document.incrementalPatch({
        syncStatus: 'syncing',
        syncError: null,
        householdServerId,
      });
      const synced = record.serverId
        ? await apiClient.put<Visit>(`/api/visits/${record.serverId}`, visitPayload(record, householdServerId))
        : await apiClient.post<Visit>('/api/visits', visitPayload(record, householdServerId));
      await markVisitSynced(document as RxDocument<LocalVisit>, synced);
      pushed += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push(syncErrorMessage(error));
      await document.incrementalPatch({ syncStatus: 'failed', syncError: syncErrorMessage(error) });
    }
  }

  return pushed;
}

async function pushEncounters(result: LocalFirstSyncResult): Promise<number> {
  const database = await getLocalFirstDB();
  const documents = await database.encounters.find().exec();
  let pushed = 0;

  for (const document of documents) {
    const record = document.toMutableJSON() as LocalEncounter;
    if (record.syncStatus === 'synced') continue;

    try {
      if (record.deletedAt) {
        if (record.serverId) {
          await apiClient.delete(`/api/encounters/${record.serverId}`);
        }
        await document.remove();
        pushed += 1;
        continue;
      }

      const household = record.householdId
        ? await database.households.findOne(record.householdId).exec()
        : null;
      const visit = record.visitId ? await database.visits.findOne(record.visitId).exec() : null;
      const householdData = household?.toMutableJSON() as LocalHousehold | undefined;
      const visitData = visit?.toMutableJSON() as LocalVisit | undefined;
      const householdServerId = householdData?.serverId ?? record.householdServerId;
      const visitServerId = visitData?.serverId ?? record.visitServerId;

      if (record.householdId && !householdServerId) {
        throw new Error('Encounter is waiting for its household to sync first.');
      }
      if (record.visitId && !visitServerId) {
        throw new Error('Encounter is waiting for its visit to sync first.');
      }

      await document.incrementalPatch({
        syncStatus: 'syncing',
        syncError: null,
        householdServerId,
        visitServerId,
      });
      const endpoint = visitServerId
        ? `/api/visits/${visitServerId}/encounters`
        : '/api/profile/encounters';
      const synced = await apiClient.post<Encounter>(
        endpoint,
        encounterPayload(record, householdServerId, visitServerId)
      );
      await markEncounterSynced(document as RxDocument<LocalEncounter>, synced);
      pushed += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push(syncErrorMessage(error));
      await document.incrementalPatch({ syncStatus: 'failed', syncError: syncErrorMessage(error) });
    }
  }

  return pushed;
}

async function pullServerRecords(result: LocalFirstSyncResult): Promise<number> {
  try {
    const [households, visits, encounters] = await Promise.all([
      apiClient.get<Household[]>('/api/households'),
      apiClient.get<Visit[]>('/api/visits'),
      apiClient.get<Encounter[]>('/api/profile/encounters?limit=200'),
    ]);

    const appliedHouseholds = await applyRemoteHouseholds(households);
    const appliedVisits = await applyRemoteVisits(visits);
    const appliedEncounters = await applyRemoteEncounters(encounters);
    return appliedHouseholds + appliedVisits + appliedEncounters;
  } catch (error) {
    result.failed += 1;
    result.errors.push(syncErrorMessage(error));
    return 0;
  }
}