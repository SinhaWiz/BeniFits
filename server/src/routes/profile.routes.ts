import { Router } from 'express';
import { AppError } from '../errors/AppError';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { prisma } from '../lib/prisma';
import { healthProfileSchema } from '../schemas/profile.schema';

export const profileRouter = Router();
profileRouter.use(authenticate);

function computeBmi(heightCm?: number, weightKg?: number): number | null {
  if (!heightCm || !weightKg) return null;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

profileRouter.get('/', async (req, res, next) => {
  try {
    const profile = await prisma.healthProfile.findUnique({
      where: { userId: req.userId! },
    });
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

profileRouter.put('/', validateBody(healthProfileSchema), async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Not authenticated');

    const data = req.body as ReturnType<typeof healthProfileSchema.parse>;
    const bmi = computeBmi(data.heightCm, data.weightKg);

    const profile = await prisma.healthProfile.upsert({
      where: { userId },
      create: { userId, ...data, bmi },
      update: { ...data, bmi },
    });

    res.json({ profile });
  } catch (err) {
    next(err);
  }
});
