import { Router } from 'express';
import { AppError } from '../errors/AppError';
import { checkAndAwardBadges } from '../lib/gamification';
import { computeSleepDurationMinutes } from '../lib/sleep';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { sleepEntrySchema } from '../schemas/sleep.schema';

export const sleepRouter = Router();
sleepRouter.use(authenticate);

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateTime(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

sleepRouter.post('/', validateBody(sleepEntrySchema), async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { recordedAt, bedtime, wakeTime, ...rest } =
      req.body as ReturnType<typeof sleepEntrySchema.parse>;
    const recordedAtDate = parseDateOnly(recordedAt)!;

    const bedtimeDate = parseDateTime(bedtime);
    const wakeTimeDate = parseDateTime(wakeTime);
    if (!bedtimeDate || !wakeTimeDate) {
      throw new AppError(400, 'bedtime and wakeTime must be valid timestamps');
    }
    if (wakeTimeDate <= bedtimeDate) {
      throw new AppError(400, 'wakeTime must be after bedtime');
    }

    const durationMinutes = computeSleepDurationMinutes(bedtimeDate, wakeTimeDate);

    const entry = await prisma.sleepEntry.upsert({
      where: { userId_recordedAt: { userId, recordedAt: recordedAtDate } },
      create: {
        userId,
        recordedAt: recordedAtDate,
        bedtime: bedtimeDate,
        wakeTime: wakeTimeDate,
        durationMinutes,
        ...rest,
      },
      update: { bedtime: bedtimeDate, wakeTime: wakeTimeDate, durationMinutes, ...rest },
    });

    const newBadges = await checkAndAwardBadges(userId);
    res.status(201).json({ entry, newBadges });
  } catch (err) {
    next(err);
  }
});

sleepRouter.get('/', async (req, res, next) => {
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

    const entries = await prisma.sleepEntry.findMany({
      where: { userId, ...(from || to ? { recordedAt } : {}) },
      orderBy: { recordedAt: 'asc' },
    });

    res.json({ entries });
  } catch (err) {
    next(err);
  }
});

sleepRouter.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const entry = await prisma.sleepEntry.findUnique({ where: { id } });
    if (!entry || entry.userId !== userId) {
      throw new AppError(404, 'Sleep entry not found');
    }

    await prisma.sleepEntry.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
