// mobile/src/lib/teaching-metrics.ts
// Pure computation utilities for Interested Contacts, Return Visits (visited & missed), and Bible Studies (conducted, offered, missed).

import { isDateInServiceYear } from '@/lib/service-year';
import {
  getAppointmentScheduleState,
  normalizeEncounterResponse,
  normalizeHouseholdStatus,
  normalizeVisitOutcome,
} from '@/lib/status-rules';
import type {
  Encounter,
  Group,
  Household,
  Member,
  MinistryTeachingMetrics,
  TeachingAnalyticsReport,
  Visit,
} from '@/types/api';

export interface CalculateMetricsOptions {
  serviceYear?: number | 'all';
  now?: number;
}

/**
 * Checks if a household or encounter represents an interested resident.
 */
export function isInterestedContact(hOrE: Household | Encounter | null | undefined): boolean {
  if (!hOrE) return false;

  if ('response' in hOrE || 'bibleStudyInterest' in hOrE || 'returnVisitRequested' in hOrE) {
    const enc = hOrE as Encounter;
    const resp = normalizeEncounterResponse(enc.response);
    return (
      resp === 'receptive' ||
      resp === 'study_accepted' ||
      resp === 'study_offered' ||
      resp === 'return_visit_requested' ||
      Boolean(enc.bibleStudyInterest) ||
      Boolean(enc.returnVisitRequested)
    );
  }

  const h = hOrE as Household;
  const s = normalizeHouseholdStatus(h.status);
  const outcome = normalizeVisitOutcome(h.lastVisitOutcome);
  const notes = (h.notes || '').toLowerCase();
  return (
    s === 'return_visit' ||
    s === 'bible_study' ||
    outcome === 'return_visit_completed' ||
    outcome === 'study_conducted' ||
    outcome === 'study_offered' ||
    notes.includes('study') ||
    notes.includes('interested')
  );
}

/**
 * Calculates ministry teaching metrics for a subset of households, visits, and encounters.
 */
export function calculateMinistryTeachingMetrics(
  households: Household[] = [],
  visits: Visit[] = [],
  encounters: Encounter[] = [],
  options?: CalculateMetricsOptions
): MinistryTeachingMetrics {
  const serviceYear = options?.serviceYear ?? 'all';
  const now = options?.now ?? Date.now();

  const relevantVisits =
    serviceYear === 'all'
      ? visits
      : visits.filter((v) => isDateInServiceYear(v.visitDate, serviceYear));

  const relevantEncounters =
    serviceYear === 'all'
      ? encounters
      : encounters.filter((e) => isDateInServiceYear(e.createdAt || e.visitDate, serviceYear));

  // 1. Return Visits
  let rvVisited = 0;
  let rvMissed = 0;
  let rvUpcoming = 0;

  // 2. Bible Studies
  let studiesConducted = 0;
  let studiesOffered = 0;
  let studiesMissed = 0;

  // Track unique households with active ongoing studies
  const activeStudyHouseholdIds = new Set<string>();

  for (const v of relevantVisits) {
    const outcome = normalizeVisitOutcome(v.outcome);
    const isMissedFlag = Boolean(v.isAppointmentMissed);

    // Return Visit Visited
    if (
      outcome === 'return_visit_completed' ||
      (outcome === 'answered' && v.householdStatusBefore === 'return_visit')
    ) {
      rvVisited += 1;
    }

    // Return Visit Missed
    if (
      outcome === 'return_visit_missed' ||
      (isMissedFlag && v.scheduledAppointmentType === 'return_visit')
    ) {
      rvMissed += 1;
    }

    // Study Conducted
    if (outcome === 'study_conducted' || v.bibleStudyStatus === 'conducted') {
      studiesConducted += 1;
      if (v.householdId) {
        activeStudyHouseholdIds.add(v.householdId);
      }
    }

    // Study Offered
    if (outcome === 'study_offered' || v.studyOffered || v.bibleStudyStatus === 'offered') {
      studiesOffered += 1;
    }

    // Study Missed
    if (
      outcome === 'study_missed' ||
      (isMissedFlag && v.scheduledAppointmentType === 'bible_study') ||
      v.bibleStudyStatus === 'missed'
    ) {
      studiesMissed += 1;
    }
  }

  // Count offers & study interests in encounters
  let encounterReceptiveCount = 0;
  let encounterStudyInterestedCount = 0;
  let encounterRVRequestedCount = 0;

  for (const e of relevantEncounters) {
    const resp = normalizeEncounterResponse(e.response);
    if (resp === 'receptive') {
      encounterReceptiveCount += 1;
    }
    if (resp === 'study_offered' || e.studyOffered) {
      studiesOffered += 1;
    }
    if (resp === 'study_accepted' || e.bibleStudyInterest) {
      encounterStudyInterestedCount += 1;
      if (e.householdId) {
        activeStudyHouseholdIds.add(e.householdId);
      }
    }
    if (resp === 'return_visit_requested' || e.returnVisitRequested) {
      encounterRVRequestedCount += 1;
    }
  }

  // Evaluate household scheduled appointments (automated overdue detection)
  const visitsByHousehold = new Map<string, Visit[]>();
  for (const v of visits) {
    if (v.householdId) {
      if (!visitsByHousehold.has(v.householdId)) {
        visitsByHousehold.set(v.householdId, []);
      }
      visitsByHousehold.get(v.householdId)?.push(v);
    }
  }

  for (const h of households) {
    const normHStatus = normalizeHouseholdStatus(h.status);
    if (normHStatus === 'bible_study' || h.notes?.toLowerCase().includes('study')) {
      activeStudyHouseholdIds.add(h.id);
    }

    const hVisits = visitsByHousehold.get(h.id) || [];

    // Check scheduled follow-up dates from latest visits
    for (const v of hVisits) {
      if (v.nextVisitDate) {
        const scheduleState = getAppointmentScheduleState(v.nextVisitDate, h.lastVisitDate, now);
        if (scheduleState.type === 'upcoming') {
          rvUpcoming += 1;
        } else if (scheduleState.type === 'overdue') {
          const vOutcome = normalizeVisitOutcome(v.outcome);
          if (v.scheduledAppointmentType === 'bible_study' || vOutcome === 'study_conducted') {
            studiesMissed += 1;
          } else {
            rvMissed += 1;
          }
        }
      }
    }
  }

  // 3. Interested Count & Breakdown
  const householdIdsSet = new Set(households.map((h) => h.id));
  const interestedHouseholds = households.filter((h) => isInterestedContact(h));
  const interestedEncounters = relevantEncounters.filter((e) => isInterestedContact(e));
  const unlinkedInterestedEncounters = interestedEncounters.filter(
    (e) => !e.householdId || !householdIdsSet.has(e.householdId)
  );
  const totalInterested = interestedHouseholds.length + unlinkedInterestedEncounters.length;

  const studyInterestedHouseholds = households.filter(
    (h) => h.status === 'study_conducted' || h.notes?.toLowerCase().includes('study')
  ).length;

  return {
    interestedContacts: {
      total: totalInterested,
      receptive: encounterReceptiveCount,
      studyInterested: encounterStudyInterestedCount + studyInterestedHouseholds,
      returnVisitRequested: encounterRVRequestedCount + interestedHouseholds.length,
    },
    interestedCount: totalInterested,
    returnVisits: {
      total: rvVisited + rvMissed,
      visited: rvVisited,
      missed: rvMissed,
      upcoming: rvUpcoming,
    },
    bibleStudies: {
      conducted: studiesConducted,
      offered: studiesOffered,
      missed: studiesMissed,
      activeCount: activeStudyHouseholdIds.size,
    },
  };
}

