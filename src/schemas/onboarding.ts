import { z } from 'zod';

export const joinRequestSchema = z.object({
  message: z.string().max(500).optional(),
});
export type JoinRequestFormData = z.infer<typeof joinRequestSchema>;
