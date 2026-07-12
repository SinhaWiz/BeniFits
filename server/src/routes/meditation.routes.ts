import { Router } from 'express';
import { AppError } from '../errors/AppError';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { meditationLogSchema } from '../schemas/meditation.schema';

export const meditationRouter = Router();
meditationRouter.use(authenticate);

const MEDITATION_CATEGORIES = [
  'BREATHING',
  'BODY_SCAN',
  'SLEEP',
  'FOCUS',
  'STRESS_RELIEF',
  'MINDFULNESS',
] as const;
type MeditationCategory = (typeof MEDITATION_CATEGORIES)[number];

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

meditationRouter.get('/sessions', async (req, res, next) => {
  try {
    const { category } = req.query as { category?: string };
    if (category && !MEDITATION_CATEGORIES.includes(category as MeditationCategory)) {
      throw new AppError(400, 'Invalid category');
    }

    const sessions = await prisma.meditationSession.findMany({
      where: category ? { category: category as MeditationCategory } : undefined,
      orderBy: [{ category: 'asc' }, { durationMinutes: 'asc' }],
    });
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

meditationRouter.get('/logs', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { from, to } = req.query as { from?: string; to?: string };

    const completedOn: { gte?: Date; lte?: Date } = {};
    if (from) {
      const fromDate = parseDateOnly(from);
      if (!fromDate) throw new AppError(400, 'from must be YYYY-MM-DD');
      completedOn.gte = fromDate;
    }
    if (to) {
      const toDate = parseDateOnly(to);
      if (!toDate) throw new AppError(400, 'to must be YYYY-MM-DD');
      completedOn.lte = toDate;
    }

    const logs = await prisma.meditationLog.findMany({
      where: { userId, ...(from || to ? { completedOn } : {}) },
      include: { session: true },
      orderBy: { completedOn: 'desc' },
    });

    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

meditationRouter.post('/logs', validateBody(meditationLogSchema), async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { sessionId, completedOn, durationMinutes } =
      req.body as ReturnType<typeof meditationLogSchema.parse>;
    const completedOnDate = parseDateOnly(completedOn)!;

    const session = await prisma.meditationSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new AppError(404, 'Meditation session not found');
    }

    const log = await prisma.meditationLog.create({
      data: {
        userId,
        sessionId,
        completedOn: completedOnDate,
        durationMinutes: durationMinutes ?? session.durationMinutes,
      },
      include: { session: true },
    });

    res.status(201).json({ log });
  } catch (err) {
    next(err);
  }
});

meditationRouter.delete('/logs/:id', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const log = await prisma.meditationLog.findUnique({ where: { id } });
    if (!log || log.userId !== userId) {
      throw new AppError(404, 'Meditation log not found');
    }

    await prisma.meditationLog.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
