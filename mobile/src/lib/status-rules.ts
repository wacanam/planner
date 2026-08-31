// mobile/src/lib/status-rules.ts
// Centralized domain rules, enums, transition logic, and normalization for House, Visit, and Encounter entities.

export type HouseholdStatus =
  | 'new'
  | 'available'
  | 'return_visit'
  | 'bible_study'
  | 'not_home'
  | 'busy'
  | 'do_not_visit'
  | 'foreign_language'
  | 'inaccessible'
  | 'vacant'
  | 'moved'
  | 'inactive';

export type VisitOutcome =
  | 'answered'
  | 'not_home'
  | 'busy'
  | 'return_visit_completed'
  | 'return_visit_missed'
  | 'study_conducted'
  | 'study_offered'
  | 'study_missed'
  | 'literature_placed'
  | 'minor_only'
  | 'foreign_language'
  | 'inaccessible'
  | 'vacant'
  | 'do_not_visit'
  | 'moved'
  | 'other';

export type EncounterResponse =
  | 'receptive'
  | 'study_accepted'
  | 'study_offered'
  | 'return_visit_requested'
  | 'neutral'
  | 'busy'
  | 'not_interested'
  | 'hostile'
  | 'do_not_visit_demanded'
  | 'foreign_speaker'
  | 'minor'
  | 'moving_away';

export type AppointmentScheduleState =
  | { type: 'none' }
  | { type: 'upcoming'; daysRemaining: number; dateStr: string }
  | { type: 'overdue'; daysOverdue: number; dateStr: string }
  | { type: 'completed'; dateStr: string };

/**
 * Normalizes legacy or alternative household status strings to canonical HouseholdStatus.
 */
export function normalizeHouseholdStatus(rawStatus?: string | null): HouseholdStatus {
  if (!rawStatus) return 'new';
  const s = rawStatus.toLowerCase().trim();

  switch (s) {
    case 'active':
    case 'visited':
    case 'regular':
      return 'available';
    case 'return_visit':
    case 'rv':
      return 'return_visit';
    case 'bible_study':
    case 'study_conducted':
    case 'study':
      return 'bible_study';
    case 'not_home':
    case 'nothome':
      return 'not_home';
    case 'busy':
      return 'busy';
    case 'do_not_visit':
    case 'do_not_call':
    case 'dnc':
      return 'do_not_visit';
    case 'foreign_language':
    case 'language':
      return 'foreign_language';
    case 'inaccessible':
    case 'gated':
      return 'inaccessible';
    case 'vacant':
    case 'unoccupied':
      return 'vacant';
    case 'moved':
      return 'moved';
    case 'inactive':
    case 'archived':
      return 'inactive';
    case 'new':
    case 'unvisited':
    default:
      return 'new';
  }
}

/**
 * Normalizes legacy or alternative visit outcome strings to canonical VisitOutcome.
 */
export function normalizeVisitOutcome(rawOutcome?: string | null): VisitOutcome {
  if (!rawOutcome) return 'answered';
  const o = rawOutcome.toLowerCase().trim();

  switch (o) {
    case 'return_visit':
    case 'return_visit_completed':
    case 'rv_completed':
      return 'return_visit_completed';
    case 'return_visit_missed':
    case 'rv_missed':
      return 'return_visit_missed';
    case 'study_conducted':
    case 'study_done':
      return 'study_conducted';
    case 'study_offered':
      return 'study_offered';
    case 'study_missed':
    case 'study_cancelled':
      return 'study_missed';
    case 'not_home':
    case 'not home':
      return 'not_home';
    case 'busy':
      return 'busy';
    case 'literature_placed':
    case 'placed_literature':
      return 'literature_placed';
    case 'minor_only':
    case 'minor':
      return 'minor_only';
    case 'foreign_language':
      return 'foreign_language';
    case 'inaccessible':
      return 'inaccessible';
    case 'vacant':
      return 'vacant';
    case 'do_not_visit':
    case 'do_not_call':
      return 'do_not_visit';
    case 'moved':
      return 'moved';
    case 'answered':
    case 'contacted':
    case 'conversation':
      return 'answered';
    default:
      return 'other';
  }
}

