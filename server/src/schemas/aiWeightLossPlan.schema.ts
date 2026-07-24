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

// Mirrors weightLossPlanOutputSchema above, in Gemini's response-schema
// format (the SDK doesn't accept a Zod schema directly). Deliberately not
// typed against @google/genai's `Schema`/`Type` — that package is
// ESM-only and this one is CommonJS, and even a type-only import trips
// TypeScript's Node16 CJS/ESM interop rules. Structural typing still
// checks this object against the SDK's expected shape wherever it's
// actually passed in. The parsed JSON is re-validated through the Zod
// schema above at the call site regardless.
const weightLossWeekGeminiSchema = {
  type: 'OBJECT',
  properties: {
    weekNumber: { type: 'INTEGER' },
    targetCalories: { type: 'INTEGER' },
    targetProteinG: { type: 'NUMBER' },
    workoutSummary: { type: 'STRING' },
    walkingGoalMinutes: { type: 'INTEGER' },
    waterGoalMl: { type: 'INTEGER' },
    sleepGoalHours: { type: 'NUMBER' },
    notes: { type: 'STRING' },
  },
  required: [
    'weekNumber',
    'targetCalories',
    'targetProteinG',
    'workoutSummary',
    'walkingGoalMinutes',
    'waterGoalMl',
    'sleepGoalHours',
    'notes',
  ],
};

export const weightLossPlanGeminiSchema = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    weeks: { type: 'ARRAY', items: weightLossWeekGeminiSchema },
  },
  required: ['summary', 'weeks'],
};
