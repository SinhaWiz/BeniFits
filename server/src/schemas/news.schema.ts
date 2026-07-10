import { z } from 'zod';

export const newsQuerySchema = z.object({
  q: z.string().min(1).max(200).optional(),
});
