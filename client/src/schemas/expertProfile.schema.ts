import { z } from 'zod';

export const expertProfileFormSchema = z.object({
  specialty: z.string().min(1, 'Specialty is required').max(100),
  focusArea: z.string().min(1, 'Focus area is required').max(150),
  bio: z.string().min(1, 'Bio is required').max(2000),
  credentials: z.string().max(1000).optional(),
  yearsExperience: z.union([z.number().int().min(0).max(80), z.nan()]).optional(),
  isAcceptingBookings: z.boolean(),
});

export type ExpertProfileFormValues = z.infer<typeof expertProfileFormSchema>;