/**
 * Builds a complete TeachingAnalyticsReport broken down by Congregation, Group, and Publisher.
 */
export function buildTeachingAnalyticsReport(
  households: Household[] = [],
  visits: Visit[] = [],
  encounters: Encounter[] = [],
  groups: Group[] = [],
  members: Member[] = [],
  options?: CalculateMetricsOptions
): TeachingAnalyticsReport {
  const totals = calculateMinistryTeachingMetrics(households, visits, encounters, options);

  // Group Map (from both members list and groups.members)
  const memberGroupMap = new Map<string, string>();
  for (const m of members) {
    if (m.groupId) {
      memberGroupMap.set(m.userId || m.id, m.groupId);
    }
  }
  for (const g of groups) {
    for (const gm of g.members || []) {
      const uid = gm.userId || (gm as any).id;
      if (uid) memberGroupMap.set(uid, g.id);
    }
    if (g.overseerId) memberGroupMap.set(g.overseerId, g.id);
    if (g.assistantOverseerId) memberGroupMap.set(g.assistantOverseerId, g.id);
  }

  // By Group
  const byGroup = groups.map((group) => {
    const groupMemberUids = new Set<string>();

    for (const [uid, gId] of memberGroupMap.entries()) {
      if (gId === group.id) groupMemberUids.add(uid);
    }
    if (group.overseerId) groupMemberUids.add(group.overseerId);
    if (group.assistantOverseerId) groupMemberUids.add(group.assistantOverseerId);

    for (const m of members) {
      if (m.groupId === group.id) {
        groupMemberUids.add(m.userId || m.id);
      }
    }

    const groupVisits = visits.filter((v) => v.userId && groupMemberUids.has(v.userId));
    const groupEncounters = encounters.filter((e) => e.userId && groupMemberUids.has(e.userId));
    const groupHouseholds = households.filter(
      (h) =>
        (h.createdById && groupMemberUids.has(h.createdById)) ||
        h.collaboratorIds?.some((id) => groupMemberUids.has(id))
    );

    const groupMetrics = calculateMinistryTeachingMetrics(
      groupHouseholds,
      groupVisits,
      groupEncounters,
      options
    );

    const memberCount =
      group.members?.length ||
      members.filter((m) => m.groupId === group.id).length;

    return {
      groupId: group.id,
      name: group.name,
      overseerName: group.overseerName || null,
      memberCount,
      metrics: groupMetrics,
    };
  });

  // By Publisher
  const byPublisher = members.map((member) => {
    const uid = member.userId || member.id;
    const pubVisits = visits.filter((v) => v.userId === uid);
    const pubEncounters = encounters.filter((e) => e.userId === uid);
    const pubHouseholds = households.filter(
      (h) => h.createdById === uid || h.collaboratorIds?.includes(uid)
    );

    const pubMetrics = calculateMinistryTeachingMetrics(
      pubHouseholds,
      pubVisits,
      pubEncounters,
      options
    );

    const groupId = member.groupId || memberGroupMap.get(uid);
    const group = groups.find((g) => g.id === groupId);

    return {
      userId: uid,
      name: member.user?.name || 'Publisher',
      email: member.user?.email || '',
      role: member.congregationRole || undefined,
      groupName: group?.name || undefined,
      metrics: pubMetrics,
    };
  });

  return {
    totals,
    byGroup,
    byPublisher,
    serviceYear: options?.serviceYear,
  };
}
