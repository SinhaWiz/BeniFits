import { z } from 'zod';

export const recipesSearchQuerySchema = z.object({
  q: z.string().min(1, 'q is required').max(200),
});
