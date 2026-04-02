import { z } from 'zod';

export const createTerritorySchema = z.object({
  name: z.string().min(1, 'Territory name is required').max(255),
  number: z.string().min(1, 'Territory number is required').max(50),
  notes: z.string().max(2000).optional(),
});
export type CreateTerritoryFormData = z.infer<typeof createTerritorySchema>;

export const assignTerritorySchema = z.object({
  userId: z.string().uuid('Please select a publisher'),
  dueAt: z.string().optional(),
  notes: z.string().max(2000).optional(),
});
export type AssignTerritoryFormData = z.infer<typeof assignTerritorySchema>;

export const returnTerritorySchema = z.object({
  notes: z.string().max(2000).optional(),
});
export type ReturnTerritoryFormData = z.infer<typeof returnTerritorySchema>;

export const requestTerritorySchema = z.object({
  message: z.string().max(1000).optional(),
});
export type RequestTerritoryFormData = z.infer<typeof requestTerritorySchema>;

export const reviewTerritoryRequestSchema = z.object({
  responseMessage: z.string().max(1000).optional(),
});
export type ReviewTerritoryRequestFormData = z.infer<typeof reviewTerritoryRequestSchema>;
