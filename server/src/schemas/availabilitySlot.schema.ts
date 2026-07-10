import { z } from 'zod';

const MIN_DURATION_MINUTES = 15;
const MAX_DURATION_MINUTES = 240;

export const createSlotSchema = z
  .object({
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
  })
  .refine(({ startsAt, endsAt }) => new Date(endsAt) > new Date(startsAt), {
    message: 'endsAt must be after startsAt',
    path: ['endsAt'],
  })
  .refine(
    ({ startsAt, endsAt }) => {
      const durationMinutes = (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000;
      return durationMinutes >= MIN_DURATION_MINUTES && durationMinutes <= MAX_DURATION_MINUTES;
    },
    {
      message: `Slot duration must be between ${MIN_DURATION_MINUTES} and ${MAX_DURATION_MINUTES} minutes`,
      path: ['endsAt'],
    },
  )
  .refine(({ startsAt }) => new Date(startsAt) > new Date(), {
    message: 'startsAt must be in the future',
    path: ['startsAt'],
  });

export type CreateSlotInput = z.infer<typeof createSlotSchema>;
