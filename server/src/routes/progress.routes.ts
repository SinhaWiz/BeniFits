import { Router } from 'express';
import { AppError } from '../errors/AppError';
import { computeBmi } from '../lib/health';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { progressEntrySchema } from '../schemas/progress.schema';

export const progressRouter = Router();
progressRouter.use(authenticate);

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

progressRouter.post('/', validateBody(progressEntrySchema), async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { recordedAt, ...rest } = req.body as ReturnType<typeof progressEntrySchema.parse>;
    const recordedAtDate = parseDateOnly(recordedAt)!;

    let bmi: number | null = null;
    if (rest.weightKg) {
      const healthProfile = await prisma.healthProfile.findUnique({ where: { userId } });
      bmi = computeBmi(healthProfile?.heightCm, rest.weightKg);
    }

    const entry = await prisma.progressEntry.upsert({
      where: { userId_recordedAt: { userId, recordedAt: recordedAtDate } },
      create: { userId, recordedAt: recordedAtDate, ...rest, bmi },
      update: { ...rest, bmi },
    });

    res.status(201).json({ entry });
  } catch (err) {
    next(err);
  }
});

progressRouter.get('/', async (req, res, next) => {
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

    const entries = await prisma.progressEntry.findMany({
      where: { userId, ...(from || to ? { recordedAt } : {}) },
      orderBy: { recordedAt: 'asc' },
    });

    res.json({ entries });
  } catch (err) {
    next(err);
  }
});

progressRouter.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const entry = await prisma.progressEntry.findUnique({ where: { id } });
    if (!entry || entry.userId !== userId) {
      throw new AppError(404, 'Progress entry not found');
    }

    await prisma.progressEntry.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
