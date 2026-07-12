import { z } from 'zod';

const activityLevels = ['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE'] as const;
const goals = [
  'LOSE_WEIGHT',
  'GAIN_MUSCLE',
  'MAINTAIN_WEIGHT',
  'HEALTHY_EATING',
  'IMPROVE_STAMINA',
] as const;

export const healthProfileSchema = z.object({
  age: z.number().int().min(0).max(150).optional(),
  heightCm: z.number().positive().max(300).optional(),
  weightKg: z.number().positive().max(500).optional(),
  bloodGroup: z.string().max(10).optional(),
  activityLevel: z.enum(activityLevels).optional(),
  goal: z.enum(goals).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  sleepGoalHours: z.number().min(0).max(24).optional(),
  waterIntakeMl: z.number().int().min(0).max(20000).optional(),
  diseases: z.array(z.string().max(100)).max(50).default([]),
  allergies: z.array(z.string().max(100)).max(50).default([]),
  foodPreferences: z.array(z.string().max(100)).max(50).default([]),
});

export type HealthProfileInput = z.infer<typeof healthProfileSchema>;
