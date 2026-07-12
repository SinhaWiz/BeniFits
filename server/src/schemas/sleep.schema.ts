import { z } from 'zod';

export const sleepEntrySchema = z.object({
  recordedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'recordedAt must be YYYY-MM-DD'),
  bedtime: z.string().min(1),
  wakeTime: z.string().min(1),
  qualityRating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(500).optional(),
});

export type SleepEntryInput = z.infer<typeof sleepEntrySchema>;
