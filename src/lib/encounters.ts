import type { Encounter } from '@/types/api';

type SqlDateLike = Date | string | null | undefined;

export interface LegacyEncounterRow {
  id: string;
  visitId: string | null;
  householdId: string | null;
  userId: string;
  type: string;
  personSpoken: string | null;
  description: string | null;
  date: SqlDateLike;
  followUp: boolean | null;
  followUpNotes: string | null;
  syncedAt: SqlDateLike;
  offlineCreated: boolean | null;
  createdAt: SqlDateLike;
  updatedAt: SqlDateLike;
  householdAddress?: string | null;
  householdCity?: string | null;
  visitDate?: SqlDateLike;
  visitOutcome?: string | null;
}

function toIsoString(value: SqlDateLike): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.toISOString();
}

export function mapLegacyEncounterRow(row: LegacyEncounterRow): Encounter {
  const createdAt = toIsoString(row.createdAt) ?? new Date().toISOString();
  const updatedAt = toIsoString(row.updatedAt) ?? createdAt;

  return {
    id: row.id,
    visitId: row.visitId ?? null,
    householdId: row.householdId ?? null,
    userId: row.userId,
    name: row.personSpoken ?? null,
    gender: null,
    ageGroup: null,
    role: null,
    response: row.type,
    languageSpoken: null,
    topicDiscussed: row.description ?? null,
    literatureAccepted: null,
    bibleStudyInterest: false,
    returnVisitRequested: row.followUp ?? false,
    nextVisitNotes: row.followUpNotes ?? null,
    notes: row.description ?? null,
    syncStatus: row.syncedAt ? 'synced' : 'pending',
    offlineCreated: row.offlineCreated ?? false,
    syncedAt: toIsoString(row.syncedAt),
    createdAt,
    updatedAt,
    householdAddress: row.householdAddress ?? null,
    householdCity: row.householdCity ?? null,
    visitDate: toIsoString(row.visitDate ?? row.date),
    visitOutcome: row.visitOutcome ?? null,
  };
}

export function buildLegacyEncounterDescription(input: {
  topicDiscussed?: string;
  literatureAccepted?: string;
  notes?: string;
  languageSpoken?: string;
}): string {
  const parts = [
    input.topicDiscussed ? `Topic: ${input.topicDiscussed}` : null,
    input.literatureAccepted ? `Literature: ${input.literatureAccepted}` : null,
    input.languageSpoken ? `Language: ${input.languageSpoken}` : null,
    input.notes ? `Notes: ${input.notes}` : null,
  ].filter((value): value is string => Boolean(value));

  return parts.join('\n') || 'Encounter logged';
}
