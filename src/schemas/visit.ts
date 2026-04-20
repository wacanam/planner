import { z } from 'zod';

export const addHouseholdSchema = z.object({
  address: z.string().min(1, 'Address is required').max(255),
  houseNumber: z.string().max(50).optional(),
  unitNumber: z.string().max(50).optional(),
  streetName: z.string().min(1, 'Street name is required').max(255),
  city: z.string().min(1, 'City is required').max(255),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  type: z.enum([
    'house',
    'apartment',
    'condo',
    'townhouse',
    'mobile_home',
    'business',
    'other',
  ] as const),
  floor: z.number().int().optional(),
  notes: z.string().max(500).optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});
export type AddHouseholdFormData = z.infer<typeof addHouseholdSchema>;

export const logVisitSchema = z.object({
  outcome: z.enum([
    'answered',
    'not_home',
    'return_visit',
    'do_not_visit',
    'moved',
    'other',
  ] as const),
  householdStatusAfter: z
    .enum([
      'new',
      'active',
      'not_home',
      'return_visit',
      'do_not_visit',
      'moved',
      'inactive',
    ] as const)
    .optional(),
  duration: z.number().int().min(1).max(300).optional(),
  literatureLeft: z.string().max(500).optional(),
  bibleTopicDiscussed: z.string().max(255).optional(),
  returnVisitPlanned: z.boolean().optional(),
  nextVisitDate: z.string().optional(),
  nextVisitNotes: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});
export type LogVisitFormData = z.infer<typeof logVisitSchema>;

export const addEncounterSchema = z.object({
  name: z.string().max(255).optional(),
  gender: z.enum(['male', 'female', 'unknown'] as const).optional(),
  ageGroup: z.enum(['child', 'youth', 'adult', 'elderly'] as const).optional(),
  role: z.enum(['owner', 'tenant', 'family_member', 'visitor', 'unknown'] as const).optional(),
  response: z.enum([
    'receptive',
    'neutral',
    'not_interested',
    'hostile',
    'do_not_visit',
    'moved',
  ] as const),
  languageSpoken: z.string().max(100).optional(),
  topicDiscussed: z.string().max(255).optional(),
  literatureAccepted: z.string().max(500).optional(),
  bibleStudyInterest: z.boolean().optional(),
  returnVisitRequested: z.boolean().optional(),
  nextVisitNotes: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});
export type AddEncounterFormData = z.infer<typeof addEncounterSchema>;

export const recordEncounterSchema = addEncounterSchema.extend({
  householdId: z.string().uuid().optional().or(z.literal('')),
  encounterDate: z.string().optional(),
});
export type RecordEncounterFormData = z.infer<typeof recordEncounterSchema>;