/**
 * Normalizes legacy or alternative encounter response strings to canonical EncounterResponse.
 */
export function normalizeEncounterResponse(rawResponse?: string | null): EncounterResponse {
  if (!rawResponse) return 'neutral';
  const r = rawResponse.toLowerCase().trim();

  switch (r) {
    case 'receptive':
    case 'interested':
      return 'receptive';
    case 'study_accepted':
      return 'study_accepted';
    case 'study_offered':
      return 'study_offered';
    case 'return_visit_requested':
    case 'return_visit_agreed':
    case 'return_visit':
      return 'return_visit_requested';
    case 'busy':
      return 'busy';
    case 'not_interested':
    case 'uninterested':
      return 'not_interested';
    case 'hostile':
    case 'opposed':
      return 'hostile';
    case 'do_not_visit':
    case 'do_not_visit_demanded':
    case 'do_not_call':
      return 'do_not_visit_demanded';
    case 'foreign_language':
    case 'foreign_speaker':
      return 'foreign_speaker';
    case 'minor':
    case 'child':
      return 'minor';
    case 'moved':
    case 'moving_away':
      return 'moving_away';
    case 'neutral':
    default:
      return 'neutral';
  }
}

/**
 * Resolves what the resulting Household status should be after a visit / encounter.
 * Provides smart domain recommendations while never forcing a household into a 'missed' state.
 */
export function resolveHouseholdStatusAfter(
  visitOutcome: VisitOutcome | string,
  encounterResponse?: EncounterResponse | string | null,
  currentHouseholdStatus?: HouseholdStatus | string | null
): HouseholdStatus {
  const normOutcome = normalizeVisitOutcome(visitOutcome);
  const normResponse = encounterResponse ? normalizeEncounterResponse(encounterResponse) : null;
  const curr = normalizeHouseholdStatus(currentHouseholdStatus);

  // 1. Critical Hard Stops (Do Not Call, Inaccessible, Vacant, Moved)
  if (normOutcome === 'do_not_visit' || normResponse === 'do_not_visit_demanded' || normResponse === 'hostile') {
    return 'do_not_visit';
  }
  if (normOutcome === 'vacant') {
    return 'vacant';
  }
  if (normOutcome === 'moved' || normResponse === 'moving_away') {
    return 'moved';
  }
  if (normOutcome === 'inaccessible') {
    return 'inaccessible';
  }
  if (normOutcome === 'foreign_language' || normResponse === 'foreign_speaker') {
    return 'foreign_language';
  }

  // 2. Bible Study Pipeline
  if (normOutcome === 'study_conducted' || normResponse === 'study_accepted') {
    return 'bible_study';
  }
  if (normOutcome === 'study_missed') {
    // If the house is already a Bible study, it stays a Bible study (missed visit does NOT demote the house)
    return curr === 'bible_study' ? 'bible_study' : 'return_visit';
  }

  // 3. Return Visit Pipeline
  if (
    normOutcome === 'return_visit_completed' ||
    normResponse === 'return_visit_requested' ||
    normResponse === 'receptive' ||
    normOutcome === 'study_offered' ||
    normResponse === 'study_offered'
  ) {
    // If house is already a Bible study and an RV is conducted, retain bible_study
    return curr === 'bible_study' ? 'bible_study' : 'return_visit';
  }
  if (normOutcome === 'return_visit_missed') {
    // If house already is a return visit or bible study, it remains in that standing
    if (curr === 'bible_study') return 'bible_study';
    return 'return_visit';
  }

  // 4. Temporary Outcomes
  if (normOutcome === 'busy' || normResponse === 'busy') {
    // If already in RV/Study pipeline, preserve standing
    if (curr === 'bible_study' || curr === 'return_visit') return curr;
    return 'busy';
  }
  if (normOutcome === 'not_home') {
    // If already in RV/Study pipeline, preserve standing so publisher doesn't lose their follow-up
    if (curr === 'bible_study' || curr === 'return_visit') return curr;
    return 'not_home';
  }

  // 5. Standard Answered / Neutral / Not Interested
  if (curr === 'bible_study' || curr === 'return_visit') {
    // If resident explicitly became uninterested, return to available
    if (normResponse === 'not_interested') {
      return 'available';
    }
    return curr;
  }

  return 'available';
}

