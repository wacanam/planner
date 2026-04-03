import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
});
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmNewPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  });
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
