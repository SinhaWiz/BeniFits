import { Router } from 'express';
import { AppError } from '../errors/AppError';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

export const notificationRouter = Router();
notificationRouter.use(authenticate);

const MAX_TAKE = 50;
const DEFAULT_TAKE = 20;

function parseTake(value: unknown): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TAKE;
  return Math.min(parsed, MAX_TAKE);
}

function parseSkip(value: unknown): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

notificationRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const take = parseTake(req.query.take);
    const skip = parseSkip(req.query.skip);

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: take + 1,
        skip,
      }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    const hasMore = notifications.length > take;
    res.json({ notifications: notifications.slice(0, take), hasMore, unreadCount });
  } catch (err) {
    next(err);
  }
});

notificationRouter.post('/read-all', async (req, res, next) => {
  try {
    const userId = req.userId!;
    await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

notificationRouter.post('/:id/read', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      throw new AppError(404, 'Notification not found');
    }

    const updated = await prisma.notification.update({ where: { id }, data: { read: true } });
    res.json({ notification: updated });
  } catch (err) {
    next(err);
  }
});
