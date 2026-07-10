import { z } from 'zod';

export const createSlotFormSchema = z
  .object({
    startsAt: z.string().min(1, 'Start time is required'),
    endsAt: z.string().min(1, 'End time is required'),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: 'End time must be after start time',
    path: ['endsAt'],
  });

export type CreateSlotFormValues = z.infer<typeof createSlotFormSchema>;
