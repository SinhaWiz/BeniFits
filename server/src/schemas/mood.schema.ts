import { z } from 'zod';

export const moodEntrySchema = z.object({
  recordedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'recordedAt must be YYYY-MM-DD'),
  moodScore: z.number().int().min(1).max(5),
  note: z.string().max(500).optional(),
});

export type MoodEntryInput = z.infer<typeof moodEntrySchema>;
