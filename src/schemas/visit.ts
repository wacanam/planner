import { z } from 'zod';

export const logVisitSchema = z.object({
  outcome: z.enum(['answered', 'not_home', 'do_not_call', 'moved', 'other'], {
    error: () => ({ message: 'Please select an outcome' }),
  }),
  notes: z.string().max(1000).optional(),
  duration: z.number().min(1).max(300).optional(),
  returnVisitPlanned: z.boolean().optional(),
  nextVisitDate: z.string().optional(),
  householdStatusAfter: z
    .enum(['NEW', 'VISITED', 'RETURN_VISIT', 'DO_NOT_CALL', 'MOVED'])
    .optional(),
});
export type LogVisitFormData = z.infer<typeof logVisitSchema>;

export const addHouseholdSchema = z.object({
  address: z.string().min(1, 'Address is required').max(255),
  streetName: z.string().min(1, 'Street name is required').max(255),
  city: z.string().min(1, 'City is required').max(255),
  notes: z.string().max(500).optional(),
});
export type AddHouseholdFormData = z.infer<typeof addHouseholdSchema>;
