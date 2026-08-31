// src/lib/__tests__/status-rules.test.ts
import { describe, expect, it } from 'vitest';
import {
  getAppointmentScheduleState,
  getHouseholdStatusMeta,
  normalizeEncounterResponse,
  normalizeHouseholdStatus,
  normalizeVisitOutcome,
  resolveHouseholdStatusAfter,
} from '../status-rules';

describe('status-rules', () => {
  describe('normalization', () => {
    it('normalizes legacy and alias household statuses', () => {
      expect(normalizeHouseholdStatus('active')).toBe('available');
      expect(normalizeHouseholdStatus('visited')).toBe('available');
      expect(normalizeHouseholdStatus('regular')).toBe('available');
      expect(normalizeHouseholdStatus('return_visit')).toBe('return_visit');
      expect(normalizeHouseholdStatus('rv')).toBe('return_visit');
      expect(normalizeHouseholdStatus('study_conducted')).toBe('bible_study');
      expect(normalizeHouseholdStatus('bible_study')).toBe('bible_study');
      expect(normalizeHouseholdStatus('do_not_call')).toBe('do_not_visit');
      expect(normalizeHouseholdStatus('dnc')).toBe('do_not_visit');
      expect(normalizeHouseholdStatus('unoccupied')).toBe('vacant');
      expect(normalizeHouseholdStatus('gated')).toBe('inaccessible');
      expect(normalizeHouseholdStatus('new')).toBe('new');
      expect(normalizeHouseholdStatus(null)).toBe('new');
    });

    it('normalizes legacy and alias visit outcomes', () => {
      expect(normalizeVisitOutcome('return_visit')).toBe('return_visit_completed');
      expect(normalizeVisitOutcome('return_visit_completed')).toBe('return_visit_completed');
      expect(normalizeVisitOutcome('return_visit_missed')).toBe('return_visit_missed');
      expect(normalizeVisitOutcome('study_conducted')).toBe('study_conducted');
      expect(normalizeVisitOutcome('study_offered')).toBe('study_offered');
      expect(normalizeVisitOutcome('study_missed')).toBe('study_missed');
      expect(normalizeVisitOutcome('contacted')).toBe('answered');
      expect(normalizeVisitOutcome('answered')).toBe('answered');
      expect(normalizeVisitOutcome('placed_literature')).toBe('literature_placed');
      expect(normalizeVisitOutcome('do_not_call')).toBe('do_not_visit');
      expect(normalizeVisitOutcome(null)).toBe('answered');
    });

    it('normalizes legacy and alias encounter responses', () => {
      expect(normalizeEncounterResponse('interested')).toBe('receptive');
      expect(normalizeEncounterResponse('receptive')).toBe('receptive');
      expect(normalizeEncounterResponse('study_accepted')).toBe('study_accepted');
      expect(normalizeEncounterResponse('return_visit')).toBe('return_visit_requested');
      expect(normalizeEncounterResponse('return_visit_agreed')).toBe('return_visit_requested');
      expect(normalizeEncounterResponse('uninterested')).toBe('not_interested');
      expect(normalizeEncounterResponse('do_not_call')).toBe('do_not_visit_demanded');
      expect(normalizeEncounterResponse('foreign_speaker')).toBe('foreign_speaker');
      expect(normalizeEncounterResponse(null)).toBe('neutral');
    });
  });

  describe('resolveHouseholdStatusAfter', () => {
    it('resolves Bible study conducted to bible_study', () => {
      expect(resolveHouseholdStatusAfter('study_conducted', null, 'available')).toBe('bible_study');
      expect(resolveHouseholdStatusAfter('answered', 'study_accepted', 'available')).toBe('bible_study');
    });

    it('retains bible_study standing when study is missed or resident is not home', () => {
      expect(resolveHouseholdStatusAfter('study_missed', null, 'bible_study')).toBe('bible_study');
      expect(resolveHouseholdStatusAfter('not_home', null, 'bible_study')).toBe('bible_study');
      expect(resolveHouseholdStatusAfter('busy', null, 'bible_study')).toBe('bible_study');
    });

    it('resolves return visit completed or requested to return_visit', () => {
      expect(resolveHouseholdStatusAfter('return_visit_completed', null, 'available')).toBe('return_visit');
      expect(resolveHouseholdStatusAfter('answered', 'return_visit_requested', 'available')).toBe('return_visit');
      expect(resolveHouseholdStatusAfter('answered', 'receptive', 'available')).toBe('return_visit');
    });

    it('retains return_visit standing when return visit is missed', () => {
      expect(resolveHouseholdStatusAfter('return_visit_missed', null, 'return_visit')).toBe('return_visit');
      expect(resolveHouseholdStatusAfter('not_home', null, 'return_visit')).toBe('return_visit');
    });

    it('resolves hard stops regardless of previous standing', () => {
      expect(resolveHouseholdStatusAfter('do_not_visit', null, 'return_visit')).toBe('do_not_visit');
      expect(resolveHouseholdStatusAfter('answered', 'do_not_visit_demanded', 'bible_study')).toBe('do_not_visit');
      expect(resolveHouseholdStatusAfter('answered', 'hostile', 'available')).toBe('do_not_visit');
      expect(resolveHouseholdStatusAfter('vacant', null, 'available')).toBe('vacant');
      expect(resolveHouseholdStatusAfter('moved', null, 'return_visit')).toBe('moved');
      expect(resolveHouseholdStatusAfter('inaccessible', null, 'available')).toBe('inaccessible');
      expect(resolveHouseholdStatusAfter('foreign_language', null, 'available')).toBe('foreign_language');
    });

    it('resolves general conversation to available', () => {
      expect(resolveHouseholdStatusAfter('answered', 'neutral', 'new')).toBe('available');
      expect(resolveHouseholdStatusAfter('literature_placed', 'neutral', 'new')).toBe('available');
    });
  });

  describe('getAppointmentScheduleState', () => {
    const fixedNow = new Date('2026-08-31T12:00:00Z').getTime();

    it('returns none when no appointment date is provided', () => {
      expect(getAppointmentScheduleState(null, null, fixedNow)).toEqual({ type: 'none' });
    });

    it('identifies upcoming appointments with days remaining', () => {
      const futureDate = '2026-09-03T12:00:00Z'; // 3 days ahead
      const result = getAppointmentScheduleState(futureDate, null, fixedNow);
      expect(result.type).toBe('upcoming');
      if (result.type === 'upcoming') {
        expect(result.daysRemaining).toBe(3);
        expect(result.dateStr).toBe(futureDate);
      }
    });

    it('identifies overdue appointments when scheduled date is in the past', () => {
      const pastDate = '2026-08-27T12:00:00Z'; // 4 days ago
      const result = getAppointmentScheduleState(pastDate, null, fixedNow);
      expect(result.type).toBe('overdue');
      if (result.type === 'overdue') {
        expect(result.daysOverdue).toBe(4);
        expect(result.dateStr).toBe(pastDate);
      }
    });

    it('identifies completed appointments when subsequent visit occurred', () => {
      const pastDate = '2026-08-25T12:00:00Z';
      const laterVisitDate = '2026-08-26T14:00:00Z';
      const result = getAppointmentScheduleState(pastDate, laterVisitDate, fixedNow);
      expect(result.type).toBe('completed');
      if (result.type === 'completed') {
        expect(result.dateStr).toBe(pastDate);
      }
    });
  });

  describe('getHouseholdStatusMeta', () => {
    it('returns valid colors and labels for statuses', () => {
      const bsMeta = getHouseholdStatusMeta('bible_study');
      expect(bsMeta.label).toBe('Bible Study');
      expect(bsMeta.pinColor).toBe('#8b5cf6');

      const rvMeta = getHouseholdStatusMeta('return_visit');
      expect(rvMeta.label).toBe('Return Visit');
      expect(rvMeta.pinColor).toBe('#3b82f6');

      const dncMeta = getHouseholdStatusMeta('do_not_visit');
      expect(dncMeta.label).toBe('Do Not Call');
      expect(dncMeta.pinColor).toBe('#ef4444');
    });
  });
});
