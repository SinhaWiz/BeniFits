import { z } from 'zod';

export const generateWorkoutPlanSchema = z.object({
  title: z.string().min(1).max(150).optional(),
});

export type GenerateWorkoutPlanInput = z.infer<typeof generateWorkoutPlanSchema>;
