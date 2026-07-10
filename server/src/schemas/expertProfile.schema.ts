import { z } from 'zod';

export const upsertExpertProfileSchema = z.object({
  specialty: z.string().min(1).max(100),
  focusArea: z.string().min(1).max(150),
  bio: z.string().min(1).max(2000),
  credentials: z.string().max(1000).optional(),
  yearsExperience: z.number().int().min(0).max(80).optional(),
  isAcceptingBookings: z.boolean().optional(),
});

export type UpsertExpertProfileInput = z.infer<typeof upsertExpertProfileSchema>;
