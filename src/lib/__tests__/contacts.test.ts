import { describe, expect, it } from 'vitest';
import { toContactView } from '@/lib/local-first/contacts';
import type { LocalContact, LocalHousehold } from '@/lib/local-first/types';

describe('Contacts Service & Mapping', () => {
  it('toContactView correctly maps LocalContact to Contact view format', () => {
    const localContact: LocalContact = {
      id: 'c-1',
      serverId: 'c-1',
      householdId: 'h-1',
      householdServerId: 'h-1',
      congregationId: 'cong-1',
      territoryId: 't-1',
      name: 'Jane Doe',
      gender: 'female',
      ageGroup: 'adult',
      language: 'Spanish',
      role: 'spouse',
      status: 'active',
      bestTimeToCall: 'Saturdays after 10am',
      bibleStudyInterest: true,
      notes: 'Very friendly',
      createdById: 'u-1',
      updatedById: 'u-1',
      deletedAt: null,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    };

    const household: LocalHousehold = {
      id: 'h-1',
      serverId: 'h-1',
      congregationId: 'cong-1',
      territoryId: 't-1',
      name: null,
      address: '123 Main St',
      houseNumber: '123',
      unitNumber: null,
      streetName: 'Main St',
      city: 'Springfield',
      postalCode: '12345',
      country: 'US',
      latitude: '40.7128',
      longitude: '-74.0060',
      type: 'house',
      floor: null,
      occupantsCount: 2,
      languages: 'Spanish',
      bestTimeToCall: null,
      status: 'active',
      lastVisitDate: null,
      lastVisitOutcome: null,
      notes: null,
      lwpNotes: null,
      createdById: 'u-1',
      creatorName: 'Pioneer',
      collaboratorIds: null,
      readOnlyUserIds: null,
      transferredFrom: null,
      transferredFromId: null,
      transferredAt: null,
      updatedById: null,
      deletedAt: null,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    };

    const contactView = toContactView(
      localContact,
      household,
      3,
      '2026-08-15T10:00:00Z',
      'receptive'
    );

    expect(contactView.id).toBe('c-1');
    expect(contactView.name).toBe('Jane Doe');
    expect(contactView.householdAddress).toBe('123 Main St');
    expect(contactView.householdCity).toBe('Springfield');
    expect(contactView.gender).toBe('female');
    expect(contactView.ageGroup).toBe('adult');
    expect(contactView.language).toBe('Spanish');
    expect(contactView.role).toBe('spouse');
    expect(contactView.status).toBe('active');
    expect(contactView.bestTimeToCall).toBe('Saturdays after 10am');
    expect(contactView.bibleStudyInterest).toBe(true);
    expect(contactView.encountersCount).toBe(3);
    expect(contactView.lastVisitDate).toBe('2026-08-15T10:00:00Z');
    expect(contactView.lastResponse).toBe('receptive');
  });

  it('handles fallback defaults when optional fields are null', () => {
    const minimalContact: LocalContact = {
      id: 'c-2',
      serverId: 'c-2',
      householdId: 'h-2',
      householdServerId: 'h-2',
      congregationId: null,
      territoryId: null,
      name: 'Unknown Person',
      gender: null,
      ageGroup: null,
      language: null,
      role: null,
      status: 'active',
      bestTimeToCall: null,
      bibleStudyInterest: false,
      notes: null,
      createdById: null,
      updatedById: null,
      deletedAt: null,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    };

    const contactView = toContactView(minimalContact);

    expect(contactView.id).toBe('c-2');
    expect(contactView.gender).toBe('unknown');
    expect(contactView.ageGroup).toBe('adult');
    expect(contactView.role).toBe('unknown');
    expect(contactView.status).toBe('active');
    expect(contactView.bibleStudyInterest).toBe(false);
    expect(contactView.householdAddress).toBeNull();
    expect(contactView.encountersCount).toBe(0);
  });
});