/**
 * Calculates the dynamic temporal schedule state for a follow-up or Bible study appointment.
 */
export function getAppointmentScheduleState(
  nextVisitDate?: string | null,
  lastVisitDate?: string | null,
  nowMs = Date.now()
): AppointmentScheduleState {
  if (!nextVisitDate) return { type: 'none' };

  const scheduledMs = new Date(nextVisitDate).getTime();
  if (Number.isNaN(scheduledMs)) return { type: 'none' };

  const lastVisitMs = lastVisitDate ? new Date(lastVisitDate).getTime() : 0;

  // If a subsequent visit occurred after the scheduled appointment, it was fulfilled/rescheduled
  if (lastVisitMs > scheduledMs) {
    return { type: 'completed', dateStr: nextVisitDate };
  }

  const diffDays = Math.round((scheduledMs - nowMs) / (1000 * 60 * 60 * 24));

  if (scheduledMs > nowMs) {
    return {
      type: 'upcoming',
      daysRemaining: Math.max(0, diffDays),
      dateStr: nextVisitDate,
    };
  }

  const daysOverdue = Math.max(1, Math.abs(diffDays));
  return {
    type: 'overdue',
    daysOverdue,
    dateStr: nextVisitDate,
  };
}

/**
 * Metadata for rendering House Status badges, map pins, and UI labels.
 */
export function getHouseholdStatusMeta(status: HouseholdStatus | string) {
  const norm = normalizeHouseholdStatus(status);
  switch (norm) {
    case 'bible_study':
      return { label: 'Bible Study', color: '#8b5cf6', badgeVariant: 'purple' as const, pinColor: '#8b5cf6' };
    case 'return_visit':
      return { label: 'Return Visit', color: '#3b82f6', badgeVariant: 'blue' as const, pinColor: '#3b82f6' };
    case 'not_home':
      return { label: 'Not Home', color: '#f59e0b', badgeVariant: 'warning' as const, pinColor: '#f59e0b' };
    case 'busy':
      return { label: 'Busy', color: '#f97316', badgeVariant: 'orange' as const, pinColor: '#f97316' };
    case 'do_not_visit':
      return { label: 'Do Not Call', color: '#ef4444', badgeVariant: 'destructive' as const, pinColor: '#ef4444' };
    case 'foreign_language':
      return { label: 'Foreign Language', color: '#06b6d4', badgeVariant: 'cyan' as const, pinColor: '#06b6d4' };
    case 'inaccessible':
      return { label: 'Inaccessible', color: '#64748b', badgeVariant: 'secondary' as const, pinColor: '#64748b' };
    case 'vacant':
      return { label: 'Vacant', color: '#94a3b8', badgeVariant: 'outline' as const, pinColor: '#94a3b8' };
    case 'moved':
      return { label: 'Moved', color: '#a855f7', badgeVariant: 'secondary' as const, pinColor: '#a855f7' };
    case 'inactive':
      return { label: 'Inactive', color: '#cbd5e1', badgeVariant: 'outline' as const, pinColor: '#cbd5e1' };
    case 'available':
      return { label: 'Available', color: '#10b981', badgeVariant: 'success' as const, pinColor: '#10b981' };
    case 'new':
    default:
      return { label: 'New / Unvisited', color: '#6366f1', badgeVariant: 'default' as const, pinColor: '#6366f1' };
  }
}
