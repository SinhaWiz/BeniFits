import { z } from 'zod';

const mealTypes = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const;

const dietPlanMealSchema = z.object({
  mealType: z.enum(mealTypes),
  description: z.string().min(1).max(200),
  fdcId: z.number().int().positive().optional(),
  calories: z.number().min(0).max(5000).optional(),
  proteinG: z.number().min(0).max(500).optional(),
  fatG: z.number().min(0).max(500).optional(),
  carbsG: z.number().min(0).max(1000).optional(),
});

export const dietPlanSchema = z.object({
  title: z.string().min(1).max(150),
  targetCalories: z.number().int().min(0).max(20000).optional(),
  targetProteinG: z.number().min(0).max(1000).optional(),
  targetFatG: z.number().min(0).max(1000).optional(),
  targetCarbsG: z.number().min(0).max(2000).optional(),
  meals: z.array(dietPlanMealSchema).max(20).default([]),
});

export type DietPlanInput = z.infer<typeof dietPlanSchema>;
