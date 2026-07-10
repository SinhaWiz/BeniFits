import { Router } from 'express';
import { AppError } from '../errors/AppError';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import { createSlotSchema } from '../schemas/availabilitySlot.schema';
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

async function findOwnExpertProfile(userId: string) {
  const profile = await prisma.expertProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new AppError(404, 'Expert profile not found');
  }
  return profile;
}

expertRouter.post(
  '/me/slots',
  requireRole(...EXPERT_ROLES),
  validateBody(createSlotSchema),
  async (req, res, next) => {
    try {
      const profile = await findOwnExpertProfile(req.userId!);
      const { startsAt, endsAt } = req.body as ReturnType<typeof createSlotSchema.parse>;

      const slot = await prisma.availabilitySlot.create({
        data: { expertProfileId: profile.id, startsAt: new Date(startsAt), endsAt: new Date(endsAt) },
      });

      res.status(201).json({ slot });
    } catch (err) {
      next(err);
    }
  },
);

expertRouter.get('/me/slots', requireRole(...EXPERT_ROLES), async (req, res, next) => {
  try {
    const profile = await findOwnExpertProfile(req.userId!);
    const slots = await prisma.availabilitySlot.findMany({
      where: { expertProfileId: profile.id },
      orderBy: { startsAt: 'asc' },
    });
    res.json({ slots });
  } catch (err) {
    next(err);
  }
});

expertRouter.delete('/me/slots/:id', requireRole(...EXPERT_ROLES), async (req, res, next) => {
  try {
    const profile = await findOwnExpertProfile(req.userId!);
    const slotId = req.params.id as string;
    const slot = await prisma.availabilitySlot.findUnique({ where: { id: slotId } });
    if (!slot || slot.expertProfileId !== profile.id) {
      throw new AppError(404, 'Slot not found');
    }
    if (slot.status !== 'OPEN') {
      throw new AppError(409, 'Only open slots can be removed');
    }
    await prisma.availabilitySlot.delete({ where: { id: slot.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

expertRouter.get('/:id', async (req, res, next) => {
  try {
    const expert = await prisma.expertProfile.findUnique({
      where: { id: req.params.id },
      select: {
        ...expertPublicSelect,
        availabilitySlots: {
          where: { status: 'OPEN', startsAt: { gte: new Date() } },
          orderBy: { startsAt: 'asc' },
        },
      },
    });
    if (!expert) {
      throw new AppError(404, 'Expert not found');
    }
    res.json({ expert });
  } catch (err) {
    next(err);
  }
});
