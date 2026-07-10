import { z } from 'zod';

export const generateWeightLossPlanSchema = z.object({
  targetWeightKg: z.number().positive().max(500),
  durationWeeks: z.number().int().min(4).max(12),
});

export type GenerateWeightLossPlanInput = z.infer<typeof generateWeightLossPlanSchema>;

const weightLossWeekOutputSchema = z.object({
  weekNumber: z.number().int().min(1).max(12),
  targetCalories: z.number().int().min(800).max(6000),
  targetProteinG: z.number().min(0).max(400),
  workoutSummary: z.string().min(1).max(500),
  walkingGoalMinutes: z.number().int().min(0).max(300),
  waterGoalMl: z.number().int().min(0).max(6000),
  sleepGoalHours: z.number().min(0).max(14),
  notes: z.string().max(500),
});

export const weightLossPlanOutputSchema = z.object({
  summary: z.string().min(1).max(1000),
  weeks: z.array(weightLossWeekOutputSchema).min(1).max(12),
});

export type WeightLossPlanOutput = z.infer<typeof weightLossPlanOutputSchema>;
