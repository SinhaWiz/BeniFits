import { z } from 'zod';

export const videosSearchQuerySchema = z.object({
  q: z.string().min(1, 'q is required').max(200),
});
