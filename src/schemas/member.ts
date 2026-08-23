import { z } from 'zod';

export const editMemberRoleSchema = z.object({
  congregationRole: z
    .enum([
      'service_overseer',
      'secretary',
      'territory_servant',
      'circuit_overseer',
      'publisher',
      'visiting_publisher',
    ])
    .nullable(),
});
export type EditMemberRoleFormData = z.infer<typeof editMemberRoleSchema>;

export const reviewJoinRequestSchema = z.object({
  reviewNote: z.string().max(500).optional(),
});
export type ReviewJoinRequestFormData = z.infer<typeof reviewJoinRequestSchema>;

export const declineEndorsementSchema = z.object({
  reason: z
    .string()
    .min(1, 'Reason for declining is required')
    .max(500, 'Reason cannot exceed 500 characters'),
});
export type DeclineEndorsementFormData = z.infer<typeof declineEndorsementSchema>;
