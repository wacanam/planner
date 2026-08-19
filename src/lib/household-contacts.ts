import type { Encounter } from '@/types/api';

export interface HouseholdContactSummary {
  id?: string;
  name: string;
  normalizedName: string;
  encountersCount: number;
  gender: 'male' | 'female' | 'unknown';
  ageGroup: 'youth' | 'young_adult' | 'adult' | 'senior' | 'unknown';
  language?: string;
  latestEncounter: Encounter;
  lastVisitDate: string;
  lastResponse: string;
  lastTopicDiscussed?: string;
  lastLiteratureAccepted?: string;
  nextVisitPlannedTopic?: string;
  nextVisitDate?: string;
  notes?: string;
  bibleStudyInterest?: boolean;
  householdAddress?: string;
  territoryId?: string;
  matchScope?: 'household' | 'territory' | 'congregation';
  allEncounters: Encounter[];
}

/**
 * Extracts and aggregates unique persons/contacts met at a specific household from encounter history.
 * Encounters are sorted chronologically, with the latest encounter providing current demographics and context.
 */
export function extractHouseholdContacts(
  encounters: Encounter[] | undefined | null
): HouseholdContactSummary[] {
  if (!encounters || encounters.length === 0) {
    return [];
  }

  // Filter out encounters without a name
  const validEncounters = encounters.filter((e) => e.name && e.name.trim().length > 0);

  // Sort encounters from newest to oldest
  const sorted = [...validEncounters].sort((a, b) => {
    const dateA = a.visitDate || a.createdAt || '';
    const dateB = b.visitDate || b.createdAt || '';
    return dateB.localeCompare(dateA);
  });

  const contactsMap = new Map<
    string,
    {
      name: string;
      encounters: Encounter[];
    }
  >();

  for (const encounter of sorted) {
    const rawName = encounter.name?.trim() || '';
    const key = rawName.toLowerCase();

    const existing = contactsMap.get(key);
    if (existing) {
      existing.encounters.push(encounter);
    } else {
      contactsMap.set(key, {
        name: rawName,
        encounters: [encounter],
      });
    }
  }

  const result: HouseholdContactSummary[] = [];

  for (const [normalizedName, { name, encounters: contactEncounters }] of contactsMap.entries()) {
    const latest = contactEncounters[0];
    const rawGender = latest.gender?.toLowerCase();
    const gender: 'male' | 'female' | 'unknown' =
      rawGender === 'male' || rawGender === 'female' ? rawGender : 'unknown';

    const rawAge = latest.ageGroup?.toLowerCase();
    const ageGroup: 'youth' | 'young_adult' | 'adult' | 'senior' | 'unknown' =
      rawAge === 'youth' || rawAge === 'young_adult' || rawAge === 'adult' || rawAge === 'senior'
        ? rawAge
        : 'unknown';

    result.push({
      name,
      normalizedName,
      encountersCount: contactEncounters.length,
      gender,
      ageGroup,
      language: latest.language || latest.languageSpoken || undefined,
      latestEncounter: latest,
      lastVisitDate: latest.visitDate || latest.createdAt || '',
      lastResponse: latest.response || 'receptive',
      lastTopicDiscussed: latest.topicDiscussed || latest.topicsDiscussed || undefined,
      lastLiteratureAccepted: latest.literatureAccepted || latest.literatureOffered || undefined,
      nextVisitPlannedTopic: latest.nextVisitNotes || undefined,
      nextVisitDate: latest.nextVisitDate || undefined,
      notes: latest.notes || undefined,
      bibleStudyInterest: Boolean(latest.bibleStudyInterest),
      householdAddress: latest.householdAddress || undefined,
      territoryId: latest.territoryId || undefined,
      matchScope: 'household',
      allEncounters: contactEncounters,
    });
  }

  return result;
}
