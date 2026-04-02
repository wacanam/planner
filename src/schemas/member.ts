import { z } from 'zod';

export const editMemberRoleSchema = z.object({
  congregationRole: z.enum(['service_overseer', 'territory_servant']).nullable(),
});
export type EditMemberRoleFormData = z.infer<typeof editMemberRoleSchema>;

export const reviewJoinRequestSchema = z.object({
  reviewNote: z.string().max(500).optional(),
});
export type ReviewJoinRequestFormData = z.infer<typeof reviewJoinRequestSchema>;
