import { z } from 'zod';

export const progressEntrySchema = z.object({
  recordedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'recordedAt must be YYYY-MM-DD'),
  weightKg: z.number().positive().max(500).optional(),
  bodyFatPercent: z.number().min(0).max(100).optional(),
  waistCm: z.number().positive().max(300).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  waterIntakeMl: z.number().int().min(0).max(20000).optional(),
  exerciseMinutes: z.number().int().min(0).max(1440).optional(),
  notes: z.string().max(500).optional(),
});

export type ProgressEntryInput = z.infer<typeof progressEntrySchema>;
