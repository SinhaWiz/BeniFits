import { Router } from 'express';
import { AppError } from '../errors/AppError';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { moodEntrySchema } from '../schemas/mood.schema';

export const moodRouter = Router();
moodRouter.use(authenticate);

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

moodRouter.post('/', validateBody(moodEntrySchema), async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { recordedAt, ...rest } = req.body as ReturnType<typeof moodEntrySchema.parse>;
    const recordedAtDate = parseDateOnly(recordedAt)!;

    const entry = await prisma.moodEntry.upsert({
      where: { userId_recordedAt: { userId, recordedAt: recordedAtDate } },
      create: { userId, recordedAt: recordedAtDate, ...rest },
      update: { ...rest },
    });

    res.status(201).json({ entry });
  } catch (err) {
    next(err);
  }
});

moodRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { from, to } = req.query as { from?: string; to?: string };

    const recordedAt: { gte?: Date; lte?: Date } = {};
    if (from) {
      const fromDate = parseDateOnly(from);
      if (!fromDate) throw new AppError(400, 'from must be YYYY-MM-DD');
      recordedAt.gte = fromDate;
    }
    if (to) {
      const toDate = parseDateOnly(to);
      if (!toDate) throw new AppError(400, 'to must be YYYY-MM-DD');
      recordedAt.lte = toDate;
    }

    const entries = await prisma.moodEntry.findMany({
      where: { userId, ...(from || to ? { recordedAt } : {}) },
      orderBy: { recordedAt: 'asc' },
    });

    res.json({ entries });
  } catch (err) {
    next(err);
  }
});

moodRouter.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const entry = await prisma.moodEntry.findUnique({ where: { id } });
    if (!entry || entry.userId !== userId) {
      throw new AppError(404, 'Mood entry not found');
    }

    await prisma.moodEntry.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
