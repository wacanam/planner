import { z } from 'zod';
import { normalizeCongregationName } from '@/lib/congregations';

export const createCongregationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Congregation name must be at least 2 characters')
    .max(255, 'Congregation name must not exceed 255 characters')
    .transform((val) => normalizeCongregationName(val)),
  city: z.string().max(255).optional(),
  country: z.string().max(100).optional(),
});
export type CreateCongregationFormData = z.infer<typeof createCongregationSchema>;

export const updateCongregationSchema = createCongregationSchema.partial().extend({
  status: z.enum(['active', 'inactive']).optional(),
});
export type UpdateCongregationFormData = z.infer<typeof updateCongregationSchema>;
