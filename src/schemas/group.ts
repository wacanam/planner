import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(255),
});
export type CreateGroupFormData = z.infer<typeof createGroupSchema>;
