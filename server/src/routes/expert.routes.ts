import { Router } from 'express';
import { AppError } from '../errors/AppError';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import { upsertExpertProfileSchema } from '../schemas/expertProfile.schema';

export const expertRouter = Router();
expertRouter.use(authenticate);

const EXPERT_ROLES = ['NUTRITIONIST', 'DOCTOR', 'COACH'];

const expertPublicSelect = {
  id: true,
  specialty: true,
  focusArea: true,
  bio: true,
  credentials: true,
  yearsExperience: true,
  isAcceptingBookings: true,
  createdAt: true,
  user: { select: { id: true, name: true, role: true } },
};

expertRouter.get('/', async (req, res, next) => {
  try {
    const { specialty, q } = req.query;

    const where: Record<string, unknown> = {};
    if (typeof specialty === 'string' && specialty.length > 0) {
      where.specialty = { equals: specialty, mode: 'insensitive' };
    }
    if (typeof q === 'string' && q.length > 0) {
      where.OR = [
        { bio: { contains: q, mode: 'insensitive' } },
        { focusArea: { contains: q, mode: 'insensitive' } },
        { specialty: { contains: q, mode: 'insensitive' } },
      ];
    }

    const experts = await prisma.expertProfile.findMany({
      where,
      select: expertPublicSelect,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ experts });
  } catch (err) {
    next(err);
  }
});

expertRouter.get('/me', requireRole(...EXPERT_ROLES), async (req, res, next) => {
  try {
    const profile = await prisma.expertProfile.findUnique({ where: { userId: req.userId! } });
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

expertRouter.put(
  '/me',
  requireRole(...EXPERT_ROLES),
  validateBody(upsertExpertProfileSchema),
  async (req, res, next) => {
    try {
      const userId = req.userId!;
      const data = req.body as ReturnType<typeof upsertExpertProfileSchema.parse>;

      const profile = await prisma.expertProfile.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      });

      res.json({ profile });
    } catch (err) {
      next(err);
    }
  },
);

expertRouter.get('/:id', async (req, res, next) => {
  try {
    const expert = await prisma.expertProfile.findUnique({
      where: { id: req.params.id },
      select: expertPublicSelect,
    });
    if (!expert) {
      throw new AppError(404, 'Expert not found');
    }
    res.json({ expert });
  } catch (err) {
    next(err);
  }
});
