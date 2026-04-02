import { z } from 'zod';

export const createCongregationSchema = z.object({
  name: z.string().min(1, 'Congregation name is required').max(255),
  city: z.string().max(255).optional(),
  country: z.string().max(100).optional(),
});
export type CreateCongregationFormData = z.infer<typeof createCongregationSchema>;

export const updateCongregationSchema = createCongregationSchema.partial().extend({
  status: z.enum(['active', 'inactive']).optional(),
});
export type UpdateCongregationFormData = z.infer<typeof updateCongregationSchema>;
