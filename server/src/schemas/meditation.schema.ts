import { z } from 'zod';

export const meditationLogSchema = z.object({
  sessionId: z.string().min(1),
  completedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'completedOn must be YYYY-MM-DD'),
  durationMinutes: z.number().int().min(1).max(180).optional(),
});

export type MeditationLogInput = z.infer<typeof meditationLogSchema>;
