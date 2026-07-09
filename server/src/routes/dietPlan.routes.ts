import { Router } from 'express';
import { AppError } from '../errors/AppError';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { dietPlanSchema } from '../schemas/dietPlan.schema';

export const dietPlanRouter = Router();
dietPlanRouter.use(authenticate);

interface MealMacros {
  calories: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
}

interface Totals {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

function computeTotals(meals: MealMacros[]): Totals {
  return meals.reduce<Totals>(
    (totals, meal) => ({
      calories: totals.calories + (meal.calories ?? 0),
      proteinG: Math.round((totals.proteinG + (meal.proteinG ?? 0)) * 10) / 10,
      fatG: Math.round((totals.fatG + (meal.fatG ?? 0)) * 10) / 10,
      carbsG: Math.round((totals.carbsG + (meal.carbsG ?? 0)) * 10) / 10,
    }),
    { calories: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  );
}

async function findOwnedPlan(id: string, userId: string) {
  const plan = await prisma.dietPlan.findUnique({
    where: { id },
    include: { meals: true },
  });
  if (!plan || plan.userId !== userId) {
    throw new AppError(404, 'Diet plan not found');
  }
  return plan;
}

dietPlanRouter.post('/', validateBody(dietPlanSchema), async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { meals, ...planFields } = req.body as ReturnType<typeof dietPlanSchema.parse>;

    const plan = await prisma.dietPlan.create({
      data: { userId, ...planFields, meals: { create: meals } },
      include: { meals: true },
    });

    res.status(201).json({ plan: { ...plan, totals: computeTotals(plan.meals) } });
  } catch (err) {
    next(err);
  }
});

dietPlanRouter.get('/', async (req, res, next) => {
  try {
    const plans = await prisma.dietPlan.findMany({
      where: { userId: req.userId! },
      include: { meals: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      plans: plans.map((plan) => ({ ...plan, totals: computeTotals(plan.meals) })),
    });
  } catch (err) {
    next(err);
  }
});

dietPlanRouter.get('/:id', async (req, res, next) => {
  try {
    const plan = await findOwnedPlan(req.params.id, req.userId!);
    res.json({ plan: { ...plan, totals: computeTotals(plan.meals) } });
  } catch (err) {
    next(err);
  }
});

dietPlanRouter.put('/:id', validateBody(dietPlanSchema), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const userId = req.userId!;
    await findOwnedPlan(id, userId);

    const { meals, ...planFields } = req.body as ReturnType<typeof dietPlanSchema.parse>;

    const plan = await prisma.dietPlan.update({
      where: { id },
      data: {
        ...planFields,
        meals: { deleteMany: {}, create: meals },
      },
      include: { meals: true },
    });

    res.json({ plan: { ...plan, totals: computeTotals(plan.meals) } });
  } catch (err) {
    next(err);
  }
});

dietPlanRouter.delete('/:id', async (req, res, next) => {
  try {
    await findOwnedPlan(req.params.id, req.userId!);
    await prisma.dietPlan.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
